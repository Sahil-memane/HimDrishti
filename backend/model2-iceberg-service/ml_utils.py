"""
Model 2 — ML Utilities
Loads the GRU/LSTM model, feature columns, confidence thresholds, and config.
Implements the physics+ML blend for iceberg trajectory prediction.

CAVEAT: Evaluation numbers are pipeline-sanity checks, not real-world accuracy.
These predictions are never surfaced to end users as ground truth.
"""

import os
import pickle
import numpy as np

# Global variables — loaded once at startup
model = None
feature_columns = None
day_confidence_thresholds = None
config = None

ARTIFACTS_DIR = "/app/artifacts/iceberg_trajectory_model"


def load_models():
    """Load model and pickle artifacts exactly once at startup."""
    global model, feature_columns, day_confidence_thresholds, config

    model_path = os.path.join(ARTIFACTS_DIR, "combined_model2.keras")
    fc_path = os.path.join(ARTIFACTS_DIR, "feature_columns_v5.pkl")
    dc_path = os.path.join(ARTIFACTS_DIR, "day_confidence_thresholds_v5.pkl")
    cfg_path = os.path.join(ARTIFACTS_DIR, "config.pkl")

    # Fallback to local dev paths
    if not os.path.exists(model_path):
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml", "artifacts", "iceberg_trajectory_model"))
        model_path = os.path.join(base, "combined_model2.keras")
        fc_path = os.path.join(base, "feature_columns_v5.pkl")
        dc_path = os.path.join(base, "day_confidence_thresholds_v5.pkl")
        cfg_path = os.path.join(base, "config.pkl")

    try:
        import tensorflow as tf
        model = tf.keras.models.load_model(model_path)
        print(f"[Model 2] Loaded model from {model_path}")
    except Exception as e:
        print(f"[Model 2] WARNING: Could not load model: {e}")
        model = None

    try:
        with open(fc_path, "rb") as f:
            feature_columns = pickle.load(f)
        with open(dc_path, "rb") as f:
            day_confidence_thresholds = pickle.load(f)
        with open(cfg_path, "rb") as f:
            config = pickle.load(f)
        print(f"[Model 2] Loaded {len(feature_columns)} feature columns, config: {config}")
    except Exception as e:
        print(f"[Model 2] WARNING: Could not load pickle artifacts: {e}")
        feature_columns = [
            'latitude', 'longitude', 'time_gap_prev_days', 'iceberg_speed',
            'velocity_u_km_day', 'velocity_v_km_day', 'acceleration_u', 'acceleration_v',
            'wind_speed', 'wind_direction_sin', 'wind_direction_cos', 'u10', 'v10',
            'current_speed', 'current_direction_sin', 'current_direction_cos',
            'uo', 'vo', 'drift_u', 'drift_v', 'ice_drift_speed', 'size_1', 'size_2'
        ]
        day_confidence_thresholds = {1: 13.5, 2: 20.6, 3: 29.2, 4: 34.5, 5: 41.2, 6: 48.3, 7: 52.8}
        config = {'physics_weight': 0.1, 'lookback_days': 7, 'forecast_horizon': 7, 'n_features': 23}


def predict_iceberg_trajectory(last_7_days: np.ndarray, velocity_u: float, velocity_v: float):
    """
    Predict 7-day iceberg trajectory.

    Args:
        last_7_days: (7, 23) array of feature values in feature_columns order
        velocity_u: current velocity in km/day (east-west)
        velocity_v: current velocity in km/day (north-south)

    Returns:
        displacements: list of 7 (dx, dy) in km from current position
        confidence_radii: list of 7 confidence radius values in km
    """
    physics_weight = config.get("physics_weight", 0.1) if config else 0.1
    ml_weight = 1.0 - physics_weight

    # Physics estimate: simple linear drift
    physics_displacements = [(velocity_u * day, velocity_v * day) for day in range(1, 8)]

    if model is not None:
        try:
            input_data = last_7_days.reshape(1, 7, -1)
            pred = model.predict(input_data, verbose=0)
            # Model outputs (1, 7, 2) or (1, 14) — reshape to (7, 2)
            if pred.shape == (1, 14):
                ml_displacements = pred.reshape(7, 2).tolist()
            else:
                ml_displacements = pred[0].tolist()
            print("[Model 2] Using GRU model predictions")
        except Exception as e:
            print(f"[Model 2] Model predict failed, falling back to physics: {e}")
            ml_displacements = physics_displacements
            ml_weight = 0.0
            physics_weight = 1.0
    else:
        # Fallback: 0% GRU + 100% physics
        print("[Model 2] FALLBACK: Using physics-only predictions (no model loaded)")
        ml_displacements = physics_displacements
        ml_weight = 0.0
        physics_weight = 1.0

    # Blend: final = physics_weight * physics + ml_weight * model
    blended = []
    for i in range(7):
        dx = physics_weight * physics_displacements[i][0] + ml_weight * ml_displacements[i][0]
        dy = physics_weight * physics_displacements[i][1] + ml_weight * ml_displacements[i][1]
        blended.append((dx, dy))

    # Confidence radii from thresholds
    thresholds = day_confidence_thresholds or {d: 10.0 * d for d in range(1, 8)}
    confidence_radii = [thresholds.get(d, 10.0 * d) for d in range(1, 8)]

    return blended, confidence_radii


def displacement_to_latlon(anchor_lat: float, anchor_lon: float, dx_km: float, dy_km: float):
    """
    Convert (dx, dy) in km to (lat, lon) using the anchor position.
    dx = east-west displacement, dy = north-south displacement.
    """
    # 1 degree latitude ~ 111 km
    # 1 degree longitude ~ 111 * cos(lat) km
    import math
    new_lat = anchor_lat + (dy_km / 111.0)
    new_lon = anchor_lon + (dx_km / (111.0 * math.cos(math.radians(anchor_lat))))
    return new_lat, new_lon
