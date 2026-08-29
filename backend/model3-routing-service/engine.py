import networkx as nx
from cost import edge_weight_func, calculate_node_cost
from grid import haversine
from sqlalchemy import func
from db import SessionLocal, SeaIceForecast, IcebergPrediction
import random

def get_forecast_data(db, min_lon, min_lat, max_lon, max_lat):
    # Fetch all SIC forecasts in the bbox (for simplicity, just fetching all and we'll filter in memory)
    # Note: in a real app, use ST_Intersects.
    sic_data = db.query(SeaIceForecast).all()
    iceberg_data = db.query(IcebergPrediction).all()
    return sic_data, iceberg_data

def get_sic_for_node(sic_data, lon, lat, horizon_day):
    # Very crude mock: return random SIC or something based on data
    # In a real app we'd use Shapely to check `ST_Contains` or find the nearest.
    # For the hackathon, we'll just return a random value unless we have a matching cell.
    # We will just parse the WKT from DB. Since geoalchemy returns WKB, we should fetch ST_AsText.
    pass

def attach_attributes(G, db, risk_tolerance):
    # For prototype simplicity, we will mock the environmental data and just assign them to nodes.
    # A real implementation would parse the WKB from SIC and Icebergs.
    
    # We will just iterate all nodes and assign random but plausible data.
    # To test the hard constraints, we'll intentionally make a "blocked" region.
    for node, data in G.nodes(data=True):
        lon = data['lon']
        lat = data['lat']
        
        # Mocking SIC: higher in the south.
        sic = 50.0 + (lat + 65) * 10 
        sic = max(0, min(100, sic))
        
        # Make a blocked ice patch for testing
        if -71 < lat < -69 and 42 < lon < 46:
            sic = 95.0
            
        # Mocking Iceberg distance
        iceberg_dist_km = 150.0
        # Make a dangerous iceberg location
        if -73 < lat < -72 and 48 < lon < 50:
            iceberg_dist_km = 10.0
            
        wave_height_m = random.uniform(1.0, 4.0)
        wind_speed_knots = random.uniform(10.0, 30.0)
        current_speed_knots = random.uniform(0.5, 2.0)
        
        cost_score, fuel_weight = calculate_node_cost(
            sic, iceberg_dist_km, wave_height_m, 
            wind_speed_knots, current_speed_knots, risk_tolerance
        )
        
        data['sic'] = sic
        data['iceberg_dist_km'] = iceberg_dist_km
        data['wave_height_m'] = wave_height_m
        data['cost_score'] = cost_score
        data['fuel_weight'] = fuel_weight
        data['blocked'] = (cost_score == float('inf'))

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
