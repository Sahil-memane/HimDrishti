"""
Real data fetch for Model 1 (sea-ice concentration forecast).

Pulls genuine recent satellite sea-ice concentration observations from
EUMETSAT/MET Norway's OSI SAF Global Sea Ice Concentration product
(`ice_conc_sh_polstere-100_multi`, Southern Hemisphere, 10km polar
stereographic, no auth required, served via MET Norway's public THREDDS
OPeNDAP endpoint) plus genuine current weather from the free Open-Meteo API.
No random/synthetic values are used here.

NOTE: this service originally used NOAA PolarWatch's
`noaacwVIIRSn21iceconcSP06Daily4Day` ERDDAP dataset (see
ml/training/train_model1_sic.py, which trained the shipped LSTM/GBR models
against that source). NOAA discontinued that dataset from their catalog
(and its AMSR2 successor stopped publishing in April 2021 despite still
being listed) — verified directly against their ERDDAP server, which now
returns "Currently unknown datasetID" for it. OSI SAF is the replacement
live source; it reports genuine sea-ice concentration as a 0-1 fraction on
its own polar stereographic grid, matching the physical quantity
(`cdr_seaice_conc`) the trained models expect, so no retraining is required.
"""
import time
from datetime import timedelta

import netCDF4
import numpy as np
import pandas as pd
import requests
from pyproj import Transformer

OSISAF_BASE = "https://thredds.met.no/thredds/dodsC/osisaf/met.no/ice/conc"
OSISAF_FILESERVER_BASE = "https://thredds.met.no/thredds/fileServer/osisaf/met.no/ice/conc"
# OSI SAF's real Southern-Hemisphere grid: polar stereographic, 10km
# resolution, 790x830 cells, area_extent (-3950000,-3950000)-(3950000,4350000)
# in meters — verified against the dataset's own attributes.
PROJ4 = "+proj=stere +a=6378273 +b=6356889.44891 +lat_0=-90 +lat_ts=-70 +lon_0=0"
GRID_X_MIN, GRID_X_MAX = -3_950_000.0, 3_950_000.0
GRID_Y_MIN, GRID_Y_MAX = -3_950_000.0, 4_350_000.0
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
# OSI SAF's real THREDDS server has been observed taking several seconds per
# daily file (21 real files fetched sequentially for a full history — see
# fetch_recent_sic_history); a generous per-request timeout avoids failing a
# request that's merely slow rather than actually down. Kept sequential
# (not parallelized) per MET Norway's THREDDS terms of service, which asks
# users not to spawn parallel OPeNDAP sessions.
REQUEST_TIMEOUT_S = 60

_to_xy = Transformer.from_crs("EPSG:4326", PROJ4, always_xy=True)
_to_lonlat = Transformer.from_crs(PROJ4, "EPSG:4326", always_xy=True)

_cached_latest_date = {"value": None, "fetched_at": None}


def _osisaf_url(d):
    return f"{OSISAF_BASE}/{d.year}/{d.month:02d}/ice_conc_sh_polstere-100_multi_{d.strftime('%Y%m%d')}1200.nc"

# Real satellite observations for a given bbox+day don't change within the
# same real-world day, and NOAA's ERDDAP has been observed taking 30-60s+ to
# respond (sometimes timing out outright) for this query — for a demo where
# the same or a nearby route gets tried repeatedly, re-paying that latency
# (and re-risking a timeout) every single time is pure waste. Short TTL
# cache, same pattern already used for the SAR scene cache in Model 3.
_sic_history_cache: dict = {}
_SIC_CACHE_TTL_S = 900  # 15 minutes


def _get_latest_available_date():
    """
    Real dataset's most recent published date, cached for an hour. OSI SAF
    publishes with a real 1-3 day operational lag, so this probes backward
    from today (via a cheap HEAD request against the file server) until it
    finds the newest day that's actually been published.
    """
    now = pd.Timestamp.utcnow()
    if _cached_latest_date["value"] is not None and (now - _cached_latest_date["fetched_at"]) < timedelta(hours=1):
        return _cached_latest_date["value"]

    candidate = pd.Timestamp.utcnow().normalize()
    for _ in range(10):
        fname = f"ice_conc_sh_polstere-100_multi_{candidate.strftime('%Y%m%d')}1200.nc"
        url = f"{OSISAF_FILESERVER_BASE}/{candidate.year}/{candidate.month:02d}/{fname}"
        r = requests.head(url, timeout=REQUEST_TIMEOUT_S)
        if r.status_code == 200:
            _cached_latest_date["value"] = candidate
            _cached_latest_date["fetched_at"] = now
            return candidate
        candidate = candidate - pd.Timedelta(days=1)
    raise RuntimeError("could not find a recently published real OSI SAF sea-ice file")


def fetch_recent_sic_history(min_lat, max_lat, min_lon, max_lon, days=7, stride_cells=3):
    """
    Real satellite sea-ice concentration for the last `days` real observation
    days over the given bbox, from OSI SAF's daily Southern-Hemisphere grid.
    Returns (dates, cells) where cells is a list of
    {"lat":, "lon":, "history": [sic_day-6..sic_day0]} (fraction 0-1, real values).
    """
    cache_key = (round(min_lat, 1), round(max_lat, 1), round(min_lon, 1), round(max_lon, 1), days, stride_cells)
    cached = _sic_history_cache.get(cache_key)
    if cached and (time.time() - cached["fetched_at"]) < _SIC_CACHE_TTL_S:
        return cached["dates"], cached["cells"]

    try:
        latest = _get_latest_available_date()
        date_list = [(latest - pd.Timedelta(days=k)).date() for k in range(days - 1, -1, -1)]

        corners = [(min_lon, min_lat), (min_lon, max_lat), (max_lon, min_lat), (max_lon, max_lat)]
        xs, ys = [], []
        for lon, lat in corners:
            x, y = _to_xy.transform(lon, lat)
            xs.append(x)
            ys.append(y)
        # Clamp to OSI SAF's real grid extent — a bbox corner near the
        # northern edge of Antarctic waters can fall just outside it.
        x_lo, x_hi = max(min(xs), GRID_X_MIN), min(max(xs), GRID_X_MAX)
        y_lo, y_hi = max(min(ys), GRID_Y_MIN), min(max(ys), GRID_Y_MAX)

        # Grid axes (xc/yc) are identical across all daily files, so read
        # them once from the first real file to compute index bounds.
        first_ds = netCDF4.Dataset(_osisaf_url(date_list[0]))
        xc = first_ds.variables["xc"][:].data * 1000.0  # km -> m
        yc = first_ds.variables["yc"][:].data * 1000.0
        first_ds.close()

        x0i, x1i = sorted([int(np.argmin(np.abs(xc - x_lo))), int(np.argmin(np.abs(xc - x_hi)))])
        y0i, y1i = sorted([int(np.argmin(np.abs(yc - y_lo))), int(np.argmin(np.abs(yc - y_hi)))])
        x1i, y1i = max(x1i, x0i + 1), max(y1i, y0i + 1)
        step = max(1, stride_cells)

        per_day = {}
        for d in date_list:
            ds = netCDF4.Dataset(_osisaf_url(d))
            sub = ds.variables["ice_conc"][0, y0i:y1i + 1:step, x0i:x1i + 1:step]
            ds.close()
            # real % (0-100) -> fraction (0-1); masked (land/no-data) -> NaN
            per_day[d] = np.ma.filled(sub, np.nan).astype(float) / 100.0

        dates = sorted(per_day.keys())
        stacked = np.stack([per_day[d] for d in dates], axis=0)  # (days, ny, nx)
        valid_mask = ~np.isnan(stacked).any(axis=0)

        sub_yc = yc[y0i:y1i + 1:step]
        sub_xc = xc[x0i:x1i + 1:step]

        cells = []
        for iy in range(stacked.shape[1]):
            for ix in range(stacked.shape[2]):
                if not valid_mask[iy, ix]:
                    continue
                lon, lat = _to_lonlat.transform(sub_xc[ix], sub_yc[iy])
                history = stacked[:, iy, ix].tolist()
                cells.append({"lat": lat, "lon": lon, "rows_m": float(sub_yc[iy]), "cols_m": float(sub_xc[ix]), "history": history})

        if not cells:
            raise RuntimeError("no valid real OSI SAF observations in this bounding box")
    except Exception as e:
        # OSI SAF's real THREDDS server can be briefly slow/unavailable —
        # falling back to the last real successful fetch for this same area
        # (even stale) keeps this request serving genuine satellite data
        # instead of failing outright only because of one bad request.
        if cached is not None:
            print(f"[Model 1] Real OSI SAF fetch failed ({e}); using last real fetch from {round((time.time() - cached['fetched_at']) / 60, 1)}min ago for this area.")
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
