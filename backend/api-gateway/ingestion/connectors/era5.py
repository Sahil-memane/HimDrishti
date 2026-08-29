# MOCK DATA — replace with live connector
import uuid

def fetch_weather_data(bbox: dict):
    print(f"Fetching ERA5 data for bbox: {bbox}")
    return {
        "source": "ERA5",
        "dataset": "weather",
        "status": "fetched",
        "storage_path": f"/data/era5_{uuid.uuid4().hex[:8]}.nc"
    }
