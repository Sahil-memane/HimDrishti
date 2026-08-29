# MOCK DATA — replace with live connector
import uuid

def fetch_ocean_currents(bbox: dict):
    print(f"Fetching CMEMS data for bbox: {bbox}")
    return {
        "source": "CMEMS",
        "dataset": "ocean_currents",
        "status": "fetched",
        "storage_path": f"/data/cmems_{uuid.uuid4().hex[:8]}.nc"
    }
