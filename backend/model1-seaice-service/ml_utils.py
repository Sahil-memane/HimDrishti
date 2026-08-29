import os
import pickle
import numpy as np
import pandas as pd

# Global variables for model and scaler
model = None
scaler = None

def load_models():
    global model, scaler
    import tensorflow as tf
    model_path = "/app/artifacts/sea_ice_forecasting_model/sic_lstm_best.keras"
    scaler_path = "/app/artifacts/sea_ice_forecasting_model/feature_scaler.pkl"
    
    # Fallback to local paths if not in docker
    if not os.path.exists(model_path):
        model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml", "artifacts", "sea_ice_forecasting_model", "sic_lstm_best.keras"))
        scaler_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml", "artifacts", "sea_ice_forecasting_model", "feature_scaler.pkl"))
        
    try:
        model = tf.keras.models.load_model(model_path)
        with open(scaler_path, "rb") as f:
            scaler = pickle.load(f)
        print("Successfully loaded SIC model and scaler.")
    except Exception as e:
        print(f"Warning: Could not load model or scaler: {e}")
        model = None
        scaler = None

def prepare_input(location: dict, last_14_days_df: pd.DataFrame) -> np.ndarray:
    """
    Scale features and reshape for LSTM (1, 14, num_features).
    """
    if scaler is None:
        return None
    
    features = last_14_days_df.values
    try:
        scaled_features = scaler.transform(features)
        return scaled_features.reshape(1, 14, -1)
    except Exception as e:
        print(f"Scaler failed, returning None: {e}")
        return None

def predict_7_days(location: dict, last_14_days_df: pd.DataFrame) -> tuple:
    """
    Returns 7 daily SIC values (0-1) and confidences.
    """
    input_data = prepare_input(location, last_14_days_df)
    if model is None or input_data is None:
        # Fallback mock predictor
        print("Using fallback mock predictor for SIC.")
        sic_values = [0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5]
    else:
        # Use real model
        try:
            pred = model.predict(input_data)
            # Assuming output is shape (1, 7)
            sic_values = pred[0].tolist()
        except Exception as e:
            print(f"Model predict failed, using mock: {e}")
            sic_values = [0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5]
        
    # Naive confidence: linearly decaying 0.95 -> 0.55
    confidences = [0.95 - (i * 0.4 / 6.0) for i in range(7)]
    return sic_values, confidences
