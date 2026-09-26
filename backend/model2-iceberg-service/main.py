"""
HimDrishti — Model 2: Iceberg Trajectory Prediction Service

Physics-informed drift model driven by real, live-fetched wind and ocean
current forecasts (see env_data.py / ml_utils.py). No random or fabricated
environmental inputs are used.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from ml_utils import load_models, predict_iceberg_trajectory
from env_data import fetch_wind_forecast, fetch_current_forecast
from db import SessionLocal, IcebergTrack, IcebergPrediction
from seed import seed_real_icebergs


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    yield


app = FastAPI(title="Model 2: Iceberg Trajectory Service", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "service": "model2-iceberg-service"}


def _parse_point(wkt: str):
    coords = wkt.replace("POINT(", "").replace(")", "").split()
    return float(coords[0]), float(coords[1])  # lon, lat


class SarDetection(BaseModel):
    lat: float
    lon: float
    estimated_length_m: float | None = None
    peak_intensity: float | None = None


class SeedRequest(BaseModel):
    voyage_id: str
    detections: list[SarDetection] = []
    scene_datetime: str | None = None


@app.post("/seed")
def reseed(req: SeedRequest):
    """
    Seed this voyage's real tracked icebergs from Model 3's real Sentinel-1
    SAR detections for its route bbox (passed in by the gateway's pipeline —
    see sar_detection.py / /sar-scan). Idempotent per voyage: replaces only
    this voyage's own prior tracks. An empty detections list (no real scene
    covered this route) honestly seeds zero icebergs rather than fabricating any.
    """
    iceberg_ids = seed_real_icebergs(
        req.voyage_id, [d.model_dump() for d in req.detections], req.scene_datetime
    )
    return {"status": "ok", "iceberg_ids": iceberg_ids}


@app.get("/predict/{iceberg_id}")
def predict_iceberg(iceberg_id: str):
    """
    Predict a real, physics-informed 7-day trajectory for a tracked iceberg
    using genuinely fetched wind + ocean-current forecasts at its last known
    position, and write the results to iceberg_predictions.
    """
    db = SessionLocal()
    try:
        last_track = (
            db.query(IcebergTrack)
            .filter(IcebergTrack.iceberg_id == iceberg_id)
            .order_by(IcebergTrack.observed_at.desc())
            .first()
        )
        if last_track is None:
            raise HTTPException(status_code=404, detail=f"Iceberg '{iceberg_id}' not found in tracks")

        anchor_lon, anchor_lat = _parse_point(str(last_track.position))

        try:
            wind_series = fetch_wind_forecast(anchor_lat, anchor_lon, days=7)
            current_series = fetch_current_forecast(anchor_lat, anchor_lon, days=7)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Could not fetch real environmental forecast data: {e}")

        positions, confidence_radii = predict_iceberg_trajectory(
            anchor_lat, anchor_lon, wind_series, current_series
        )

        db.query(IcebergPrediction).filter(
            IcebergPrediction.iceberg_id == iceberg_id
        ).delete()

        results = []
        for day_idx, ((pred_lat, pred_lon), radius) in enumerate(zip(positions, confidence_radii)):
            prediction = IcebergPrediction(
                iceberg_id=iceberg_id,
                horizon_day=day_idx + 1,
                predicted_position=f"POINT({pred_lon} {pred_lat})",
                confidence_radius_km=radius,
                voyage_id=last_track.voyage_id,
            )
            db.add(prediction)
            results.append({
                "day": day_idx + 1,
                "lat": round(pred_lat, 6),
                "lon": round(pred_lon, 6),
                "confidence_radius_km": round(radius, 2),
            })

        db.commit()

        return {
            "iceberg_id": iceberg_id,
            "anchor_lat": anchor_lat,
            "anchor_lon": anchor_lon,
            "wind_forecast_kmh_deg": wind_series,
            "current_forecast_kmh_deg": current_series,
            "predictions": results,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.get("/icebergs")
def list_icebergs(voyage_id: str | None = None):
    """List tracked iceberg IDs (for the pipeline/frontend to iterate over). Scoped to a voyage when given."""
    db = SessionLocal()
    try:
        query = db.query(IcebergTrack.iceberg_id).distinct()
        if voyage_id:
            query = query.filter(IcebergTrack.voyage_id == voyage_id)
        ids = query.all()
        return {"icebergs": [r[0] for r in ids]}
    finally:
        db.close()
