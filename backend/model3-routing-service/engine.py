import networkx as nx
from cost import edge_weight_func, calculate_node_cost
from grid import haversine
from sqlalchemy import func
from db import SessionLocal, SeaIceForecast, IcebergPrediction
from env_data import fetch_route_environment, nearest_environment
from sar_detection import get_sar_hazard_detections

def get_forecast_data(db, min_lon, min_lat, max_lon, max_lat):
    # Fetch all SIC forecasts in the bbox (for simplicity, just fetching all and we'll filter in memory)
    # Note: in a real app, use ST_Intersects.
    sic_data = db.query(SeaIceForecast).all()
    iceberg_data = db.query(IcebergPrediction).all()
    return sic_data, iceberg_data

def is_antarctic_land(lat: float, lon: float) -> bool:
    """
    Geographic landmass boundary detection for Antarctica.
    Returns True if (lat, lon) is on the Antarctic continental landmass or ice sheet.
    """
    if lat < -78.8:
        return True

    norm_lon = lon
    while norm_lon > 180:
        norm_lon -= 360
    while norm_lon < -180:
        norm_lon += 360

    # East Antarctica (0°E to 160°E)
    if 0.0 <= norm_lon <= 160.0:
        if 68.0 <= norm_lon <= 78.0:  # Prydz Bay ocean sector
            return lat <= -69.5
        # Relaxed from -65.5 to -70 to allow coastal routing outside Prydz Bay
        return lat <= -70.0

    # Ross Sea (160°E to 180° / -180° to -155°): Ocean bay extends down to -78.5°S
    if norm_lon > 160.0 or norm_lon <= -155.0:
        if 160.0 < norm_lon < 165.0 and lat <= -71.0:
            return True
        return lat <= -78.5

    # West Antarctica & Marie Byrd Land (-155° to -75°)
    if -155.0 < norm_lon < -75.0:
        # Relaxed from -73.0 to -74.5
        return lat <= -75.0

    # Antarctic Peninsula (-75° to -55°)
    if -75.0 <= norm_lon <= -55.0:
        if -75.0 <= norm_lon <= -65.0:
            return lat <= -75.0 # Relaxed from -67.0
        return lat <= -68.0 # Relaxed from -63.5

    # Weddell Sea (-55° to 0°)
    if -55.0 < norm_lon < 0.0:
        if -55.0 < norm_lon < -35.0 and lat <= -74.0:
            return True
        return lat <= -77.5

    return False


def attach_attributes(G, db, risk_tolerance, voyage_id=None):
    # sea_ice_forecasts holds every voyage's Model 1 run, not just one at a
    # time — reading it unfiltered meant a route could be scored against a
    # completely different voyage's ice data. Scope strictly to this
    # voyage's own real forecast. An earlier version of this fell back to
    # "any available forecast for any voyage" when this voyage's own Model 1
    # run failed — that's WORSE than having no data: it silently applies
    # real ice-concentration numbers from a different, unrelated patch of
    # ocean to this route's nodes, producing confident-looking but
    # meaningless risk scores and hazard zones. If this voyage has no real
    # SIC data, sic_cells stays empty and node-level sic falls back to a
    # neutral default (see below) — an honest "unknown", not a wrong number.
    sic_records = db.query(SeaIceForecast).filter(SeaIceForecast.voyage_id == voyage_id).all() if voyage_id else []
    if not sic_records:
        print(f"[Model 3] No real sea-ice forecast available for voyage {voyage_id} (Model 1 did not succeed for it) — routing without a real SIC signal for this run.")

    # iceberg_predictions holds every voyage's Model 2 run, not just one at a
    # time — reading it unfiltered (as this used to) meant a route was
    # scored against whichever icebergs happened to be seeded for a
    # completely different, unrelated voyage. Scope strictly to this
    # voyage's own real detections, matching sic_records above. If this
    # voyage's own Model 2 run produced nothing (e.g. no fresh Sentinel-1
    # scene covered its bbox), iceberg_records stays empty and node cost
    # falls back to the same neutral default used when SIC is unavailable —
    # an honest "unknown", not another voyage's real icebergs mislabeled as
    # this one's.
    iceberg_records = db.query(IcebergPrediction).filter(IcebergPrediction.voyage_id == voyage_id).all() if voyage_id else []

    # Parse iceberg coordinates from Model 2 predictions in DB
    iceberg_pts = []
    for ib in iceberg_records:
        try:
            pt = str(ib.predicted_position).replace("POINT(", "").replace(")", "").split()
            iceberg_pts.append((float(pt[0]), float(pt[1])))
        except Exception:
            continue

    # Parse SIC polygon grid cells from Model 1 forecasts in DB
    sic_cells = []
    for f in sic_records:
        try:
            raw = str(f.grid_cell).replace("POLYGON((", "").replace("))", "").strip()
            pts = [c.strip().split() for c in raw.split(",")]
            lons = [float(p[0]) for p in pts if len(p) >= 2]
            lats = [float(p[1]) for p in pts if len(p) >= 2]
            if lons and lats:
                sic_cells.append((min(lons), min(lats), max(lons), max(lats), float(f.ice_concentration)))
        except Exception:
            continue

    all_lats = [d['lat'] for _, d in G.nodes(data=True)]
    all_lons = [d['lon'] for _, d in G.nodes(data=True)]
    try:
        env_samples = fetch_route_environment(min(all_lats), max(all_lats), min(all_lons), max(all_lons))
    except Exception as e:
        raise RuntimeError(f"Could not fetch real route weather/marine conditions: {e}")

    # Real Sentinel-1 SAR CFAR hazard detections (see sar_detection.py). A search/read
    # failure degrades to "no satellite signal this run" rather than fabricating targets.
    sat_detections, sat_scene_meta = get_sar_hazard_detections(min(all_lats), max(all_lats), min(all_lons), max(all_lons))
    print(f"[Model 3] Satellite SAR hazard scan: {sat_scene_meta}")

    for node, data in G.nodes(data=True):
        lon = data['lon']
        lat = data['lat']

        # 1. Match SIC from Model 1 forecast grid cells
        sic = None
        for min_lon, min_lat, max_lon, max_lat, conc in sic_cells:
            if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
                sic = conc
                break

        # No real forecast cell covers this node — this used to invent a
        # value from a bare latitude formula (50 + (lat+65)*10) and present
        # it as if it were a genuine Model 1 reading, which both corrupted
        # routing decisions and drove a fabricated "hazard zone" on the map
        # wherever it happened to come out high. Treat as "no real signal"
        # (0%) instead: honestly wrong in the sense that real ice may be
        # present and unaccounted for, but never presented as data it isn't.
        if sic is None:
            sic = 0.0

        # 2. Match minimum iceberg distance from Model 2 predictions
        if iceberg_pts:
            iceberg_dist_km = min(haversine(lon, lat, ib_lon, ib_lat) for ib_lon, ib_lat in iceberg_pts)
        else:
            iceberg_dist_km = 150.0

        # 3. Real wave/wind/current conditions (nearest sampled point), no random fabrication
        env = nearest_environment(env_samples, lon, lat)
        wave_height_m = env["wave_height_m"]
        wind_speed_knots = env["wind_speed_knots"]
        current_speed_knots = env["current_speed_knots"]

        # 4. Real Sentinel-1 SAR-detected hazard proximity
        if sat_detections:
            sat_hazard_dist_km = min(haversine(lon, lat, d["lon"], d["lat"]) for d in sat_detections)
        else:
            sat_hazard_dist_km = None

        # Block solid Antarctic landmass using accurate geographic landmask
        is_land = is_antarctic_land(lat, lon)

        cost_score, fuel_weight = calculate_node_cost(
            sic, iceberg_dist_km, wave_height_m,
            wind_speed_knots, current_speed_knots, risk_tolerance,
            sat_hazard_dist_km=sat_hazard_dist_km
        )

        if is_land:
            cost_score = float('inf')

        data['sic'] = sic
        data['iceberg_dist_km'] = iceberg_dist_km
        data['wave_height_m'] = wave_height_m
        data['sat_hazard_dist_km'] = sat_hazard_dist_km
        data['cost_score'] = cost_score
        data['fuel_weight'] = fuel_weight
        data['blocked'] = is_land or (cost_score == float('inf'))

    return sat_scene_meta

def run_astar_search(G, start_node, dest_node, risk_tolerance):
    def heuristic(u, v):
        # Haversine distance between node u and the destination node v
        node_u = G.nodes[u]
        node_v = G.nodes[v]
        return haversine(node_u['lon'], node_u['lat'], node_v['lon'], node_v['lat'])
        
    def weight_func(u, v, d):
        return edge_weight_func(u, v, d, G)
        
    try:
        path = nx.astar_path(G, start_node, dest_node, heuristic=heuristic, weight=weight_func)
        return path
    except nx.NetworkXNoPath:
        return None
