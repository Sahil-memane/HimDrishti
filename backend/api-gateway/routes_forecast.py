"""
HimDrishti API Gateway — Forecast Routes
GET /api/forecast/sea-ice
GET /api/forecast/icebergs
"""

import json
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from geoalchemy2.shape import to_shape
from sqlalchemy import func as geo_func

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

    # Build bounding box polygon for spatial query
    bbox_wkt = f"POLYGON(({min_lon} {min_lat}, {max_lon} {min_lat}, {max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat}))"
    bbox_geom = geo_func.ST_GeomFromText(bbox_wkt, 4326)

    forecasts = (
        db.query(SeaIceForecast)
        .filter(
            SeaIceForecast.horizon_day == day,
            geo_func.ST_Intersects(SeaIceForecast.grid_cell, bbox_geom),
        )
        .all()
    )

    features = []
    for f in forecasts:
        cell_shape = to_shape(f.grid_cell)
        feature = {
            "type": "Feature",
            "geometry": json.loads(json.dumps(cell_shape.__geo_interface__)),
            "properties": {
                "ice_concentration": f.ice_concentration,
                "confidence": f.confidence,
                "forecast_date": f.forecast_date.isoformat(),
                "horizon_day": f.horizon_day,
            },
        }
        features.append(feature)

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

    bbox_wkt = f"POLYGON(({min_lon} {min_lat}, {max_lon} {min_lat}, {max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat}))"
    bbox_geom = geo_func.ST_GeomFromText(bbox_wkt, 4326)

    predictions = (
        db.query(IcebergPrediction)
        .filter(
            IcebergPrediction.horizon_day == day,
            geo_func.ST_Within(IcebergPrediction.predicted_position, bbox_geom),
        )
        .all()
    )

    features = []
    for p in predictions:
        point = to_shape(p.predicted_position)
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [point.x, point.y],
            },
            "properties": {
                "iceberg_id": p.iceberg_id,
                "confidence_radius_km": p.confidence_radius_km,
                "horizon_day": p.horizon_day,
            },
        }
        features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }
    return JSONResponse(content=geojson)
