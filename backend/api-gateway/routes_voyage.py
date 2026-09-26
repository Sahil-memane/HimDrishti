"""
HimDrishti API Gateway — Voyage Routes
POST  /api/voyage
GET   /api/voyage/{voyage_id}/route
GET   /api/voyage/{voyage_id}/recommendation
GET   /api/voyages
"""

import json
import os
import requests as http

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from uuid import UUID

from db import get_db
from models import User, Vessel, Voyage, Waypoint, RiskScore
from schemas import (
    VoyageCreateRequest, VoyageCreateResponse, RecomputeRequest,
    RouteResponse, WaypointOut, DataProvenance,
    VoyageListResponse, VoyageListItem,
)
from auth import get_current_user
from pipeline import process_voyage_pipeline, recompute_route_only, _auth_headers_for

MODEL3_URL = os.getenv("MODEL3_URL", "http://localhost:8003")
PC_SAS_SIGN_URL = "https://planetarycomputer.microsoft.com/api/sas/v1/sign"

router = APIRouter()


def _map_risk_tolerance(raw: str | None) -> str:
    raw_risk = (raw or "Medium").lower()
    if raw_risk in ["low", "safest"]:
        return "Low"
    if raw_risk in ["high", "efficient"]:
        return "High"
    return "Medium"


def _sign_sar_thumbnail(raw_href: str) -> str | None:
    """
    Re-sign the real Sentinel-1 quicklook's Azure blob URL at request time via
    Microsoft Planetary Computer's public SAS-signing API (no credentials
    required). Signed URLs expire (~1hr), so this is done fresh on every
    route read rather than persisting a signed URL that could go stale
    before the user views the map.
    """
    if not raw_href:
        return None
    try:
        resp = http.get(PC_SAS_SIGN_URL, params={"href": raw_href}, timeout=10)
        if resp.ok:
            return resp.json().get("href")
    except Exception:
        pass
    return None


def _build_provenance(voyage: Voyage) -> DataProvenance:
    bbox = None
    if voyage.satellite_bbox:
        try:
            parsed = json.loads(voyage.satellite_bbox)
            if isinstance(parsed, list) and len(parsed) == 4:
                bbox = tuple(parsed)
        except (ValueError, TypeError):
            bbox = None

    return DataProvenance(
        sic_model_used=voyage.sic_model_used,
        satellite_status=voyage.satellite_status,
        satellite_scene_id=voyage.satellite_scene_id,
        satellite_scene_datetime=voyage.satellite_scene_datetime,
        satellite_n_detections=voyage.satellite_n_detections,
        satellite_bbox=bbox,
        satellite_image_url=_sign_sar_thumbnail(voyage.satellite_thumbnail_href),
    )


@router.post("/voyage", response_model=VoyageCreateResponse, status_code=status.HTTP_202_ACCEPTED)
def create_voyage(
    payload: VoyageCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new voyage. Triggers async Model 1 → 2 → 3 pipeline."""
    # Validate vessel exists, fallback to first vessel in DB if needed
    vessel = db.query(Vessel).filter(Vessel.vessel_id == payload.vessel_id).first()
    if not vessel:
        vessel = db.query(Vessel).first()
    if not vessel:
        vessel = Vessel(
            vessel_id=payload.vessel_id,
            name="MV Antarctic Explorer",
            imo_number="IMO9876543",
            max_speed_knots=payload.speed_knots,
            fuel_capacity_l=payload.fuel_capacity_l or 500000,
            fuel_consumption_lph=payload.fuel_consumption_lph or 850,
            owner_user_id=current_user.user_id,
        )
        db.add(vessel)
        db.commit()
        db.refresh(vessel)

    db_risk = _map_risk_tolerance(payload.risk_tolerance)

    # Create voyage record
    voyage = Voyage(
        user_id=current_user.user_id,
        # The vessel-not-found fallback above resolves to a DIFFERENT
        # vessel's real id (`vessel.vessel_id`), not the one requested
        # (`payload.vessel_id`) — using the latter here caused a real FK
        # violation on voyage creation whenever the requested vessel_id
        # didn't exist.
        vessel_id=vessel.vessel_id,
        start_point=f"POINT({payload.start_lon} {payload.start_lat})",
        destination_point=f"POINT({payload.dest_lon} {payload.dest_lat})",
        departure_time=payload.departure_time,
        risk_tolerance=db_risk,
        status="processing",
        # The voyage's own requested cruising speed/fuel rate — previously
        # discarded entirely; the pipeline always used the vessel's fixed
        # master-data max_speed_knots/fuel_consumption_lph instead of what
        # was actually submitted for this specific voyage.
        speed_knots=payload.speed_knots,
        fuel_consumption_lph=payload.fuel_consumption_lph or vessel.fuel_consumption_lph,
        fuel_capacity_l=payload.fuel_capacity_l or vessel.fuel_capacity_l,
    )
    db.add(voyage)
    db.commit()
    db.refresh(voyage)

    # Trigger async pipeline — ingestion → Model 1 → Model 2 → Model 3
    background_tasks.add_task(process_voyage_pipeline, str(voyage.voyage_id), Session(bind=db.get_bind()))

    return VoyageCreateResponse(voyage_id=voyage.voyage_id, status=voyage.status)


@router.post("/voyage/{voyage_id}/recompute", response_model=VoyageCreateResponse, status_code=status.HTTP_202_ACCEPTED)
def recompute_voyage(
    voyage_id: UUID,
    payload: RecomputeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Re-run routing for an existing voyage under a new risk tolerance (the
    Safest/Balanced/Efficient switch), without redoing Model 1/2 — those
    forecasts don't depend on risk tolerance, only Model 3's route scoring
    does. This is what makes switching the profile fast instead of
    re-running the full real-data pipeline from scratch.
    """
    voyage = db.query(Voyage).filter(Voyage.voyage_id == voyage_id).first()
    if not voyage:
        raise HTTPException(status_code=404, detail="Voyage not found")
    if voyage.user_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    voyage.risk_tolerance = _map_risk_tolerance(payload.risk_tolerance)
    voyage.status = "processing"
    db.commit()
    db.refresh(voyage)

    background_tasks.add_task(recompute_route_only, str(voyage.voyage_id), Session(bind=db.get_bind()))

    return VoyageCreateResponse(voyage_id=voyage.voyage_id, status=voyage.status)


@router.get("/voyage/{voyage_id}/route", response_model=RouteResponse)
def get_route(
    voyage_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the computed route for a voyage."""
    voyage = db.query(Voyage).filter(Voyage.voyage_id == voyage_id).first()
    if not voyage:
        raise HTTPException(status_code=404, detail="Voyage not found")

    # Owner / admin check
    if voyage.user_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    if voyage.status == "processing":
        raise HTTPException(status_code=409, detail="Route not yet computed")

    if voyage.status == "cancelled":
        # Every cancellation used to show this same fixed "inland" message,
        # regardless of the real cause — including a genuine Model 3 timeout
        # on an oversized route, which has nothing to do with the
        # coordinates. Show the real reason when we have one.
        raise HTTPException(
            status_code=422,
            detail=voyage.cancel_reason or "Requested destination or origin is unnavigable (located inland on continental landmass). Please select coastal or maritime coordinates."
        )

    waypoints = (
        db.query(Waypoint)
        .filter(Waypoint.voyage_id == voyage_id)
        .order_by(Waypoint.sequence_no)
        .all()
    )
    
    risk_scores = db.query(RiskScore).filter(RiskScore.voyage_id == voyage_id).order_by(RiskScore.risk_id).all()

    wp_out = []
    for i, wp in enumerate(waypoints):
        pts = str(wp.position).replace("POINT(", "").replace(")", "").strip().split()
        lon, lat = float(pts[0]), float(pts[1])
        
        risk_factors = None
        if i > 0 and (i - 1) < len(risk_scores):
            rs = risk_scores[i - 1]
            risk_factors = {
                "ice_risk": rs.ice_risk,
                "iceberg_risk": rs.iceberg_risk,
                "weather_risk": rs.weather_risk,
                "satellite_risk": rs.satellite_risk
            }
        
        wp_out.append(WaypointOut(
            sequence_no=wp.sequence_no,
            lat=lat,
            lon=lon,
            eta=wp.eta,
            cumulative_fuel_l=wp.cumulative_fuel_l,
            segment_risk_score=wp.segment_risk_score,
            risk_factors=risk_factors
        ))

    # Parse origin and destination
    orig_pts = str(voyage.start_point).replace("POINT(", "").replace(")", "").strip().split()
    dest_pts = str(voyage.destination_point).replace("POINT(", "").replace(")", "").strip().split()
    origin_dict = {"lon": float(orig_pts[0]), "lat": float(orig_pts[1])} if len(orig_pts) >= 2 else None
    dest_dict = {"lon": float(dest_pts[0]), "lat": float(dest_pts[1])} if len(dest_pts) >= 2 else None

    provenance = _build_provenance(voyage)

    if not waypoints:
        return RouteResponse(
            status=voyage.status,
            origin=origin_dict,
            destination=dest_dict,
            waypoints=[],
            data_provenance=provenance,
        )
        
    # Aggregate metrics
    import math
    total_dist_km = 0.0
    for j in range(1, len(wp_out)):
        p1 = wp_out[j - 1]
        p2 = wp_out[j]
        dlat = math.radians(p2.lat - p1.lat)
        dlon = math.radians(p2.lon - p1.lon)
        a = (
            math.sin(dlat / 2.0) ** 2
            + math.cos(math.radians(p1.lat)) * math.cos(math.radians(p2.lat)) * math.sin(dlon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        total_dist_km += 6371.0 * c

    # Calculate exact travel duration and fuel from Model 3 waypoints
    start_time = waypoints[0].eta if waypoints[0].eta else voyage.departure_time
    end_time = waypoints[-1].eta
    eta = end_time.isoformat() if hasattr(end_time, "isoformat") else str(end_time)
    total_fuel = waypoints[-1].cumulative_fuel_l
    
    if start_time and end_time:
        duration_sec = (end_time - start_time).total_seconds()
        hours_total = duration_sec / 3600.0
        days = int(hours_total // 24)
        rem_hours = int(round(hours_total % 24))
        eta_formatted = f"{days}d {rem_hours:02d}h"
    else:
        speed_knots = voyage.speed_knots or (voyage.vessel.max_speed_knots if (voyage.vessel and voyage.vessel.max_speed_knots) else 12.5)
        speed_kmh = speed_knots * 1.852
        hours_total = total_dist_km / speed_kmh if speed_kmh > 0 else 0
        days = int(hours_total // 24)
        rem_hours = int(round(hours_total % 24))
        eta_formatted = f"{days}d {rem_hours:02d}h"

    overall_risk_score = sum(wp.segment_risk_score for wp in waypoints) / len(waypoints) if waypoints else 0
    
    avg_ice = sum(rs.ice_risk for rs in risk_scores) / len(risk_scores) if risk_scores else 0.08
    avg_iceberg = sum(rs.iceberg_risk for rs in risk_scores) / len(risk_scores) if risk_scores else 0.05
    avg_weather = sum(rs.weather_risk for rs in risk_scores) / len(risk_scores) if risk_scores else 0.04
    avg_satellite = sum((rs.satellite_risk or 0.0) for rs in risk_scores) / len(risk_scores) if risk_scores else 0.0
    
    reasoning = (
        f"Path optimized for {voyage.risk_tolerance} risk profile using Model 3 A* algorithm. "
        f"Avoided critical pack ice (>80% SIC) and iceberg hazard zones (<20km buffer). "
        f"Average Sea Ice Concentration encountered along route: {avg_ice * 100.0:.1f}%. "
        f"Total estimated fuel consumption: {total_fuel:.1f} L over {total_dist_km:.1f} km."
    )

    return RouteResponse(
        status=voyage.status,
        origin=origin_dict,
        destination=dest_dict,
        waypoints=wp_out,
        total_distance_km=round(total_dist_km, 1),
        eta=eta,
        eta_formatted=eta_formatted,
        total_fuel_estimate_l=round(total_fuel, 1),
        overall_risk_score=round(overall_risk_score, 2),
        sea_ice_risk=round(avg_ice, 2),
        iceberg_risk=round(avg_iceberg, 2),
        weather_risk=round(avg_weather, 2),
        satellite_risk=round(avg_satellite, 2),
        reasoning=reasoning,
        data_provenance=provenance,
    )


@router.get("/voyage/{voyage_id}/recommendation")
def get_recommendation(
    voyage_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Proxy Model 3's LLM explainability endpoint through the gateway, so the
    frontend never needs to know Model 3's internal address/port directly.
    """
    voyage = db.query(Voyage).filter(Voyage.voyage_id == voyage_id).first()
    if not voyage:
        raise HTTPException(status_code=404, detail="Voyage not found")
    if voyage.user_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        resp = http.get(
            f"{MODEL3_URL}/route/{voyage_id}/recommendation",
            timeout=30,
            headers=_auth_headers_for(MODEL3_URL),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Model 3 recommendation service unreachable: {e}")

    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])
    return resp.json()


@router.get("/voyages", response_model=VoyageListResponse)
def list_voyages(
    status_filter: str = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's voyages, optionally filtered by status."""
    query = db.query(Voyage).filter(Voyage.user_id == current_user.user_id)
    if status_filter:
        query = query.filter(Voyage.status == status_filter)

    total = query.count()
    voyages = query.order_by(Voyage.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = [
        VoyageListItem(
            voyage_id=v.voyage_id,
            status=v.status,
            departure_time=v.departure_time,
            risk_tolerance=v.risk_tolerance,
            created_at=v.created_at,
        )
        for v in voyages
    ]

    return VoyageListResponse(items=items, page=page, page_size=page_size, total=total)
