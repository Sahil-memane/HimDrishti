"""
HimDrishti — Model 2: Iceberg Trajectory Prediction Service

CAVEAT: Evaluation numbers are pipeline-sanity checks, not real-world accuracy.
These predictions are never surfaced to end users as ground truth.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
import numpy as np

from ml_utils import load_models, predict_iceberg_trajectory, displacement_to_latlon, feature_columns, config
from db import SessionLocal, IcebergTrack, IcebergPrediction
from seed import seed_icebergs
from sqlalchemy import func


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load model artifacts once at startup
    load_models()
    # Seed demo icebergs
    seed_icebergs()
    yield


app = FastAPI(title="Model 2: Iceberg Trajectory Service", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "service": "model2-iceberg-service"}


@app.get("/predict/{iceberg_id}")
def predict_iceberg(iceberg_id: str):
    """
    Predict 7-day trajectory for a given iceberg.
    Pulls last 7 days of track data, runs the GRU+physics blend,
    and writes predictions to iceberg_predictions table.
    """
    from ml_utils import feature_columns as fc, config as cfg

    db = SessionLocal()
    try:
        # Pull last 7 days of iceberg track data, ordered by time
        tracks = (
            db.query(IcebergTrack)
            .filter(IcebergTrack.iceberg_id == iceberg_id)
            .order_by(IcebergTrack.observed_at.asc())
            .limit(7)
            .all()
        )

        if not tracks:
            raise HTTPException(status_code=404, detail=f"Iceberg '{iceberg_id}' not found in tracks")

        if len(tracks) < 7:
            raise HTTPException(status_code=422, detail=f"Need 7 days of data, found {len(tracks)}")

        # Get the anchor (last known position)
        last_track = tracks[-1]
        # Extract lat/lon from the PostGIS point
        anchor_point = db.execute(
            func.ST_AsText(last_track.position)
        ).scalar()
        # Parse "POINT(lon lat)"
        coords = anchor_point.replace("POINT(", "").replace(")", "").split()
        anchor_lon, anchor_lat = float(coords[0]), float(coords[1])

        # Build the feature matrix (7, 23)
        # In mock mode, we synthesize plausible feature values from the track data
        n_features = cfg.get("n_features", 23) if cfg else 23
        feature_matrix = np.zeros((7, n_features))

        velocity_u = 0.0
        velocity_v = 0.0

        for i, track in enumerate(tracks):
            pt = db.execute(func.ST_AsText(track.position)).scalar()
            c = pt.replace("POINT(", "").replace(")", "").split()
            lon, lat = float(c[0]), float(c[1])

            # Fill known columns with plausible values from track data
            feature_matrix[i, 0] = lat                       # latitude
            feature_matrix[i, 1] = lon                       # longitude
            feature_matrix[i, 2] = 1.0                       # time_gap_prev_days
            feature_matrix[i, 3] = track.velocity_ms or 0.05 # iceberg_speed

            # Compute velocity in km/day from speed + direction
            import math
            speed_km_day = (track.velocity_ms or 0.05) * 86.4  # m/s -> km/day
            dir_rad = math.radians(track.direction_deg or 0)
            vel_u = speed_km_day * math.sin(dir_rad)
            vel_v = speed_km_day * math.cos(dir_rad)

            feature_matrix[i, 4] = vel_u                     # velocity_u_km_day
            feature_matrix[i, 5] = vel_v                     # velocity_v_km_day
            feature_matrix[i, 6] = 0.0                       # acceleration_u
            feature_matrix[i, 7] = 0.0                       # acceleration_v

            # Environmental features (mocked plausible Antarctic values)
            feature_matrix[i, 8] = np.random.uniform(5, 15)  # wind_speed
            feature_matrix[i, 9] = np.random.uniform(-1, 1)  # wind_direction_sin
            feature_matrix[i, 10] = np.random.uniform(-1, 1) # wind_direction_cos
            feature_matrix[i, 11] = np.random.uniform(-5, 5) # u10
            feature_matrix[i, 12] = np.random.uniform(-5, 5) # v10
            feature_matrix[i, 13] = np.random.uniform(0.1, 0.5) # current_speed
            feature_matrix[i, 14] = np.random.uniform(-1, 1) # current_direction_sin
            feature_matrix[i, 15] = np.random.uniform(-1, 1) # current_direction_cos
            feature_matrix[i, 16] = np.random.uniform(-0.3, 0.3) # uo
            feature_matrix[i, 17] = np.random.uniform(-0.3, 0.3) # vo
            feature_matrix[i, 18] = vel_u * 0.1              # drift_u (fraction of velocity)
            feature_matrix[i, 19] = vel_v * 0.1              # drift_v
            feature_matrix[i, 20] = speed_km_day * 0.1       # ice_drift_speed
            feature_matrix[i, 21] = 15.0                     # size_1 (default)
            feature_matrix[i, 22] = 8.0                      # size_2 (default)

            if i == len(tracks) - 1:
                velocity_u = vel_u
                velocity_v = vel_v

        # Run prediction (physics + model blend)
        displacements, confidence_radii = predict_iceberg_trajectory(
            feature_matrix, velocity_u, velocity_v
        )

        # Delete old predictions for this iceberg
        db.query(IcebergPrediction).filter(
            IcebergPrediction.iceberg_id == iceberg_id
        ).delete()

        # Convert displacements to lat/lon and write to DB
        results = []
        for day_idx in range(7):
            dx, dy = displacements[day_idx]
            pred_lat, pred_lon = displacement_to_latlon(anchor_lat, anchor_lon, dx, dy)
            radius = confidence_radii[day_idx]

            prediction = IcebergPrediction(
                iceberg_id=iceberg_id,
                horizon_day=day_idx + 1,
                predicted_position=f"POINT({pred_lon} {pred_lat})",
                confidence_radius_km=radius,
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
def list_icebergs():
    """List all tracked iceberg IDs (for the frontend to iterate over)."""
    db = SessionLocal()
    try:
        ids = db.query(IcebergTrack.iceberg_id).distinct().all()
        return {"icebergs": [r[0] for r in ids]}
    finally:
        db.close()
