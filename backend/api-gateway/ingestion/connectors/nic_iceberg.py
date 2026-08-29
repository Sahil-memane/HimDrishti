# MOCK DATA — replace with live connector
import uuid

def fetch_iceberg_tracks(bbox: dict):
    print(f"Fetching NIC Iceberg data for bbox: {bbox}")
    return {
        "source": "NIC",
        "dataset": "iceberg_tracks",
        "status": "fetched",
        "storage_path": f"/data/nic_{uuid.uuid4().hex[:8]}.json"
    }
