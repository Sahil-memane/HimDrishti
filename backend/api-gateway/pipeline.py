"""
HimDrishti API Gateway — Async Pipeline Orchestrator

Triggered in the background by POST /api/voyage.
Calls Model 1 → Model 2 → Model 3 sequentially and updates voyage.status.
"""
import json
import logging
import requests as http
from sqlalchemy.orm import Session
from sqlalchemy import text

from models import Voyage

logger = logging.getLogger(__name__)

import os

MODEL1_URL = os.getenv("MODEL1_URL", "http://localhost:8001")
MODEL2_URL = os.getenv("MODEL2_URL", "http://localhost:8002")
MODEL3_URL = os.getenv("MODEL3_URL", "http://localhost:8003")

import time

try:
    from google.auth.transport.requests import Request as _GoogleAuthRequest
    from google.oauth2 import id_token as _google_id_token
    _GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    _GOOGLE_AUTH_AVAILABLE = False

# Cloud Run always sets K_SERVICE on the deployed instance itself (part of
# its documented runtime contract, distinct from MODEL1_URL etc. which are
# just env vars we chose to set) — this is the cheap, explicit way to know
# whether a real metadata server exists at all, instead of discovering it
# by trying and failing. Without this gate, a bare try/except around
# fetch_id_token "worked" locally in the sense that it didn't crash or add
# auth headers — but google-auth's own metadata-server lookup retries 3
# times with backoff before giving up on each individual call, silently
# adding several real seconds of latency to EVERY Model 1/2/3 call in local
# docker compose (confirmed: visible in gateway logs on every single
# outbound request, and enough cumulative delay to blow past a 120s test
# timeout that used to comfortably pass).
_ON_CLOUD_RUN = bool(os.getenv("K_SERVICE"))

# Identity tokens are valid for ~1 hour; refetching one on every single
# outbound call (as the first version of this function did) adds an avoidable
# metadata-server round trip to every request even on real Cloud Run, where
# fetch_id_token does succeed. Cache per-audience URL, refresh a few minutes
# early to be safe.
_ID_TOKEN_CACHE: dict[str, tuple[str, float]] = {}
_ID_TOKEN_TTL_S = 50 * 60


def _auth_headers_for(url: str) -> dict:
    """
    On Cloud Run, model1/2/3 are deployed with --no-allow-unauthenticated,
    so calls to them must carry a Google-signed identity token whose
    audience is the target service's own URL — this gateway's service
    account is granted roles/run.invoker on each model by deploy.sh, but
    still has to present that token itself; Cloud Run does not do this
    automatically for you.

    Locally (docker compose) there is no metadata server and the local
    model services never require auth anyway, so this returns no header
    immediately — see _ON_CLOUD_RUN above for why that's checked explicitly
    rather than discovered via a failing call.
    """
    if not _GOOGLE_AUTH_AVAILABLE or not _ON_CLOUD_RUN:
        return {}

    cached = _ID_TOKEN_CACHE.get(url)
    if cached and cached[1] > time.time():
        return {"Authorization": f"Bearer {cached[0]}"}

    try:
        token = _google_id_token.fetch_id_token(_GoogleAuthRequest(), url)
        _ID_TOKEN_CACHE[url] = (token, time.time() + _ID_TOKEN_TTL_S)
        return {"Authorization": f"Bearer {token}"}
    except Exception:
        return {}


def _request_with_fallback(method, primary_url: str, endpoint: str, timeout: int, **kwargs):
    """
    Try the primary (Docker-network) URL, and only fall back to localhost on
    a genuine connection failure — never on a timeout, since a timeout means
    the primary WAS reachable and just slow; retrying an address with
    nothing listening on it (localhost, from inside a different container)
    can never succeed and previously masked the real error, since only the
    LAST exception was ever surfaced. The primary's own error is always
    preserved and included if every attempt fails.
    """
    primary_err = None
    try:
        headers = {**_auth_headers_for(primary_url), **kwargs.pop("headers", {})}
        return method(f"{primary_url}{endpoint}", timeout=timeout, headers=headers, **kwargs)
    except http.exceptions.Timeout as e:
        raise TimeoutError(f"{primary_url}{endpoint} timed out after {timeout}s: {e}") from e
    except Exception as e:
        primary_err = e

    if "localhost" not in primary_url and "127.0.0.1" not in primary_url:
        port = primary_url.split(":")[-1] if ":" in primary_url else "8000"
        fallback_url = f"http://localhost:{port}{endpoint}"
        try:
            return method(fallback_url, timeout=timeout, **kwargs)
        except Exception as fallback_err:
            raise RuntimeError(
                f"Primary ({primary_url}{endpoint}) failed: {primary_err}; "
                f"fallback ({fallback_url}) also failed: {fallback_err}"
            ) from primary_err

    raise primary_err


def _post_with_fallback(primary_url: str, endpoint: str, json_data: dict = None, timeout: int = 60):
    return _request_with_fallback(http.post, primary_url, endpoint, timeout, json=json_data)


def _get_with_fallback(primary_url: str, endpoint: str, timeout: int = 30):
    return _request_with_fallback(http.get, primary_url, endpoint, timeout)


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
        1. Model 1 /predict — generate sea-ice prediction grid for voyage bounding box
        2. Model 2 /seed & /predict/{id} — ensure iceberg predictions & trajectories exist
        3. Model 3 /route — A* routing consuming real Model 1 & 2 outputs, writes waypoints & risk_scores to DB
        4. Update voyage.status = 'planned' (or 'cancelled' on any failure)
    """
    voyage = db.query(Voyage).filter(Voyage.voyage_id == voyage_id).first()
    if not voyage:
        logger.error(f"Pipeline: voyage {voyage_id} not found.")
        return

    try:
        # -- Extract coordinates from WKB geometry --
        lon_s, lat_s = _extract_lonlat(voyage.start_point)
        lon_d, lat_d = _extract_lonlat(voyage.destination_point)

        min_lat = min(lat_s, lat_d) - 3.0
        max_lat = max(lat_s, lat_d) + 3.0
        min_lon = min(lon_s, lon_d) - 3.0
        max_lon = max(lon_s, lon_d) + 3.0

        # -- Step 1: Model 1 (Sea Ice Prediction) --
        logger.info(f"Voyage {voyage_id}: Triggering Model 1 /predict ...")
        m1_payload = {
            "voyage_id": str(voyage.voyage_id),
            "min_lat": min_lat,
            "max_lat": max_lat,
            "min_lon": min_lon,
            "max_lon": max_lon,
        }
        # Model 1's real upstream fetch (NOAA PolarWatch + Open-Meteo, up to
        # 3 sequential real calls on a cold cache) has been observed taking
        # 30-70s when it succeeds, but when NOAA is having a slow day it
        # fails identically on a retry too (tested: two full attempts both
        # hit the same NOAA read-timeout) — so a retry buys nothing there and
        # only doubles the wait. One attempt, generous enough for a real
        # slow-but-successful first (uncached) response, then move on to
        # Model 2/3 rather than blocking the whole voyage on it. Model 1
        # itself caches successful real fetches per area (env_data.py), so
        # repeat voyages/recomputes near the same area come back fast.
        try:
            r1 = _post_with_fallback(MODEL1_URL, "/predict", json_data=m1_payload, timeout=75)
            logger.info(f"Voyage {voyage_id}: Model 1 responded {r1.status_code}")
            if r1.status_code == 200:
                voyage.sic_model_used = r1.json().get("model_used")
            else:
                logger.warning(f"Voyage {voyage_id}: Model 1 returned {r1.status_code}: {r1.text[:200]}")
        except Exception as e:
            logger.warning(f"Voyage {voyage_id}: Model 1 call error ({e}), continuing anyway.")

        # -- Step 2: Model 2 (Iceberg trajectories) --
        # Real per-voyage icebergs come from Model 3's own Sentinel-1 SAR CFAR
        # scan of this voyage's bbox (see sar_detection.py) — not a fixed
        # demo seed. This used to call Model 2 /seed with no data at all,
        # which just re-asserted two hardcoded demo icebergs (B15/C28, see
        # 001_init.sql) regardless of the voyage's actual location; every
        # voyage's "Iceberg Detections" count and Model 3's iceberg-distance
        # routing cost were silently reading the same two fake positions.
        logger.info(f"Voyage {voyage_id}: Triggering Model 3 real SAR scan for iceberg seeding ...")
        detections, scene_datetime = [], None
        try:
            r_sar = _get_with_fallback(
                MODEL3_URL,
                f"/sar-scan?min_lat={min_lat}&max_lat={max_lat}&min_lon={min_lon}&max_lon={max_lon}",
                timeout=30,
            )
            if r_sar.status_code == 200:
                sar_data = r_sar.json()
                detections = sar_data.get("detections", [])
                scene_datetime = (sar_data.get("scene_meta") or {}).get("scene_datetime")
                logger.info(f"Voyage {voyage_id}: real SAR scan found {len(detections)} candidate iceberg(s).")
        except Exception as e:
            logger.warning(f"Voyage {voyage_id}: SAR scan for iceberg seeding failed ({e}), continuing with zero real detections.")

        logger.info(f"Voyage {voyage_id}: Triggering Model 2 /seed and trajectory predictions ...")
        try:
            r2_seed = _post_with_fallback(
                MODEL2_URL, "/seed",
                json_data={"voyage_id": voyage_id, "detections": detections, "scene_datetime": scene_datetime},
                timeout=15,
            )
            logger.info(f"Voyage {voyage_id}: Model 2 /seed responded {r2_seed.status_code}")

            # Predict trajectories for this voyage's own seeded icebergs
            r2_icebergs = _get_with_fallback(MODEL2_URL, f"/icebergs?voyage_id={voyage_id}", timeout=10)
            if r2_icebergs.status_code == 200:
                iceberg_list = r2_icebergs.json().get("icebergs", [])
                for ib_id in iceberg_list:
                    try:
                        _get_with_fallback(MODEL2_URL, f"/predict/{ib_id}", timeout=10)
                    except Exception as ib_err:
                        logger.warning(f"Voyage {voyage_id}: Failed to predict trajectory for iceberg {ib_id}: {ib_err}")
        except Exception as e:
            logger.warning(f"Voyage {voyage_id}: Model 2 unreachable ({e}), continuing anyway.")

        _run_model3_and_finalize(voyage, lat_s, lon_s, lat_d, lon_d, db)

    except Exception as exc:
        voyage.status = "cancelled"
        voyage.cancel_reason = f"Pipeline error: {exc}"
        logger.exception(f"Voyage {voyage_id}: Unhandled pipeline error: {exc}")

    finally:
        db.commit()
        db.close()


def _run_model3_and_finalize(voyage: Voyage, lat_s: float, lon_s: float, lat_d: float, lon_d: float, db: Session):
    """
    Shared by the full pipeline and the risk-profile recompute path: calls
    Model 3, records provenance, and runs the alert engine. Model 3 is the
    only one of the three models whose output actually depends on
    risk_tolerance — Model 1 (sea-ice) and Model 2 (iceberg drift) are pure
    environmental forecasts, so switching risk profile has no reason to
    redo either of them.
    """
    voyage_id = str(voyage.voyage_id)
    logger.info(f"Voyage {voyage_id}: Triggering Model 3 /route ...")
    # This voyage's own requested cruising speed/fuel rate — previously this
    # always used the vessel's fixed max_speed_knots/fuel_consumption_lph
    # regardless of what the user actually asked for, so every route's
    # ETA/fuel estimate reflected the vessel's master data, not the voyage.
    speed = voyage.speed_knots or (voyage.vessel.max_speed_knots if voyage.vessel else 12.0)
    fuel = voyage.fuel_consumption_lph or (voyage.vessel.fuel_consumption_lph if voyage.vessel else 500.0)

    payload = {
        "voyage_id":          voyage_id,
        "start_lat":          lat_s,
        "start_lon":          lon_s,
        "dest_lat":           lat_d,
        "dest_lon":           lon_d,
        "risk_tolerance":     voyage.risk_tolerance,
        "speed_knots":        speed,
        "fuel_consumption_lph": fuel,
        "departure_time":     voyage.departure_time.isoformat(),
    }

    try:
        r3 = _post_with_fallback(MODEL3_URL, "/route", json_data=payload, timeout=180)
    except Exception as e:
        voyage.status = "cancelled"
        voyage.cancel_reason = f"Route computation failed: {e}"
        logger.error(f"Voyage {voyage_id}: Model 3 call error: {e}")
        return

    if r3.status_code == 200:
        voyage.status = "planned"
        logger.info(f"Voyage {voyage_id}: Model 3 route calculated successfully.")

        sat_meta = (r3.json() or {}).get("satellite") or {}
        voyage.satellite_status = sat_meta.get("status")
        voyage.satellite_scene_id = sat_meta.get("scene_id")
        voyage.satellite_scene_datetime = sat_meta.get("scene_datetime")
        voyage.satellite_n_detections = sat_meta.get("n_detections")
        voyage.satellite_bbox = json.dumps(sat_meta["bbox"]) if sat_meta.get("bbox") else None
        voyage.satellite_thumbnail_href = sat_meta.get("thumbnail_href")

        try:
            from alert_engine import run_alert_pipeline
            logger.info(f"Voyage {voyage_id}: Triggering Alert Engine hazard evaluation...")
            alerts = run_alert_pipeline(voyage_id, db)
            logger.info(f"Voyage {voyage_id}: Alert Engine complete — generated {len(alerts)} alerts.")
        except Exception as alert_err:
            logger.warning(f"Voyage {voyage_id}: Alert Engine evaluation exception: {alert_err}")

        logger.info(f"Voyage {voyage_id}: Pipeline complete — status → planned.")
    else:
        voyage.status = "cancelled"
        try:
            voyage.cancel_reason = r3.json().get("detail") or r3.text[:300]
        except Exception:
            voyage.cancel_reason = r3.text[:300] or f"Model 3 returned {r3.status_code}"
        logger.error(f"Voyage {voyage_id}: Model 3 failed [{r3.status_code}]: {r3.text[:200]}")


def recompute_route_only(voyage_id: str, db: Session):
    """
    Background task for a risk-profile change on an already-planned voyage.
    Re-runs only Model 3 (real A* search with the new risk weighting) against
    this voyage's already-fetched real Model 1/2 data — skips the expensive
    real NOAA/Open-Meteo fetch entirely, since nothing about the environment
    changed, only how routes are scored against it.
    """
    voyage = db.query(Voyage).filter(Voyage.voyage_id == voyage_id).first()
    if not voyage:
        logger.error(f"Recompute: voyage {voyage_id} not found.")
        return

    try:
        lon_s, lat_s = _extract_lonlat(voyage.start_point)
        lon_d, lat_d = _extract_lonlat(voyage.destination_point)
        _run_model3_and_finalize(voyage, lat_s, lon_s, lat_d, lon_d, db)
    except Exception as exc:
        voyage.status = "cancelled"
        voyage.cancel_reason = f"Recompute error: {exc}"
        logger.exception(f"Voyage {voyage_id}: Unhandled recompute error: {exc}")
    finally:
        db.commit()
        db.close()

