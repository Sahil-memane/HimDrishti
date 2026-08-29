import os
import uuid
from datetime import datetime
from sqlalchemy import create_engine, Column, Float, Integer, String, DateTime, Date, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:HimDrishti_Secure_DB_2026@localhost:5435/himdrishti")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SeaIceForecast(Base):
    __tablename__ = "sea_ice_forecasts"
    forecast_id       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    forecast_date     = Column(Date, nullable=False)
    horizon_day       = Column(Integer, nullable=False)
    grid_cell         = Column(Geometry("POLYGON", srid=4326), nullable=False)
    ice_concentration = Column(Float, nullable=False)
    confidence        = Column(Float)

class IcebergPrediction(Base):
    __tablename__ = "iceberg_predictions"
    prediction_id       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iceberg_id          = Column(String(30), nullable=False)
    horizon_day         = Column(Integer, nullable=False)
    predicted_position  = Column(Geometry("POINT", srid=4326), nullable=False)
    confidence_radius_km = Column(Float)

class Waypoint(Base):
    __tablename__ = "waypoints"
    waypoint_id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    voyage_id          = Column(UUID(as_uuid=True), nullable=False) # ForeignKey("voyages.voyage_id")
    sequence_no        = Column(Integer, nullable=False)
    position           = Column(Geometry("POINT", srid=4326), nullable=False)
    eta                = Column(DateTime(timezone=True), nullable=False)
    cumulative_fuel_l  = Column(Float)
    segment_risk_score = Column(Float)

class RiskScore(Base):
    __tablename__ = "risk_scores"
    risk_id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    voyage_id      = Column(UUID(as_uuid=True), nullable=False) # ForeignKey("voyages.voyage_id")
    segment        = Column(Geometry("LINESTRING", srid=4326), nullable=False)
    ice_risk       = Column(Float)
    iceberg_risk   = Column(Float)
    weather_risk   = Column(Float)
    combined_score = Column(Float)
