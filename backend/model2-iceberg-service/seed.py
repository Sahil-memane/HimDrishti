"""
Seed 2-3 test icebergs into iceberg_tracks for demo purposes.
"""
from datetime import datetime, timedelta, timezone
from db import SessionLocal, IcebergTrack


def seed_icebergs():
    """Insert mock iceberg track history if not already present."""
    db = SessionLocal()
    try:
        existing = db.query(IcebergTrack).first()
        if existing:
            print("[Seed] Iceberg tracks already seeded, skipping.")
            return

        icebergs = [
            {
                "iceberg_id": "ANT-B22A",
                "base_lat": -67.5, "base_lon": 45.0,
                "velocity_u": 5.2, "velocity_v": -3.1,   # km/day
                "speed_ms": 0.06, "direction": 120.0,
                "size_1": 15.0, "size_2": 8.0,
            },
            {
                "iceberg_id": "ANT-C19",
                "base_lat": -70.2, "base_lon": 42.5,
                "velocity_u": -2.8, "velocity_v": 4.5,
                "speed_ms": 0.05, "direction": 210.0,
                "size_1": 22.0, "size_2": 12.0,
            },
            {
                "iceberg_id": "ANT-D15B",
                "base_lat": -72.0, "base_lon": 48.0,
                "velocity_u": 3.0, "velocity_v": -1.5,
                "speed_ms": 0.04, "direction": 160.0,
                "size_1": 10.0, "size_2": 5.0,
            },
        ]

        now = datetime.now(timezone.utc)
        for berg in icebergs:
            for day_offset in range(7):
                obs_time = now - timedelta(days=6 - day_offset)
                # Simulate slight drift over past 7 days
                lat = berg["base_lat"] + (berg["velocity_v"] / 111.0) * day_offset
                lon = berg["base_lon"] + (berg["velocity_u"] / 111.0) * day_offset

                track = IcebergTrack(
                    iceberg_id=berg["iceberg_id"],
                    observed_at=obs_time,
                    position=f"POINT({lon} {lat})",
                    velocity_ms=berg["speed_ms"],
                    direction_deg=berg["direction"],
                )
                db.add(track)

        db.commit()
        print(f"[Seed] Seeded {len(icebergs)} icebergs with 7 days of track history each.")
    except Exception as e:
        db.rollback()
        print(f"[Seed] Error seeding icebergs: {e}")
    finally:
        db.close()
