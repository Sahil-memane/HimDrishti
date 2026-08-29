def calculate_node_cost(sic, iceberg_dist_km, wave_height_m, wind_speed_knots, current_speed_knots, risk_tolerance):
    # Hard constraints
    if sic > 90 or iceberg_dist_km < 20 or wave_height_m > 5:
        return float('inf'), 0
        
    # Iceberg risk banding
    if iceberg_dist_km <= 100:
        iceberg_risk = (100 - iceberg_dist_km) / 80.0
    else:
        iceberg_risk = 0.0
        
    ice_risk = sic / 100.0
    wave_risk = wave_height_m / 5.0
    wind_risk = min(wind_speed_knots / 50.0, 1.0)
    current_risk = min(current_speed_knots / 5.0, 1.0)
    
    # Base weights
    w_ice = 0.40
    w_iceberg = 0.30
    w_wave = 0.15
    w_wind = 0.05
    w_current = 0.05
    w_fuel = 0.05
    
    # Apply tolerance scaling
    if risk_tolerance == "Low":
        w_ice *= 1.5
        w_iceberg *= 1.5
        w_fuel *= 0.5
    elif risk_tolerance == "High":
        w_fuel *= 1.5
        w_ice *= 0.75
        w_iceberg *= 0.75
        
    # Normalize weights
    total_w = w_ice + w_iceberg + w_wave + w_wind + w_current + w_fuel
    
    cost_score = (
        w_ice * ice_risk +
        w_iceberg * iceberg_risk +
        w_wave * wave_risk +
        w_wind * wind_risk +
        w_current * current_risk
    ) / total_w
    
    return cost_score, w_fuel / total_w

def edge_weight_func(u, v, d, G):
    node_v = G.nodes[v]
    if node_v.get('blocked', False):
        return float('inf')
        
    cost_score = node_v.get('cost_score', 0)
    fuel_weight = node_v.get('fuel_weight', 0)
    dist_km = d['distance_km']
    
    # Max distance per cell is roughly 30km (diagonal of 0.2 deg at equator is ~31km)
    fuel_risk = min(dist_km / 31.0, 1.0)
    
    total_segment_cost = cost_score + (fuel_weight * fuel_risk)
    
    # A* minimizes accumulated edge weights. We use cost * distance.
    return total_segment_cost * dist_km
