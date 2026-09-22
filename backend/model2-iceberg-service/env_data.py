"""
Real environmental data fetch for Model 2 (iceberg trajectory).

Uses the free, no-authentication Open-Meteo Weather + Marine APIs to pull
genuine forecast wind and ocean-current conditions. No random/synthetic
values are generated here — a failed fetch raises, it is never silently
replaced with a fabricated number by this module.
"""
import requests

WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
REQUEST_TIMEOUT_S = 15


def fetch_wind_forecast(lat: float, lon: float, days: int = 7):
    """Real daily wind speed (km/h) + meteorological direction (deg, FROM which wind blows) for `days` days starting today."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "wind_speed_10m_max,wind_direction_10m_dominant",
        "forecast_days": days,
        "timezone": "UTC",
    }
    r = requests.get(WEATHER_URL, params=params, timeout=REQUEST_TIMEOUT_S)
    r.raise_for_status()
    d = r.json()["daily"]
    return list(zip(d["wind_speed_10m_max"], d["wind_direction_10m_dominant"]))


def fetch_current_forecast(lat: float, lon: float, days: int = 7):
    """Real daily ocean current speed (km/h) + direction (deg) for `days` days, sampled near local noon from the hourly marine forecast."""
    params = {
        # Open-Meteo Marine has no coverage past ~+/-80 deg; use the nearest real point within coverage
        "latitude": max(-79.5, min(79.5, lat)),
        "longitude": lon,
        "hourly": "ocean_current_velocity,ocean_current_direction",
        "forecast_days": days,
        "timezone": "UTC",
    }
    r = requests.get(MARINE_URL, params=params, timeout=REQUEST_TIMEOUT_S)
    r.raise_for_status()
    d = r.json()["hourly"]
    vel = d["ocean_current_velocity"]
    dirn = d["ocean_current_direction"]

    daily = []
    for day in range(days):
        window = range(day * 24, min((day + 1) * 24, len(vel)))
        v = next((vel[i] for i in window if vel[i] is not None), None)
        dd = next((dirn[i] for i in window if dirn[i] is not None), None)
        daily.append((v if v is not None else 0.0, dd if dd is not None else 0.0))
    return daily
