"""
HimDrishti API Gateway — Central Alert Engine Module
Evaluates real Model 1, Model 2, and Model 3 outputs against the active voyage route.
Calculates dynamic alerts, handles deduplication, severity grading, and database lifecycle management.
"""

import math
import logging
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Optional
from uuid import UUID

from sqlalchemy.orm import Session
from models import Voyage, Waypoint, RiskScore, SeaIceForecast, IcebergPrediction, IcebergTrack, Alert

logger = logging.getLogger(__name__)

# Configurable hazard thresholds
HIGH_SIC_THRESHOLD = 88.0            # High sea-ice concentration (%) threshold for critical pack ice
ICEBERG_CORRIDOR_KM = 35.0          # Iceberg safety corridor distance (km)
ROUTE_RISK_THRESHOLD = 0.70         # Route segment risk score threshold

# Severity grading rules
SEVERITY_CRITICAL_RISK = 0.85
SEVERITY_WARNING_RISK = 0.65
ICEBERG_CRITICAL_DIST_KM = 15.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the Great Circle distance in km between two lat/lon points."""
    R = 6371.0  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def _parse_point_wkt(wkt: str) -> Optional[Tuple[float, float]]:
    """Parse 'POINT(lon lat)' to (lon, lat). Returns None on parse error."""
    if not wkt:
        return None
    try:
        clean = wkt.replace("POINT(", "").replace(")", "").strip()
        parts = clean.split()
        return float(parts[0]), float(parts[1])
    except Exception:
        return None


def _parse_polygon_bbox(wkt: str) -> Optional[Tuple[float, float, float, float]]:
    """Parse POLYGON WKT and return (min_lon, min_lat, max_lon, max_lat)."""
    if not wkt or not wkt.startswith("POLYGON"):
        return None
    try:
        clean = wkt.replace("POLYGON((", "").replace("))", "").replace("POLYGON ((", "").strip()
        points_str = clean.split(",")
        lons, lats = [], []
        for p in points_str:
            parts = p.strip().split()
            if len(parts) >= 2:
                lons.append(float(parts[0]))
                lats.append(float(parts[1]))
        if not lons or not lats:
            return None
        return (min(lons), min(lats), max(lons), max(lats))
    except Exception:
        return None


def _calculate_severity(risk_score: float, dist_km: Optional[float] = None) -> str:
    """Calculate alert severity level: CRITICAL, WARNING, or ADVISORY."""
    if dist_km is not None and dist_km <= ICEBERG_CRITICAL_DIST_KM:
        return "CRITICAL"
    if risk_score >= SEVERITY_CRITICAL_RISK:
        return "CRITICAL"
    if risk_score >= SEVERITY_WARNING_RISK or (dist_km is not None and dist_km <= ICEBERG_CORRIDOR_KM):
        return "WARNING"
    return "ADVISORY"


def evaluate_voyage_hazards(voyage: Voyage, waypoints: List[Waypoint], db: Session) -> List[Dict]:
    """
    Core Intelligent Alert Engine evaluation algorithm.
    Consolidates contiguous waypoint hazards into meaningful regional sector alerts
    and deduplicates by hazard ID to prevent duplicate spamming.
    """
    if not waypoints:
        logger.info(f"[ALERT_ENGINE] Voyage {voyage.voyage_id}: No route waypoints to evaluate.")
        return []

    logger.info(f"[ALERT_ENGINE] Voyage {voyage.voyage_id}: Evaluating route hazards across {len(waypoints)} waypoints...")
    final_alerts: List[Dict] = []

    # Parse waypoint coordinates
    wp_coords = []
    for wp in waypoints:
        parsed = _parse_point_wkt(wp.position)
        if parsed:
            wp_coords.append((wp, parsed[1], parsed[0]))  # (Waypoint, lat, lon)

    if not wp_coords:
        return []

    # -----------------------------------------------------------------
    # 1. Model 1 — Sea Ice Hazard Sector Consolidation
    # -----------------------------------------------------------------
    try:
        sic_forecasts = db.query(SeaIceForecast).filter(
            SeaIceForecast.horizon_day == 1,
            SeaIceForecast.ice_concentration >= HIGH_SIC_THRESHOLD
        ).limit(100).all()

        high_sic_wps = []
        max_sic = 0.0

        for sic_item in sic_forecasts:
            bbox = _parse_polygon_bbox(sic_item.grid_cell)
            if not bbox:
                continue

            min_lon, min_lat, max_lon, max_lat = bbox
            for wp_obj, wp_lat, wp_lon in wp_coords:
                if (min_lat <= wp_lat <= max_lat) and (min_lon <= wp_lon <= max_lon):
                    high_sic_wps.append((wp_obj, wp_lat, wp_lon, sic_item.ice_concentration))
                    if sic_item.ice_concentration > max_sic:
                        max_sic = sic_item.ice_concentration

        if high_sic_wps:
            # Consolidate all affected waypoints into 1 Sector Alert
            high_sic_wps.sort(key=lambda x: x[0].sequence_no)
            first_wp = high_sic_wps[0]
            last_wp = high_sic_wps[-1]
            avg_lat = sum(x[1] for x in high_sic_wps) / len(high_sic_wps)
            avg_lon = sum(x[2] for x in high_sic_wps) / len(high_sic_wps)
            risk_val = min(1.0, max_sic / 100.0)
            severity = _calculate_severity(risk_val, 0.0)

            seq_desc = f"Waypoints #{first_wp[0].sequence_no}–#{last_wp[0].sequence_no}" if first_wp[0].sequence_no != last_wp[0].sequence_no else f"Waypoint #{first_wp[0].sequence_no}"

            final_alerts.append({
                "alert_type": "HIGH_SEA_ICE",
                "severity": severity,
                "title": f"High Sea-Ice Sector Hazard ({max_sic:.0f}% SIC)",
                "message": f"Critical pack-ice concentration ({max_sic:.1f}%) affecting route sector at {seq_desc} (Lat {avg_lat:.2f}°, Lon {avg_lon:.2f}°).",
                "latitude": round(avg_lat, 4),
                "longitude": round(avg_lon, 4),
                "route_waypoint": first_wp[0].sequence_no,
                "risk_score": round(risk_val, 2),
                "source_model": "model1",
                "distance_from_route_km": 0.0,
                "forecast_time": None,
            })
            logger.info(f"[ALERT_ENGINE] Model 1 sea-ice sector consolidated {len(high_sic_wps)} waypoints into 1 sector alert.")
    except Exception as exc:
        logger.warning(f"[ALERT_ENGINE] Model 1 sea-ice hazard evaluation exception: {exc}")

    # -----------------------------------------------------------------
    # 2. Model 2 — Iceberg Proximity (Grouped by Iceberg ID)
    # -----------------------------------------------------------------
    try:
        iceberg_preds = db.query(IcebergPrediction).filter(IcebergPrediction.horizon_day == 1).all()
        ib_tracks = db.query(IcebergTrack).all()

        # Unique icebergs dictionary
        unique_ib: Dict[str, Tuple[float, float]] = {}

        for tr in ib_tracks:
            pt = _parse_point_wkt(tr.position)
            if pt:
                unique_ib[tr.iceberg_id] = (pt[1], pt[0])

        for pred in iceberg_preds:
            pt = _parse_point_wkt(pred.predicted_position)
            if pt and pred.iceberg_id not in unique_ib:
                unique_ib[pred.iceberg_id] = (pt[1], pt[0])

        for ib_id, (ib_lat, ib_lon) in unique_ib.items():
            min_dist = float('inf')
            closest_wp = None

            for wp_obj, wp_lat, wp_lon in wp_coords:
                d = haversine_km(ib_lat, ib_lon, wp_lat, wp_lon)
                if d < min_dist:
                    min_dist = d
                    closest_wp = wp_obj

            if min_dist <= ICEBERG_CORRIDOR_KM and closest_wp is not None:
                risk_val = min(1.0, max(0.4, (ICEBERG_CORRIDOR_KM - min_dist + 5.0) / ICEBERG_CORRIDOR_KM))
                severity = _calculate_severity(risk_val, min_dist)
                final_alerts.append({
                    "alert_type": "ICEBERG_PROXIMITY",
                    "severity": severity,
                    "title": f"Iceberg Proximity Hazard ({ib_id})",
                    "message": f"Drifting Iceberg {ib_id} inside safety corridor ({min_dist:.1f} km from Waypoint #{closest_wp.sequence_no}).",
                    "latitude": round(ib_lat, 4),
                    "longitude": round(ib_lon, 4),
                    "route_waypoint": closest_wp.sequence_no,
                    "risk_score": round(risk_val, 2),
                    "source_model": "model2",
                    "distance_from_route_km": round(min_dist, 1),
                    "forecast_time": None,
                })
                logger.info(f"[ALERT_ENGINE] Model 2 generated 1 proximity alert for Iceberg {ib_id}.")
    except Exception as exc:
        logger.warning(f"[ALERT_ENGINE] Model 2 iceberg proximity evaluation exception: {exc}")

    # -----------------------------------------------------------------
    # 3. Model 3 — Route Segment Risk Consolidation
    # -----------------------------------------------------------------
    try:
        high_risk_legs = []
        for wp_obj, wp_lat, wp_lon in wp_coords:
            risk_score = wp_obj.segment_risk_score or 0.0
            if risk_score >= ROUTE_RISK_THRESHOLD:
                high_risk_legs.append((wp_obj, wp_lat, wp_lon, risk_score))

        if high_risk_legs:
            high_risk_legs.sort(key=lambda x: x[0].sequence_no)
            first_wp = high_risk_legs[0]
            last_wp = high_risk_legs[-1]
            max_score = max(x[3] for x in high_risk_legs)
            avg_lat = sum(x[1] for x in high_risk_legs) / len(high_risk_legs)
            avg_lon = sum(x[2] for x in high_risk_legs) / len(high_risk_legs)
            severity = _calculate_severity(max_score)

            seq_desc = f"Waypoints #{first_wp[0].sequence_no}–#{last_wp[0].sequence_no}" if first_wp[0].sequence_no != last_wp[0].sequence_no else f"Waypoint #{first_wp[0].sequence_no}"

            final_alerts.append({
                "alert_type": "ROUTE_RISK",
                "severity": severity,
                "title": f"Elevated Route Risk Sector ({max_score:.2f})",
                "message": f"Elevated route segment risk score ({max_score:.2f}) evaluated for transit sector at {seq_desc}.",
                "latitude": round(avg_lat, 4),
                "longitude": round(avg_lon, 4),
                "route_waypoint": first_wp[0].sequence_no,
                "risk_score": round(max_score, 2),
                "source_model": "model3",
                "distance_from_route_km": 0.0,
                "forecast_time": first_wp[0].eta,
            })
            logger.info(f"[ALERT_ENGINE] Model 3 consolidated {len(high_risk_legs)} high risk legs into 1 segment risk alert.")
    except Exception as exc:
        logger.warning(f"[ALERT_ENGINE] Model 3 route risk evaluation exception: {exc}")

    logger.info(f"[ALERT_ENGINE] Intelligent sector evaluation produced {len(final_alerts)} clean, actionable alerts.")
    return final_alerts


def run_alert_pipeline(voyage_id: str, db: Session) -> List[Alert]:
    """
    Main Alert Engine orchestration routine.
    Evaluates hazards, updates DB alert states (ACTIVE, ACKNOWLEDGED, RESOLVED), and saves records.
    """
    voyage = db.query(Voyage).filter(Voyage.voyage_id == voyage_id).first()
    if not voyage:
        logger.error(f"[ALERT_ENGINE] Voyage {voyage_id} not found.")
        return []

    waypoints = db.query(Waypoint).filter(
        Waypoint.voyage_id == voyage_id
    ).order_by(Waypoint.sequence_no.asc()).all()

    # Generate current hazard alerts
    evaluated_hazards = evaluate_voyage_hazards(voyage, waypoints, db)

    # Fetch existing DB alerts for this voyage
    existing_db_alerts = db.query(Alert).filter(Alert.voyage_id == voyage_id).all()
    existing_map = {
        (a.alert_type, a.source_model, a.route_waypoint): a
        for a in existing_db_alerts
    }

    active_keys = set()
    result_records: List[Alert] = []
    now = datetime.now(timezone.utc)

    for haz in evaluated_hazards:
        key = (haz["alert_type"], haz["source_model"], haz["route_waypoint"])
        active_keys.add(key)

        if key in existing_map:
            # Update existing alert record
            db_alert = existing_map[key]
            db_alert.severity = haz["severity"]
            db_alert.message = haz["message"]
            db_alert.risk_score = haz["risk_score"]
            db_alert.distance_from_route_km = haz["distance_from_route_km"]

            if db_alert.status == "RESOLVED":
                db_alert.status = "ACTIVE"
                db_alert.resolved_at = None

            result_records.append(db_alert)
        else:
            # Insert new alert record
            new_alert = Alert(
                voyage_id=voyage.voyage_id,
                alert_type=haz["alert_type"],
                severity=haz["severity"],
                title=haz["title"],
                message=haz["message"],
                status="ACTIVE",
                latitude=haz["latitude"],
                longitude=haz["longitude"],
                route_waypoint=haz["route_waypoint"],
                risk_score=haz["risk_score"],
                source_model=haz["source_model"],
                forecast_time=haz["forecast_time"],
                distance_from_route_km=haz["distance_from_route_km"],
                triggered_at=now,
                acknowledged=False,
            )
            db.add(new_alert)
            result_records.append(new_alert)

    # Resolve old alerts whose hazard is no longer active
    for key, db_alert in existing_map.items():
        if key not in active_keys and db_alert.status != "RESOLVED":
            db_alert.status = "RESOLVED"
            db_alert.resolved_at = now
            logger.info(f"[ALERT_ENGINE] Alert {db_alert.alert_id} hazard cleared → status set to RESOLVED.")

    try:
        db.commit()
        logger.info(f"[ALERT_ENGINE] Successfully persisted {len(result_records)} active/acknowledged alerts to PostgreSQL.")
    except Exception as exc:
        db.rollback()
        logger.error(f"[ALERT_ENGINE] Failed to commit alerts to database: {exc}")

    return result_records
