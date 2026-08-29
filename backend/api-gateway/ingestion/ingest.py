import uuid
import sys
import os
from datetime import datetime

# Adjust sys.path to allow importing models from api-gateway since this is a monorepo
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import get_settings
from models import ExternalDataCache

from utils import compute_bbox
from connectors import nsidc, cmems, era5, nic_iceberg

settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_ingestion(voyage_id: str, start_lat: float, start_lon: float, dest_lat: float, dest_lon: float):
    bbox = compute_bbox(start_lat, start_lon, dest_lat, dest_lon)
    
    # Run stub connectors
    results = [
        nsidc.fetch_sea_ice_data(bbox),
        cmems.fetch_ocean_currents(bbox),
        era5.fetch_weather_data(bbox),
        nic_iceberg.fetch_iceberg_tracks(bbox)
    ]
    
    db = SessionLocal()
    try:
        for res in results:
            cache_entry = ExternalDataCache(
                source_name=res["source"],
                dataset_type=res["dataset"],
                storage_path=res["storage_path"],
                status=res["status"]
            )
            db.add(cache_entry)
        db.commit()
    finally:
        db.close()
    
    return bbox

if __name__ == "__main__":
    print("Testing Ingestion Service...")
    bbox = run_ingestion(str(uuid.uuid4()), -70.0, 40.0, -75.0, 50.0)
    print(f"Ingestion complete. Bbox: {bbox}")
