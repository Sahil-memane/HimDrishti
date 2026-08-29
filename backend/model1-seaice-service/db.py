import os
from sqlalchemy import create_engine, Column, Float, Integer, Date, ForeignKey, CheckConstraint
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
import uuid

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
