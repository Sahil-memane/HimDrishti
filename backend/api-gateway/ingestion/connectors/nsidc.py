# MOCK DATA — replace with live connector
import uuid

def fetch_sea_ice_data(bbox: dict):
    print(f"Fetching NSIDC data for bbox: {bbox}")
    return {
        "source": "NSIDC",
        "dataset": "sea_ice_concentration",
        "status": "fetched",
        "storage_path": f"/data/nsidc_{uuid.uuid4().hex[:8]}.nc"
    }
