"""
HimDrishti API Gateway — Async Pipeline Orchestrator

Triggered in the background by POST /api/voyage.
Calls Model 1 → Model 2 → Model 3 sequentially and updates voyage.status.
"""
import logging
import requests as http
from sqlalchemy.orm import Session
from sqlalchemy import text

from models import Voyage

logger = logging.getLogger(__name__)

# Internal docker-network URLs (service names from docker-compose.yml)
MODEL2_URL = "http://model2:8002"
MODEL3_URL = "http://model3:8003"


from sqlalchemy import func as geo_func

def _extract_lonlat(geom_col) -> tuple[float, float]:
    """Extract (lon, lat) from a WKT point string 'POINT(lon lat)'."""
    cleaned = str(geom_col).replace("POINT(", "").replace(")", "").strip()
    parts = cleaned.split()
    return float(parts[0]), float(parts[1])


def process_voyage_pipeline(voyage_id: str, db: Session):
    """
    Background orchestration task. Runs three model services in sequence.

    Pipeline:
        1. Model 2 /seed  — ensure iceberg predictions exist in the bbox
        2. Model 3 /route — A* routing, writes waypoints & risk_scores to DB
        3. Update voyage.status = 'planned' (or 'cancelled' on any failure)
    """
    voyage = db.query(Voyage).filter(Voyage.voyage_id == voyage_id).first()
    if not voyage:
        logger.error(f"Pipeline: voyage {voyage_id} not found.")
        return

    try:
        # -- Extract coordinates from WKB geometry --
        lon_s, lat_s = _extract_lonlat(voyage.start_point)
        lon_d, lat_d = _extract_lonlat(voyage.destination_point)

        # -- Step 1: Model 1 (Sea Ice) --
        # Model 1 seeds on startup; no per-voyage HTTP call needed for demo.
        logger.info(f"Voyage {voyage_id}: Model 1 (sea-ice) — seeded at startup, skipping.")

        # -- Step 2: Model 2 (Iceberg trajectories) --
        logger.info(f"Voyage {voyage_id}: Triggering Model 2 /seed ...")
        try:
            r2 = http.post(f"{MODEL2_URL}/seed", timeout=15)
            logger.info(f"Voyage {voyage_id}: Model 2 responded {r2.status_code}")
        except Exception as e:
            logger.warning(f"Voyage {voyage_id}: Model 2 unreachable ({e}), continuing anyway.")

        # -- Step 3: Model 3 (A* Routing) --
        logger.info(f"Voyage {voyage_id}: Triggering Model 3 /route ...")
        speed = voyage.vessel.max_speed_knots if voyage.vessel else 12.0
        fuel  = voyage.vessel.fuel_consumption_lph if voyage.vessel else 500.0

        payload = {
            "voyage_id":          str(voyage.voyage_id),
            "start_lat":          lat_s,
            "start_lon":          lon_s,
            "dest_lat":           lat_d,
            "dest_lon":           lon_d,
            "risk_tolerance":     voyage.risk_tolerance,
            "speed_knots":        speed,
            "fuel_consumption_lph": fuel,
            "departure_time":     voyage.departure_time.isoformat(),
        }

        r3 = http.post(f"{MODEL3_URL}/route", json=payload, timeout=60)

        if r3.status_code == 200:
            voyage.status = "planned"
            logger.info(f"Voyage {voyage_id}: Pipeline complete — status → planned.")
        else:
            voyage.status = "cancelled"
            logger.error(
                f"Voyage {voyage_id}: Model 3 failed [{r3.status_code}]: {r3.text[:200]}"
            )

    except Exception as exc:
        voyage.status = "cancelled"
        logger.exception(f"Voyage {voyage_id}: Unhandled pipeline error: {exc}")

    finally:
        db.commit()
        db.close()
