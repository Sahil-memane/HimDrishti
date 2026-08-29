import networkx as nx
from math import radians, cos, sin, asin, sqrt

def haversine(lon1, lat1, lon2, lat2):
    """Calculate the great circle distance in kilometers between two points on the earth."""
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a)) 
    r = 6371 # Radius of earth in kilometers
    return c * r

def build_navigation_grid(min_lat, max_lat, min_lon, max_lon, resolution=0.2):
    G = nx.Graph()
    
    # Calculate number of steps
    lat_steps = int((max_lat - min_lat) / resolution) + 1
    lon_steps = int((max_lon - min_lon) / resolution) + 1
    
    # Create nodes
    for i in range(lon_steps):
        for j in range(lat_steps):
            lon = min_lon + i * resolution
            lat = min_lat + j * resolution
            node_id = (i, j)
            G.add_node(node_id, lon=lon, lat=lat)
            
            # Connect 8-neighbors
            neighbors = [
                (i-1, j), (i+1, j), (i, j-1), (i, j+1),
                (i-1, j-1), (i-1, j+1), (i+1, j-1), (i+1, j+1)
            ]
            for ni, nj in neighbors:
                if 0 <= ni < lon_steps and 0 <= nj < lat_steps:
                    n_lon = min_lon + ni * resolution
                    n_lat = min_lat + nj * resolution
                    dist = haversine(lon, lat, n_lon, n_lat)
                    G.add_edge(node_id, (ni, nj), distance_km=dist)
                    
    return G, lon_steps, lat_steps

def get_closest_node(G, lon, lat):
    """Find the node in G that is closest to the given lon/lat."""
    closest_node = None
    min_dist = float('inf')
    for node, data in G.nodes(data=True):
        dist = haversine(lon, lat, data['lon'], data['lat'])
        if dist < min_dist:
            min_dist = dist
            closest_node = node
    return closest_node
