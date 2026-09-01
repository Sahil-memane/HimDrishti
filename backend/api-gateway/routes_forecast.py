"""
HimDrishti API Gateway — Forecast Routes
GET /api/forecast/sea-ice
GET /api/forecast/icebergs
"""

import json
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from db import get_db
from models import User, SeaIceForecast, IcebergPrediction
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


@router.get("/sea-ice")
def get_sea_ice_forecast(
    bbox: str = Query(..., description="minLon,minLat,maxLon,maxLat"),
    day: int = Query(..., ge=1, le=7, description="Forecast horizon day (1-7)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return sea-ice concentration forecast as GeoJSON FeatureCollection."""
    min_lon, min_lat, max_lon, max_lat = parse_bbox(bbox)

    forecasts = (
        db.query(SeaIceForecast)
        .filter(SeaIceForecast.horizon_day == day)
        .all()
    )

    features = []
    for f in forecasts:
        try:
            raw = str(f.grid_cell).replace("POLYGON((", "").replace("))", "").strip()
            pts = raw.split(",")
            poly_coords = [[float(c) for c in pt.strip().split()] for pt in pts if pt.strip()]
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
    """Return predicted iceberg positions as GeoJSON FeatureCollection."""
    min_lon, min_lat, max_lon, max_lat = parse_bbox(bbox)

    predictions = (
        db.query(IcebergPrediction)
        .filter(IcebergPrediction.horizon_day == day)
        .all()
    )

    features = []
    for p in predictions:
        try:
            pt = str(p.predicted_position).replace("POINT(", "").replace(")", "").strip().split()
            lon, lat = float(pt[0]), float(pt[1])
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

