"""
Seed real, per-voyage iceberg tracks from Model 3's live Sentinel-1 SAR CFAR
detections (see backend/model3-routing-service/sar_detection.py). Each
detection becomes a single real observed track point — no fabricated
multi-day drift history is invented, since a single SAR scene only gives one
real observation. velocity/direction are left null (genuinely unknown from
one observation) rather than made up; the real physics-informed drift model
(ml_utils.py) predicts motion forward from here using real wind/current data.
"""
from datetime import datetime, timezone
from db import SessionLocal, IcebergTrack


def seed_real_icebergs(voyage_id: str, detections: list, scene_datetime: str | None):
    """
    Replace this voyage's tracked icebergs with the real SAR detections just
    found for its route bbox. Idempotent per voyage (recompute-safe): clears
    only this voyage's own prior tracks first, never another voyage's.

    detections: list of {"lat", "lon", "estimated_length_m", "peak_intensity"}
    as returned by Model 3's /sar-scan (real values, or an empty list if no
    real scene covered this route — never fabricated).

    Returns the list of real iceberg_ids seeded (possibly empty).
    """
    db = SessionLocal()
    try:
        db.query(IcebergTrack).filter(IcebergTrack.voyage_id == voyage_id).delete()

        try:
            observed_at = datetime.fromisoformat(scene_datetime.replace("Z", "+00:00")) if scene_datetime else datetime.now(timezone.utc)
        except ValueError:
            observed_at = datetime.now(timezone.utc)

        iceberg_ids = []
        for i, d in enumerate(detections):
            iceberg_id = f"SAR-{voyage_id[:8]}-{i + 1}"
            track = IcebergTrack(
                iceberg_id=iceberg_id,
                observed_at=observed_at,
                position=f"POINT({d['lon']} {d['lat']})",
                velocity_ms=None,
                direction_deg=None,
                voyage_id=voyage_id,
            )
            db.add(track)
            iceberg_ids.append(iceberg_id)

        db.commit()
        print(f"[Model 2] Voyage {voyage_id}: seeded {len(iceberg_ids)} real SAR-detected iceberg(s).")
        return iceberg_ids
    except Exception as e:
        db.rollback()
        print(f"[Model 2] Voyage {voyage_id}: error seeding real iceberg detections: {e}")
        return []
    finally:
        db.close()
