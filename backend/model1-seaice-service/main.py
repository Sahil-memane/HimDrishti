from contextlib import asynccontextmanager
from datetime import date
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np

from ml_utils import load_models, predict_7_days
from db import SessionLocal, SeaIceForecast

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load model on startup
    load_models()
    yield

app = FastAPI(title="Model 1: Sea-Ice Forecast Service", lifespan=lifespan)

class PredictRequest(BaseModel):
    voyage_id: str
    min_lat: float
    max_lat: float
    min_lon: float
    max_lon: float

@app.post("/predict")
def predict_sea_ice(req: PredictRequest):
    # In mock mode, synthesize a plausible 14-day window
    # For now we just pass dummy DataFrame of shape (14, 5) assuming 5 features
    dummy_data = np.random.rand(14, 5) 
    df = pd.DataFrame(dummy_data)
    
    location = {
        "min_lat": req.min_lat,
        "max_lat": req.max_lat,
        "min_lon": req.min_lon,
        "max_lon": req.max_lon
    }
    
    sic_values, confidences = predict_7_days(location, df)
    
    # Write to database
    db = SessionLocal()
    today = date.today()
    try:
        lat_step = (req.max_lat - req.min_lat) / 5.0
        lon_step = (req.max_lon - req.min_lon) / 5.0
        
        for i in range(7):
            base_sic = sic_values[i]
            base_conf = confidences[i]
            
            for row in range(5):
                for col in range(5):
                    cell_min_lat = req.min_lat + row * lat_step
                    cell_max_lat = cell_min_lat + lat_step
                    cell_min_lon = req.min_lon + col * lon_step
                    cell_max_lon = cell_min_lon + lon_step
                    
                    polygon_wkt = f"POLYGON(({cell_min_lon} {cell_min_lat}, {cell_max_lon} {cell_min_lat}, {cell_max_lon} {cell_max_lat}, {cell_min_lon} {cell_max_lat}, {cell_min_lon} {cell_min_lat}))"
                    
                    # Add +/- 10% random variation, clamped to 0-1
                    variance = np.random.uniform(-0.1, 0.1)
                    cell_sic = max(0.0, min(1.0, base_sic + variance))
                    
                    forecast = SeaIceForecast(
                        forecast_date=today,
                        horizon_day=i + 1,
                        grid_cell=polygon_wkt,
                        ice_concentration=cell_sic * 100.0,
                        confidence=base_conf
                    )
                    db.add(forecast)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
        
    return {
        "status": "success",
        "forecast_date": str(today),
        "predictions": [
            {"day": i+1, "sic": sic_values[i], "confidence": confidences[i]} for i in range(7)
        ]
    }
