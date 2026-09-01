"""
HimDrishti API Gateway — SQLAlchemy ORM Models
Maps all 10 database tables to Python classes.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Text,
    DateTime, Date, ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db import Base


# -----------------------------------------------------------------
# 1. Users
# -----------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    user_id       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name     = Column(String(150), nullable=False)
    email         = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(20), nullable=False)
    created_at    = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    vessels = relationship("Vessel", back_populates="owner")
    voyages = relationship("Voyage", back_populates="user")

    __table_args__ = (
        CheckConstraint("role IN ('mariner', 'planner', 'admin')", name="ck_user_role"),
    )


# -----------------------------------------------------------------
# 2. Vessels
# -----------------------------------------------------------------
class Vessel(Base):
    __tablename__ = "vessels"

    vessel_id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name                = Column(String(150), nullable=False)
    imo_number          = Column(String(20), unique=True)
    max_speed_knots     = Column(Float, nullable=False)
    fuel_capacity_l     = Column(Float)
    fuel_consumption_lph = Column(Float)
    owner_user_id       = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))

    # Relationships
    owner   = relationship("User", back_populates="vessels")
    voyages = relationship("Voyage", back_populates="vessel")

    __table_args__ = (
        CheckConstraint("max_speed_knots > 0", name="ck_vessel_speed"),
        CheckConstraint("fuel_capacity_l > 0", name="ck_vessel_fuel_cap"),
        CheckConstraint("fuel_consumption_lph > 0", name="ck_vessel_fuel_rate"),
    )


# -----------------------------------------------------------------
# 3. Voyages
# -----------------------------------------------------------------
class Voyage(Base):
    __tablename__ = "voyages"

    voyage_id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id           = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    vessel_id         = Column(UUID(as_uuid=True), ForeignKey("vessels.vessel_id"), nullable=False)
    start_point       = Column(Text, nullable=False)
    destination_point = Column(Text, nullable=False)
    departure_time    = Column(DateTime(timezone=True), nullable=False)
    risk_tolerance    = Column(String(10), default="Medium")
    status            = Column(String(20), default="planned")
    created_at        = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    user       = relationship("User", back_populates="voyages")
    vessel     = relationship("Vessel", back_populates="voyages")
    waypoints  = relationship("Waypoint", back_populates="voyage", cascade="all, delete-orphan")
    risk_scores = relationship("RiskScore", back_populates="voyage", cascade="all, delete-orphan")
    alerts     = relationship("Alert", back_populates="voyage", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("risk_tolerance IN ('Low', 'Medium', 'High')", name="ck_voyage_risk"),
        CheckConstraint("status IN ('planned', 'processing', 'active', 'completed', 'cancelled')", name="ck_voyage_status"),
    )


# -----------------------------------------------------------------
# 4. Waypoints
# -----------------------------------------------------------------
class Waypoint(Base):
    __tablename__ = "waypoints"

    waypoint_id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    voyage_id          = Column(UUID(as_uuid=True), ForeignKey("voyages.voyage_id", ondelete="CASCADE"), nullable=False)
    sequence_no        = Column(Integer, nullable=False)
    position           = Column(Text, nullable=False)
    eta                = Column(DateTime(timezone=True), nullable=False)
    cumulative_fuel_l  = Column(Float)
    segment_risk_score = Column(Float)

    # Relationships
    voyage = relationship("Voyage", back_populates="waypoints")

    __table_args__ = (
        UniqueConstraint("voyage_id", "sequence_no", name="uq_waypoint_seq"),
        CheckConstraint("cumulative_fuel_l >= 0", name="ck_waypoint_fuel"),
        CheckConstraint("segment_risk_score >= 0 AND segment_risk_score <= 1", name="ck_waypoint_risk"),
    )


# -----------------------------------------------------------------
# 5. Sea Ice Forecasts
# -----------------------------------------------------------------
class SeaIceForecast(Base):
    __tablename__ = "sea_ice_forecasts"

    forecast_id       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    forecast_date     = Column(Date, nullable=False)
    horizon_day       = Column(Integer, nullable=False)
    grid_cell         = Column(Text, nullable=False)
    ice_concentration = Column(Float, nullable=False)
    confidence        = Column(Float)

    __table_args__ = (
        CheckConstraint("horizon_day >= 1 AND horizon_day <= 7", name="ck_sic_horizon"),
        CheckConstraint("ice_concentration >= 0 AND ice_concentration <= 100", name="ck_sic_conc"),
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="ck_sic_conf"),
    )


# -----------------------------------------------------------------
# 6. Iceberg Tracks
# -----------------------------------------------------------------
class IcebergTrack(Base):
    __tablename__ = "iceberg_tracks"

    iceberg_id    = Column(String(30), primary_key=True)
    observed_at   = Column(DateTime(timezone=True), primary_key=True)
    position      = Column(Text, nullable=False)
    velocity_ms   = Column(Float)
    direction_deg = Column(Float)

    __table_args__ = (
        CheckConstraint("velocity_ms >= 0", name="ck_track_velocity"),
        CheckConstraint("direction_deg >= 0 AND direction_deg <= 360", name="ck_track_direction"),
    )


# -----------------------------------------------------------------
# 7. Iceberg Predictions
# -----------------------------------------------------------------
class IcebergPrediction(Base):
    __tablename__ = "iceberg_predictions"

    prediction_id       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iceberg_id          = Column(String(30), nullable=False)
    horizon_day         = Column(Integer, nullable=False)
    predicted_position  = Column(Text, nullable=False)
    confidence_radius_km = Column(Float)

    __table_args__ = (
        UniqueConstraint("iceberg_id", "horizon_day", name="uq_iceberg_pred"),
        CheckConstraint("horizon_day >= 1 AND horizon_day <= 7", name="ck_pred_horizon"),
        CheckConstraint("confidence_radius_km >= 0", name="ck_pred_radius"),
    )


# -----------------------------------------------------------------
# 8. Risk Scores
# -----------------------------------------------------------------
class RiskScore(Base):
    __tablename__ = "risk_scores"

    risk_id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    voyage_id      = Column(UUID(as_uuid=True), ForeignKey("voyages.voyage_id", ondelete="CASCADE"), nullable=False)
    segment        = Column(Text, nullable=False)
    ice_risk       = Column(Float)
    iceberg_risk   = Column(Float)
    weather_risk   = Column(Float)
    combined_score = Column(Float)

    # Relationships
    voyage = relationship("Voyage", back_populates="risk_scores")

    __table_args__ = (
        CheckConstraint("ice_risk >= 0 AND ice_risk <= 1", name="ck_risk_ice"),
        CheckConstraint("iceberg_risk >= 0 AND iceberg_risk <= 1", name="ck_risk_iceberg"),
        CheckConstraint("weather_risk >= 0 AND weather_risk <= 1", name="ck_risk_weather"),
        CheckConstraint("combined_score >= 0 AND combined_score <= 1", name="ck_risk_combined"),
    )


# -----------------------------------------------------------------
# 9. Alerts
# -----------------------------------------------------------------
class Alert(Base):
    __tablename__ = "alerts"

    alert_id     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    voyage_id    = Column(UUID(as_uuid=True), ForeignKey("voyages.voyage_id", ondelete="CASCADE"), nullable=False)
    alert_type   = Column(String(30), nullable=False)
    severity     = Column(String(10), nullable=False)
    message      = Column(Text, nullable=False)
    triggered_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    acknowledged = Column(Boolean, default=False)

    # Relationships
    voyage = relationship("Voyage", back_populates="alerts")

    __table_args__ = (
        CheckConstraint("alert_type IN ('iceberg_proximity', 'storm', 'high_ice_risk', 'reroute')", name="ck_alert_type"),
        CheckConstraint("severity IN ('low', 'medium', 'high')", name="ck_alert_severity"),
    )


# -----------------------------------------------------------------
# 10. External Data Cache
# -----------------------------------------------------------------
class ExternalDataCache(Base):
    __tablename__ = "external_data_cache"

    cache_id     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_name  = Column(String(60), nullable=False)
    dataset_type = Column(String(40), nullable=False)
    fetched_at   = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    storage_path = Column(String(500), nullable=False)
    status       = Column(String(20), default="fetched")

    __table_args__ = (
        CheckConstraint("status IN ('fetched', 'validated', 'fused', 'failed')", name="ck_cache_status"),
    )

