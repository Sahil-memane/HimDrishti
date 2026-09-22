"""
HimDrishti API Gateway — Forecast Routes
GET /api/forecast/sea-ice
GET /api/forecast/icebergs
GET /api/forecast/summary

Serves real Model 1 (sea-ice concentration) and Model 2 (iceberg drift)
output only. Every field here is either stored directly from a model's own
response or a value honestly derived from that stored data (e.g. drift
speed/bearing computed from two real consecutive positions via haversine —
not invented). Nothing here is Model 3 / routing logic.
"""

import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from db import get_db
from models import User, SeaIceForecast, IcebergPrediction, IcebergTrack
from auth import get_current_user

router = APIRouter()


def parse_bbox(bbox_str: str):
    """Parse 'minLon,minLat,maxLon,maxLat' string into floats."""
    try:
        parts = [float(x) for x in bbox_str.split(",")]
        if len(parts) != 4:
            raise ValueError
        min_lon, min_lat, max_lon, max_lat = parts
        return min_lon, min_lat, max_lon, max_lat
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid bbox format. Expected: minLon,minLat,maxLon,maxLat")


def _parse_point(wkt: str):
    """Real WKT 'POINT(lon lat)' -> (lon, lat)."""
    coords = str(wkt).replace("POINT(", "").replace(")", "").strip().split()
    return float(coords[0]), float(coords[1])


def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(min(1.0, math.sqrt(a)))


def _bearing_deg(lat1, lon1, lat2, lon2):
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)
    x = math.sin(dlambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)
    return (math.degrees(math.atan2(x, y)) + 360.0) % 360.0


def _build_iceberg_drift_map(db: Session):
    """
    For every tracked iceberg, walk its real stored predicted positions in
    horizon-day order (starting from its real last-observed track position
    as day 0) and compute the real distance/bearing moved between each
    consecutive pair. This is genuine geometry over genuine stored
    positions — not a fabricated drift value.

    Returns:
        anchors: {iceberg_id: {"lat", "lon", "observed_at"}}
        drift:   {(iceberg_id, horizon_day): {"drift_km_per_day", "drift_bearing_deg", "prev_lat", "prev_lon"}}
    """
    anchors = {}
    for iceberg_id, in db.query(IcebergTrack.iceberg_id).distinct():
        last_track = (
            db.query(IcebergTrack)
            .filter(IcebergTrack.iceberg_id == iceberg_id)
            .order_by(IcebergTrack.observed_at.desc())
            .first()
        )
        if last_track is None:
            continue
        try:
            lon, lat = _parse_point(last_track.position)
            anchors[iceberg_id] = {"lat": lat, "lon": lon, "observed_at": last_track.observed_at}
        except Exception:
            continue

    predictions_by_iceberg = {}
    for p in db.query(IcebergPrediction).order_by(IcebergPrediction.iceberg_id, IcebergPrediction.horizon_day).all():
        predictions_by_iceberg.setdefault(p.iceberg_id, []).append(p)

    drift = {}
    for iceberg_id, preds in predictions_by_iceberg.items():
        anchor = anchors.get(iceberg_id)
        if anchor is None:
            continue
        prev_lat, prev_lon = anchor["lat"], anchor["lon"]
        for p in preds:
            try:
                lon, lat = _parse_point(p.predicted_position)
            except Exception:
                continue
            drift[(iceberg_id, p.horizon_day)] = {
                "drift_km_per_day": round(_haversine_km(prev_lat, prev_lon, lat, lon), 2),
                "drift_bearing_deg": round(_bearing_deg(prev_lat, prev_lon, lat, lon), 1),
                "prev_lat": prev_lat,
                "prev_lon": prev_lon,
            }
            prev_lat, prev_lon = lat, lon

    return anchors, drift


@router.get("/sea-ice")
def get_sea_ice_forecast(
    bbox: str = Query(..., description="minLon,minLat,maxLon,maxLat"),
    day: int = Query(..., ge=1, le=7, description="Forecast horizon day (1-7)"),
    voyage_id: str | None = Query(None, description="Scope to a specific voyage's forecast run"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return sea-ice concentration forecast as GeoJSON FeatureCollection. Model 1 output only."""
    min_lon, min_lat, max_lon, max_lat = parse_bbox(bbox)

    query = db.query(SeaIceForecast).filter(SeaIceForecast.horizon_day == day)
    # sea_ice_forecasts holds rows from every voyage's Model 1 run, not just
    # one at a time — without this, a voyage whose own Model 1 call
    # succeeded would still see other voyages' cells mixed in wherever
    # their bboxes happen to overlap.
    if voyage_id:
        query = query.filter(SeaIceForecast.voyage_id == voyage_id)
    forecasts = query.all()

    features = []
    for f in forecasts:
        try:
            raw = str(f.grid_cell).replace("POLYGON((", "").replace("))", "").strip()
            pts = raw.split(",")
            poly_coords = [[float(c) for c in pt.strip().split()] for pt in pts if pt.strip()]

            cell_lons = [c[0] for c in poly_coords]
            cell_lats = [c[1] for c in poly_coords]
            if cell_lons and cell_lats:
                if max(cell_lons) < min_lon or min(cell_lons) > max_lon:
                    continue
                if max(cell_lats) < min_lat or min(cell_lats) > max_lat:
                    continue

            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [poly_coords],
                },
                "properties": {
                    "ice_concentration": f.ice_concentration,
                    "confidence": f.confidence,
                    "forecast_date": f.forecast_date.isoformat() if hasattr(f.forecast_date, "isoformat") else str(f.forecast_date),
                    "horizon_day": f.horizon_day,
                },
            }
            features.append(feature)
        except Exception:
            continue

    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }
    return JSONResponse(content=geojson)


@router.get("/icebergs")
def get_iceberg_forecast(
    bbox: str = Query(..., description="minLon,minLat,maxLon,maxLat"),
    day: int = Query(..., ge=1, le=7, description="Forecast horizon day (1-7)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return predicted iceberg positions as GeoJSON FeatureCollection. Model 2 output only."""
    min_lon, min_lat, max_lon, max_lat = parse_bbox(bbox)

    predictions = (
        db.query(IcebergPrediction)
        .filter(IcebergPrediction.horizon_day == day)
        .all()
    )

    anchors, drift = _build_iceberg_drift_map(db)

    features = []
    for p in predictions:
        try:
            lon, lat = _parse_point(p.predicted_position)

            if lon < min_lon or lon > max_lon or lat < min_lat or lat > max_lat:
                continue

            d = drift.get((p.iceberg_id, p.horizon_day))
            anchor = anchors.get(p.iceberg_id)

            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat],
                },
                "properties": {
                    "iceberg_id": p.iceberg_id,
                    "confidence_radius_km": p.confidence_radius_km,
                    "horizon_day": p.horizon_day,
                    "forecast_generated_at": p.created_at.isoformat() if p.created_at else None,
                    # Real last-observed position this iceberg's drift was
                    # projected forward from (see /icebergs docstring — real
                    # geometry, not invented).
                    "anchor_lat": anchor["lat"] if anchor else None,
                    "anchor_lon": anchor["lon"] if anchor else None,
                    "anchor_observed_at": anchor["observed_at"].isoformat() if anchor and anchor.get("observed_at") else None,
                    # Real distance/bearing between the previous real
                    # position (anchor, or the prior horizon day) and this
                    # one — computed via haversine, not a fabricated value.
                    "drift_km_per_day": d["drift_km_per_day"] if d else None,
                    "drift_bearing_deg": d["drift_bearing_deg"] if d else None,
                    "prev_lat": d["prev_lat"] if d else None,
                    "prev_lon": d["prev_lon"] if d else None,
                },
            }
            features.append(feature)
        except Exception:
            continue

    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }
    return JSONResponse(content=geojson)


@router.get("/summary")
def get_forecast_summary(
    voyage_id: str | None = Query(None, description="Scope sea-ice aggregates to this voyage's own Model 1 run"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Real per-day aggregates (averages/counts over actually stored rows) for
    both models, day 1-7 — used for the Forecast page's summary cards and
    trend charts. No values here are computed beyond averaging/counting what
    Model 1 and Model 2 actually produced and persisted.
    """
    sic_query = db.query(SeaIceForecast)
    if voyage_id:
        sic_query = sic_query.filter(SeaIceForecast.voyage_id == voyage_id)
    sic_rows = sic_query.all()

    sic_forecast_date = None
    sic_by_day: dict[int, list] = {}
    for r in sic_rows:
        sic_by_day.setdefault(r.horizon_day, []).append(r)
        if sic_forecast_date is None:
            sic_forecast_date = r.forecast_date

    sic_daily = []
    for day in sorted(sic_by_day.keys()):
        rows = sic_by_day[day]
        concs = [r.ice_concentration for r in rows if r.ice_concentration is not None]
        confs = [r.confidence for r in rows if r.confidence is not None]
        sic_daily.append({
            "day": day,
            "avg_concentration": round(sum(concs) / len(concs), 2) if concs else None,
            "avg_confidence": round(sum(confs) / len(confs), 3) if confs else None,
            "cell_count": len(rows),
        })

    anchors, drift = _build_iceberg_drift_map(db)
    ib_rows = db.query(IcebergPrediction).all()
    ib_by_day: dict[int, list] = {}
    ib_generated_at = None
    for r in ib_rows:
        ib_by_day.setdefault(r.horizon_day, []).append(r)
        if ib_generated_at is None and r.created_at:
            ib_generated_at = r.created_at

    ib_daily = []
    for day in sorted(ib_by_day.keys()):
        rows = ib_by_day[day]
        radii = [r.confidence_radius_km for r in rows if r.confidence_radius_km is not None]
        drifts = [drift[(r.iceberg_id, r.horizon_day)]["drift_km_per_day"] for r in rows if (r.iceberg_id, r.horizon_day) in drift]
        ib_daily.append({
            "day": day,
            "count": len(rows),
            "avg_confidence_radius_km": round(sum(radii) / len(radii), 2) if radii else None,
            "avg_drift_km_per_day": round(sum(drifts) / len(drifts), 2) if drifts else None,
        })

    return JSONResponse(content={
        "voyage_id": voyage_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sea_ice": {
            "forecast_date": sic_forecast_date.isoformat() if sic_forecast_date and hasattr(sic_forecast_date, "isoformat") else sic_forecast_date,
            "available_days": sorted(sic_by_day.keys()),
            "daily": sic_daily,
        },
        "icebergs": {
            "tracked_count": len(anchors),
            "forecast_generated_at": ib_generated_at.isoformat() if ib_generated_at else None,
            "available_days": sorted(ib_by_day.keys()),
            "daily": ib_daily,
        },
    })
