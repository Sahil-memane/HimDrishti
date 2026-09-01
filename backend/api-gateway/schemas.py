"""
HimDrishti API Gateway — Pydantic Schemas
Request/response schemas for all API endpoints.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
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
    risk_tolerance: str = Field(default="Medium", pattern="^(Low|Medium|High)$")


class VoyageCreateResponse(BaseModel):
    voyage_id: UUID
    status: str


class WaypointOut(BaseModel):
    sequence_no: int
    lat: float
    lon: float
    eta: datetime
    cumulative_fuel_l: Optional[float] = None
    segment_risk_score: Optional[float] = None
    risk_factors: Optional[dict] = None


class RouteResponse(BaseModel):
    waypoints: List[WaypointOut]
    total_distance_km: Optional[float] = None
    eta: Optional[datetime] = None
    total_fuel_estimate_l: Optional[float] = None
    overall_risk_score: Optional[float] = None
    reasoning: Optional[str] = None


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
    alert_type: str
    severity: str
    message: str
    triggered_at: datetime
    acknowledged: bool

    class Config:
        from_attributes = True


class AlertAckResponse(BaseModel):
    alert_id: UUID
    acknowledged: bool
