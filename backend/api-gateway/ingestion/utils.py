def compute_bbox(start_lat: float, start_lon: float, dest_lat: float, dest_lon: float, buffer_km: float = 100.0) -> dict:
    """
    Computes a padded bounding box around the start and destination points.
    1 deg latitude ~ 111 km.
    """
    lat_buffer = buffer_km / 111.0
    lon_buffer = buffer_km / 111.0
    
    min_lat = min(start_lat, dest_lat) - lat_buffer
    max_lat = max(start_lat, dest_lat) + lat_buffer
    min_lon = min(start_lon, dest_lon) - lon_buffer
    max_lon = max(start_lon, dest_lon) + lon_buffer
    
    return {
        "min_lat": min_lat,
        "max_lat": max_lat,
        "min_lon": min_lon,
        "max_lon": max_lon
    }
