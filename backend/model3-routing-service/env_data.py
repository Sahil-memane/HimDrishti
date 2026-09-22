"""
Real environmental data fetch for Model 3 routing risk factors.

Replaces the previous random.uniform() "risk factor" placeholders with a
genuine batched fetch of current wave height, wind speed and ocean current
speed from the free, no-authentication Open-Meteo Weather + Marine APIs,
sampled over a coarse grid spanning the route's bounding box and assigned
to each navigation-grid node by nearest neighbor.
"""
import requests
from grid import haversine

WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
REQUEST_TIMEOUT_S = 20
KMH_TO_KNOTS = 0.539957

MAX_SAMPLE_POINTS_PER_AXIS = 5  # keeps each batched call small (<=25 locations)
MARINE_COVERAGE_LAT_LIMIT = 79.5  # Open-Meteo Marine has no data past ~+/-80 deg; clamp to the nearest real point within coverage


def _sample_grid(min_lat, max_lat, min_lon, max_lon):
    lat_n = max(2, min(MAX_SAMPLE_POINTS_PER_AXIS, int((max_lat - min_lat) / 1.0) + 2))
    lon_n = max(2, min(MAX_SAMPLE_POINTS_PER_AXIS, int((max_lon - min_lon) / 1.0) + 2))
    lats = [min_lat + i * (max_lat - min_lat) / (lat_n - 1) for i in range(lat_n)] if lat_n > 1 else [min_lat]
    lons = [min_lon + j * (max_lon - min_lon) / (lon_n - 1) for j in range(lon_n)] if lon_n > 1 else [min_lon]
    lats = [max(-MARINE_COVERAGE_LAT_LIMIT, min(MARINE_COVERAGE_LAT_LIMIT, lat)) for lat in lats]
    points = {(lat, lon) for lat in lats for lon in lons}  # dedupe: clamping can collapse distinct rows onto one
    return sorted(points)


def fetch_route_environment(min_lat, max_lat, min_lon, max_lon):
    """
    Real current conditions (wave height m, wind speed knots, current speed
    knots) sampled across the route's bounding box.

    Returns a list of dicts: [{"lat":, "lon":, "wave_height_m":, "wind_speed_knots":, "current_speed_knots":}, ...]
    """
    points = _sample_grid(min_lat, max_lat, min_lon, max_lon)
    lat_str = ",".join(str(p[0]) for p in points)
    lon_str = ",".join(str(p[1]) for p in points)

    marine_params = {
        "latitude": lat_str,
        "longitude": lon_str,
        "hourly": "wave_height,ocean_current_velocity",
        "forecast_days": 1,
        "timezone": "UTC",
    }
    weather_params = {
        "latitude": lat_str,
        "longitude": lon_str,
        "hourly": "wind_speed_10m",
        "forecast_days": 1,
        "timezone": "UTC",
    }

    marine_r = requests.get(MARINE_URL, params=marine_params, timeout=REQUEST_TIMEOUT_S)
    marine_r.raise_for_status()
    weather_r = requests.get(WEATHER_URL, params=weather_params, timeout=REQUEST_TIMEOUT_S)
    weather_r.raise_for_status()

    marine_data = marine_r.json()
    weather_data = weather_r.json()
    # A single-location request returns a dict, not a list — normalize.
    if isinstance(marine_data, dict):
        marine_data = [marine_data]
    if isinstance(weather_data, dict):
        weather_data = [weather_data]

    results = []
    for i, (lat, lon) in enumerate(points):
        m = marine_data[i]["hourly"]
        w = weather_data[i]["hourly"]
        wave = next((v for v in m.get("wave_height", []) if v is not None), 0.5)
        current_kmh = next((v for v in m.get("ocean_current_velocity", []) if v is not None), 1.0)
        wind_kmh = next((v for v in w.get("wind_speed_10m", []) if v is not None), 15.0)
        results.append({
            "lat": lat,
            "lon": lon,
            "wave_height_m": float(wave),
            "wind_speed_knots": float(wind_kmh) * KMH_TO_KNOTS,
            "current_speed_knots": float(current_kmh) * KMH_TO_KNOTS,
        })
    return results


def nearest_environment(env_samples, lon, lat):
    """Assign the nearest sampled real environment reading to a given (lon, lat) node."""
    best = min(env_samples, key=lambda e: haversine(lon, lat, e["lon"], e["lat"]))
    return best
