"""
HimDrishti API Gateway — Pydantic Schemas
Request/response schemas for all API endpoints.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Tuple
from datetime import datetime
from uuid import UUID


# =============================================================
# Auth
# =============================================================
class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = Field(..., pattern="^(mariner|planner)$")


class RegisterResponse(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    role: str

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user_id: UUID
    role: str
    email: str


# =============================================================
# Voyage
# =============================================================
class VoyageCreateRequest(BaseModel):
    vessel_id: UUID
    start_lat: float = Field(..., ge=-90, le=90)
    start_lon: float = Field(..., ge=-180, le=180)
    dest_lat: float = Field(..., ge=-90, le=90)
    dest_lon: float = Field(..., ge=-180, le=180)
    speed_knots: float = Field(..., gt=0)
    fuel_capacity_l: Optional[float] = Field(None, gt=0)
    fuel_consumption_lph: Optional[float] = Field(None, gt=0)
    departure_time: datetime
    risk_tolerance: str = Field(default="balanced")


class VoyageCreateResponse(BaseModel):
    voyage_id: UUID
    status: str


class RecomputeRequest(BaseModel):
    risk_tolerance: str = Field(default="balanced")


class WaypointOut(BaseModel):
    sequence_no: int
    lat: float
    lon: float
    eta: datetime
    cumulative_fuel_l: Optional[float] = None
    segment_risk_score: Optional[float] = None
    risk_factors: Optional[dict] = None


class DataProvenance(BaseModel):
    """Real values captured during pipeline execution, identifying which
    real model produced the route and which real satellite scene (if any)
    contributed to it — not fabricated status text."""
    sic_model_used: Optional[str] = None
    satellite_status: Optional[str] = None
    satellite_scene_id: Optional[str] = None
    satellite_scene_datetime: Optional[str] = None
    satellite_n_detections: Optional[int] = None
    satellite_bbox: Optional[Tuple[float, float, float, float]] = None
    satellite_image_url: Optional[str] = None


class RouteResponse(BaseModel):
    status: Optional[str] = "planned"
    origin: Optional[dict] = None
    destination: Optional[dict] = None
    waypoints: List[WaypointOut]
    total_distance_km: Optional[float] = None
    eta: Optional[datetime] = None
    eta_formatted: Optional[str] = None
    total_fuel_estimate_l: Optional[float] = None
    overall_risk_score: Optional[float] = None
    sea_ice_risk: Optional[float] = None
    iceberg_risk: Optional[float] = None
    weather_risk: Optional[float] = None
    satellite_risk: Optional[float] = None
    reasoning: Optional[str] = None
    data_provenance: Optional[DataProvenance] = None


class VoyageListItem(BaseModel):
    voyage_id: UUID
    status: str
    departure_time: datetime
    risk_tolerance: str
    created_at: datetime

    class Config:
        from_attributes = True


class VoyageListResponse(BaseModel):
    items: List[VoyageListItem]
    page: int
    page_size: int
    total: int


# =============================================================
# Alerts
# =============================================================
class AlertOut(BaseModel):
    alert_id: UUID
    voyage_id: UUID
    alert_type: str
    severity: str
    title: Optional[str] = None
    message: str
    status: Optional[str] = "ACTIVE"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    route_waypoint: Optional[int] = None
    route_segment: Optional[str] = None
    risk_score: Optional[float] = None
    source_model: Optional[str] = None
    forecast_time: Optional[datetime] = None
    distance_from_route_km: Optional[float] = None
    triggered_at: datetime
    acknowledged: bool
    acknowledged_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertAckResponse(BaseModel):
    alert_id: UUID
    acknowledged: bool
    status: Optional[str] = "ACKNOWLEDGED"

