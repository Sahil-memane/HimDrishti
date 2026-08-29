import os
import uuid
from sqlalchemy import create_engine, Column, Float, Integer, String, DateTime, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:HimDrishti_Secure_DB_2026@localhost:5435/himdrishti")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class IcebergTrack(Base):
    __tablename__ = "iceberg_tracks"
    iceberg_id    = Column(String(30), primary_key=True)
    observed_at   = Column(DateTime(timezone=True), primary_key=True)
    position      = Column(Geometry("POINT", srid=4326), nullable=False)
    velocity_ms   = Column(Float)
    direction_deg = Column(Float)


class IcebergPrediction(Base):
    __tablename__ = "iceberg_predictions"
    prediction_id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iceberg_id           = Column(String(30), nullable=False)
    horizon_day          = Column(Integer, nullable=False)
    predicted_position   = Column(Geometry("POINT", srid=4326), nullable=False)
    confidence_radius_km = Column(Float)
