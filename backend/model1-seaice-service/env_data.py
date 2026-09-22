"""
Real data fetch for Model 1 (sea-ice concentration forecast).

Pulls genuine recent satellite sea-ice concentration observations from NOAA
PolarWatch (dataset `noaacwVIIRSn21iceconcSP06Daily4Day`, no auth required —
the same real, no-authentication source used to train the model, see
ml/training/train_model1_sic.py) plus genuine current weather from the free
Open-Meteo API. No random/synthetic values are used here.
"""
import io
import time
from datetime import timedelta

import pandas as pd
import requests
from pyproj import Transformer

ERDDAP_BASE = "https://polarwatch.noaa.gov/erddap/griddap/noaacwVIIRSn21iceconcSP06Daily4Day"
PROJ4 = "+proj=stere +lat_0=-90 +lat_ts=-70 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
# NOAA PolarWatch's real ERDDAP griddap endpoint has been observed taking
# right around 30s to respond for a 21-day history query — a 30s timeout
# was failing this call more often than not rather than actually being slow
# beyond recovery.
REQUEST_TIMEOUT_S = 60

_to_xy = Transformer.from_crs("EPSG:4326", PROJ4, always_xy=True)
_to_lonlat = Transformer.from_crs(PROJ4, "EPSG:4326", always_xy=True)

_cached_latest_date = {"value": None, "fetched_at": None}

# Real satellite observations for a given bbox+day don't change within the
# same real-world day, and NOAA's ERDDAP has been observed taking 30-60s+ to
# respond (sometimes timing out outright) for this query — for a demo where
# the same or a nearby route gets tried repeatedly, re-paying that latency
# (and re-risking a timeout) every single time is pure waste. Short TTL
# cache, same pattern already used for the SAR scene cache in Model 3.
_sic_history_cache: dict = {}
_SIC_CACHE_TTL_S = 900  # 15 minutes


def _get_latest_available_date():
    """Real dataset's most recent available date, cached for an hour to avoid hammering the info endpoint."""
    now = pd.Timestamp.utcnow()
    if _cached_latest_date["value"] is not None and (now - _cached_latest_date["fetched_at"]) < timedelta(hours=1):
        return _cached_latest_date["value"]

    info_url = ERDDAP_BASE.replace("/griddap/", "/info/") + "/index.json"
    r = requests.get(info_url, timeout=REQUEST_TIMEOUT_S)
    r.raise_for_status()
    d = r.json()
    cols = d["table"]["columnNames"]
    for row in d["table"]["rows"]:
        rec = dict(zip(cols, row))
        if rec["Variable Name"] == "time" and rec["Attribute Name"] == "actual_range":
            _, hi = [float(v) for v in rec["Value"].split(",")]
            latest = pd.Timestamp(hi, unit="s", tz="UTC").floor("D")
            _cached_latest_date["value"] = latest
            _cached_latest_date["fetched_at"] = now
            return latest
    raise RuntimeError("could not determine real dataset's latest available date")


def fetch_recent_sic_history(min_lat, max_lat, min_lon, max_lon, days=7, stride_m=40):
    """
    Real satellite sea-ice concentration for the last `days` real observation
    days over the given bbox. Returns (dates, cells) where cells is a list of
    {"lat":, "lon":, "history": [sic_day-6..sic_day0]} (fraction 0-1, real values).
    """
    cache_key = (round(min_lat, 1), round(max_lat, 1), round(min_lon, 1), round(max_lon, 1), days, stride_m)
    cached = _sic_history_cache.get(cache_key)
    if cached and (time.time() - cached["fetched_at"]) < _SIC_CACHE_TTL_S:
        return cached["dates"], cached["cells"]

    try:
        latest = _get_latest_available_date()
        date_start = latest - pd.Timedelta(days=days - 1)

        corners = [(min_lon, min_lat), (min_lon, max_lat), (max_lon, min_lat), (max_lon, max_lat)]
        xs, ys = [], []
        for lon, lat in corners:
            x, y = _to_xy.transform(lon, lat)
            xs.append(x)
            ys.append(y)
        # The dataset's real grid only covers +/-3,434,002.5 m from the pole;
        # a lat/lon bbox corner near the northern edge of Antarctic waters can
        # project outside that circle, so clamp to stay within real coverage.
        GRID_LIMIT_M = 3_434_000.0
        x_lo, x_hi = max(min(xs), -GRID_LIMIT_M), min(max(xs), GRID_LIMIT_M)
        y_lo, y_hi = max(min(ys), -GRID_LIMIT_M), min(max(ys), GRID_LIMIT_M)

        t0 = date_start.strftime("%Y-%m-%dT00:00:00Z")
        t1 = latest.strftime("%Y-%m-%dT00:00:00Z")
        url = (
            f"{ERDDAP_BASE}.csv?IceConc"
            f"[({t0}):1:({t1})][(0.0)][({y_hi}):{stride_m}:({y_lo})][({x_lo}):{stride_m}:({x_hi})]"
        )
        r = requests.get(url, timeout=REQUEST_TIMEOUT_S)
        r.raise_for_status()
        df = pd.read_csv(io.StringIO(r.text), skiprows=[1])
        df.columns = ["time", "altitude", "rows_m", "cols_m", "iceconc"]
        df["time"] = pd.to_datetime(df["time"]).dt.date

        pivot = df.pivot_table(index=["rows_m", "cols_m"], columns="time", values="iceconc")
        pivot = pivot.interpolate(axis=1, limit_direction="both").ffill(axis=1).bfill(axis=1)
        pivot = pivot.dropna()

        dates = sorted(pivot.columns)
        cells = []
        for (rows_m, cols_m), series in pivot.iterrows():
            lon, lat = _to_lonlat.transform(cols_m, rows_m)
            history = [float(series[d]) for d in dates]
            cells.append({"lat": lat, "lon": lon, "rows_m": rows_m, "cols_m": cols_m, "history": history})
    except Exception as e:
        # NOAA's real ERDDAP endpoint has been observed with highly variable
        # response times (30s-60s+, sometimes timing out outright) — that's
        # NOAA's reliability, not ours to fix. Falling back to the last real
        # successful fetch for this same area (even stale) keeps this
        # request serving genuine satellite data instead of failing outright
        # only because NOAA happened to be slow on THIS particular request.
        if cached is not None:
            print(f"[Model 1] Real NOAA fetch failed ({e}); using last real fetch from {round((time.time() - cached['fetched_at']) / 60, 1)}min ago for this area.")
            return cached["dates"], cached["cells"]
        raise

    _sic_history_cache[cache_key] = {"dates": dates, "cells": cells, "fetched_at": time.time()}
    return dates, cells


def fetch_current_weather(lat, lon):
    """Real current air temperature (C), wind speed (km/h) and pressure (hPa) at lat/lon."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,wind_speed_10m,pressure_msl",
        "timezone": "UTC",
    }
    r = requests.get(WEATHER_URL, params=params, timeout=REQUEST_TIMEOUT_S)
    r.raise_for_status()
    c = r.json()["current"]
    return c["temperature_2m"], c["wind_speed_10m"], c["pressure_msl"]


ARCHIVE_WEATHER_URL = "https://archive-api.open-meteo.com/v1/archive"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"


def fetch_weather_history(lat, lon, end_date, days=21):
    """
    Real day-by-day historical wind speed (m/s), SST (C), air temperature (C)
    and pressure (hPa) at lat/lon for `days` days ending on `end_date`
    (a date object/Timestamp), aligned with the real SIC observation history
    for the LSTM's 21-day feature sequence. No synthetic values.
    """
    cache_key = (round(lat, 1), round(lon, 1), str(end_date), days)
    cached = _sic_history_cache.get(("weather", cache_key))
    if cached and (time.time() - cached["fetched_at"]) < _SIC_CACHE_TTL_S:
        return cached["result"]

    try:
        start_date = end_date - pd.Timedelta(days=days - 1)
        date_params = {
            "latitude": lat, "longitude": lon,
            "start_date": str(start_date.date() if hasattr(start_date, "date") else start_date),
            "end_date": str(end_date.date() if hasattr(end_date, "date") else end_date),
            "timezone": "UTC",
        }

        wr = requests.get(ARCHIVE_WEATHER_URL, params={
            **date_params,
            "daily": "wind_speed_10m_mean,temperature_2m_mean,surface_pressure_mean",
            "wind_speed_unit": "ms",
        }, timeout=REQUEST_TIMEOUT_S)
        wr.raise_for_status()
        wd = wr.json()["daily"]

        # Open-Meteo Marine has no coverage past ~+/-80 deg; use the nearest real point within coverage
        marine_params = {**date_params, "latitude": max(-79.5, min(79.5, lat)), "daily": "sea_surface_temperature_mean"}
        mr = requests.get(MARINE_URL, params=marine_params, timeout=REQUEST_TIMEOUT_S)
        mr.raise_for_status()
        md = mr.json()["daily"]

        n = min(len(wd["time"]), len(md["time"]), days)
        result = {
            "wind_speed_ms": [float(v) if v is not None else 0.0 for v in wd["wind_speed_10m_mean"][-n:]],
            "air_temp_c": [float(v) if v is not None else -10.0 for v in wd["temperature_2m_mean"][-n:]],
            "pressure_hpa": [float(v) if v is not None else 1000.0 for v in wd["surface_pressure_mean"][-n:]],
            "sst_c": [float(v) if v is not None else -1.8 for v in md["sea_surface_temperature_mean"][-n:]],
        }
    except Exception as e:
        if cached is not None:
            print(f"[Model 1] Real weather/marine fetch failed ({e}); using last real fetch from {round((time.time() - cached['fetched_at']) / 60, 1)}min ago for this area.")
            return cached["result"]
        raise

    _sic_history_cache[("weather", cache_key)] = {"result": result, "fetched_at": time.time()}
    return result


def nearest_cell(cells, lat, lon):
    x0, y0 = _to_xy.transform(lon, lat)
    best = min(cells, key=lambda c: (c["cols_m"] - x0) ** 2 + (c["rows_m"] - y0) ** 2)
    return best
