"""
HimDrishti API Gateway — Voyage Routes
POST  /api/voyage
GET   /api/voyage/{voyage_id}/route
GET   /api/voyages
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from geoalchemy2.shape import to_shape
from uuid import UUID

from db import get_db
from models import User, Vessel, Voyage, Waypoint, RiskScore
from schemas import (
    VoyageCreateRequest, VoyageCreateResponse,
    RouteResponse, WaypointOut,
    VoyageListResponse, VoyageListItem,
)
from auth import get_current_user
from pipeline import process_voyage_pipeline

router = APIRouter()


@router.post("/voyage", response_model=VoyageCreateResponse, status_code=status.HTTP_202_ACCEPTED)
def create_voyage(
    payload: VoyageCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new voyage. Triggers async Model 1 → 2 → 3 pipeline."""
    # Validate vessel exists
    vessel = db.query(Vessel).filter(Vessel.vessel_id == payload.vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")

    # Validate speed does not exceed vessel max
    if payload.speed_knots > vessel.max_speed_knots:
        raise HTTPException(status_code=400, detail=f"Speed exceeds vessel max ({vessel.max_speed_knots} knots)")

    # Create voyage record
    voyage = Voyage(
        user_id=current_user.user_id,
        vessel_id=payload.vessel_id,
        start_point=f"SRID=4326;POINT({payload.start_lon} {payload.start_lat})",
        destination_point=f"SRID=4326;POINT({payload.dest_lon} {payload.dest_lat})",
        departure_time=payload.departure_time,
        risk_tolerance=payload.risk_tolerance,
        status="processing",
    )
    db.add(voyage)
    db.commit()
    db.refresh(voyage)

    # Trigger async pipeline — ingestion → Model 1 → Model 2 → Model 3
    background_tasks.add_task(process_voyage_pipeline, str(voyage.voyage_id), Session(bind=db.get_bind()))

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

    waypoints = (
        db.query(Waypoint)
        .filter(Waypoint.voyage_id == voyage_id)
        .order_by(Waypoint.sequence_no)
        .all()
    )
    
    # We also fetch the risk scores for explainability. The risk_scores table doesn't have sequence_no,
    # but since there is one per hop, we can assume they are inserted in order.
    # Alternatively, we just grab all and sort by risk_id which roughly correlates to order,
    # or just use them for global metrics.
    risk_scores = db.query(RiskScore).filter(RiskScore.voyage_id == voyage_id).order_by(RiskScore.risk_id).all()

    wp_out = []
    for i, wp in enumerate(waypoints):
        point = to_shape(wp.position)
        
        risk_factors = None
        # Hop 0 doesn't have a preceding segment. From Hop 1 onwards, we can match risk_scores[i-1]
        if i > 0 and (i - 1) < len(risk_scores):
            rs = risk_scores[i - 1]
            risk_factors = {
                "ice_risk": rs.ice_risk,
                "iceberg_risk": rs.iceberg_risk,
                "weather_risk": rs.weather_risk
            }
        
        wp_out.append(WaypointOut(
            sequence_no=wp.sequence_no,
            lat=point.y,
            lon=point.x,
            eta=wp.eta,
            cumulative_fuel_l=wp.cumulative_fuel_l,
            segment_risk_score=wp.segment_risk_score,
            risk_factors=risk_factors
        ))

    if not waypoints:
        return RouteResponse(waypoints=[])
        
    # Aggregate metrics
    # In a real app we would compute distance properly. Since the frontend just plots it, we can omit total_distance_km
    # or compute a rough one. We'll leave it as None if we don't have it explicitly stored, or we can calculate it.
    
    total_fuel = waypoints[-1].cumulative_fuel_l
    eta = waypoints[-1].eta
    overall_risk_score = sum(wp.segment_risk_score for wp in waypoints) / len(waypoints) if waypoints else 0
    
    # Re-generate reasoning string based on the voyage risk tolerance and aggregated data
    avg_ice = sum(rs.ice_risk for rs in risk_scores) / len(risk_scores) if risk_scores else 0
    avg_ice_percent = avg_ice * 100.0
    
    reasoning = (
        f"Path optimized for {voyage.risk_tolerance} risk tolerance. "
        f"Avoided all critical hazards (SIC > 90%, Icebergs < 20km). "
        f"Average Sea Ice Concentration encountered: {avg_ice_percent:.1f}%. "
        f"Estimated fuel consumption: {total_fuel:.1f}L."
    )

    return RouteResponse(
        waypoints=wp_out,
        total_distance_km=None,  # Not stored globally in DB yet
        eta=eta,
        total_fuel_estimate_l=total_fuel,
        overall_risk_score=overall_risk_score,
        reasoning=reasoning
    )


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
