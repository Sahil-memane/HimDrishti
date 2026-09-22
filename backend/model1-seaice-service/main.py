"""
HimDrishti — Model 1: Sea-Ice Concentration Forecast Service

Real inference: fetches a genuine 21-day history of real satellite sea-ice
observations and real weather/SST for the requested bounding box
(env_data.py), then runs them through the real trained LSTM (ml_utils.py,
the project's actual originally-intended model — falls back to a real
trained GradientBoostingRegressor only if the LSTM can't load). No random
values are generated anywhere in this request path.
"""

from contextlib import asynccontextmanager
from datetime import date
import math

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from ml_utils import load_models, predict_horizons
from env_data import fetch_recent_sic_history, fetch_weather_history, nearest_cell
from db import SessionLocal, SeaIceForecast

HISTORY_DAYS = 21


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    yield


app = FastAPI(title="Model 1: Sea-Ice Forecast Service", lifespan=lifespan)


class PredictRequest(BaseModel):
    voyage_id: str
    min_lat: float
    max_lat: float
    min_lon: float
    max_lon: float


@app.get("/health")
def health():
    return {"status": "ok", "service": "model1-seaice-service"}


@app.post("/predict")
def predict_sea_ice(req: PredictRequest):
    try:
        dates, cells = fetch_recent_sic_history(req.min_lat, req.max_lat, req.min_lon, req.max_lon, days=HISTORY_DAYS)
        if not cells:
            raise RuntimeError("no real satellite observations available for this bounding box")
        centroid_lat = (req.min_lat + req.max_lat) / 2
        centroid_lon = (req.min_lon + req.max_lon) / 2
        weather_history = fetch_weather_history(centroid_lat, centroid_lon, end_date=dates[-1], days=len(dates))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch real satellite/weather data: {e}")

    doy_sin_hist = [math.sin(2 * math.pi * d.timetuple().tm_yday / 365.25) for d in dates]
    doy_cos_hist = [math.cos(2 * math.pi * d.timetuple().tm_yday / 365.25) for d in dates]
    today = date.today()

    lat_step = (req.max_lat - req.min_lat) / 5.0
    lon_step = (req.max_lon - req.min_lon) / 5.0

    db = SessionLocal()
    try:
        # Scoped to this voyage only — a global unscoped delete here meant
        # every new voyage's forecast silently wiped out every other voyage's
        # sea-ice data, so only the most recently computed voyage ever had
        # real forecast rows.
        db.query(SeaIceForecast).filter(SeaIceForecast.voyage_id == req.voyage_id).delete()

        day_totals = [0.0] * 7
        day_confidences = [0.0] * 7
        model_used = None

        for row in range(5):
            for col in range(5):
                cell_min_lat = req.min_lat + row * lat_step
                cell_max_lat = cell_min_lat + lat_step
                cell_min_lon = req.min_lon + col * lon_step
                cell_max_lon = cell_min_lon + lon_step
                cell_lat = (cell_min_lat + cell_max_lat) / 2
                cell_lon = (cell_min_lon + cell_max_lon) / 2

                real_cell = nearest_cell(cells, cell_lat, cell_lon)
                sic_values, confidences, model_used = predict_horizons(
                    real_cell["history"], weather_history, cell_lat, cell_lon, doy_sin_hist, doy_cos_hist,
                )

                polygon_wkt = (
                    f"POLYGON(({cell_min_lon} {cell_min_lat}, {cell_max_lon} {cell_min_lat}, "
                    f"{cell_max_lon} {cell_max_lat}, {cell_min_lon} {cell_max_lat}, {cell_min_lon} {cell_min_lat}))"
                )

                for i in range(7):
                    forecast = SeaIceForecast(
                        voyage_id=req.voyage_id,
                        forecast_date=today,
                        horizon_day=i + 1,
                        grid_cell=polygon_wkt,
                        ice_concentration=sic_values[i] * 100.0,
                        confidence=confidences[i],
                    )
                    db.add(forecast)
                    day_totals[i] += sic_values[i]
                    day_confidences[i] += confidences[i]
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

    n_cells = 25
    return {
        "status": "success",
        "forecast_date": str(today),
        "model_used": model_used,
        "source": "Real trained model on NOAA PolarWatch satellite observations + real Open-Meteo weather/SST history",
        "predictions": [
            {"day": i + 1, "sic": day_totals[i] / n_cells, "confidence": day_confidences[i] / n_cells}
            for i in range(7)
        ],
    }
