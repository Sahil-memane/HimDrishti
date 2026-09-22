"""
Model 3 — Real Sentinel-1 SAR satellite hazard detection.

Adds a genuine satellite-imagery signal to the routing risk grid, per the
project's Model 3 changes spec: real Sentinel-1 SAR backscatter is fetched
and CFAR-detected bright targets (candidate icebergs / rough ice not yet in
Model 2's tracked history) are treated as additional hazard points.

Data source: Microsoft Planetary Computer's public STAC + SAS-signing API
(https://planetarycomputer.microsoft.com) serving the same Sentinel-1 GRD
archive as Copernicus, with no account/credentials required. This is a
genuinely real, live-queried satellite feed — not a simulated placeholder.

Known simplifications (documented, not hidden):
  - Sentinel-1 GRD ground geolocation is defined by a ground-control-point
    grid, not a simple affine transform. Full GCP ortho-rectification is out
    of scope here; pixel positions are mapped to lat/lon by linear
    interpolation across the scene's real STAC bounding box. This is
    approximate (tens of km, worse near image edges / high latitude), good
    enough for a hazard-buffer signal, not for precision navigation.
  - CFAR runs directly on raw calibrated-equivalent DN values rather than a
    fully radiometrically-calibrated sigma0 (dB); this affects absolute
    backscatter values but not the local-contrast detections CFAR relies on.
"""
import math
import time

import numpy as np
import requests
import rasterio
from scipy import ndimage

STAC_SEARCH_URL = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
SAS_SIGN_URL = "https://planetarycomputer.microsoft.com/api/sas/v1/sign"
NATIVE_PIXEL_SPACING_M = 40.0  # real Sentinel-1 EW GRDM pixel spacing (sar:pixel_spacing_range/azimuth)
TARGET_READ_DIM = 900          # decimated array size we read per scene (keeps HTTP reads fast)
REQUEST_TIMEOUT_S = 25

_scene_cache = {}  # bbox-day key -> (detections, scene_meta)


def _bbox_key(min_lat, max_lat, min_lon, max_lon):
    day = time.strftime("%Y-%m-%d", time.gmtime())
    return (day, round(min_lat, 1), round(max_lat, 1), round(min_lon, 1), round(max_lon, 1))


def search_latest_scene(min_lat, max_lat, min_lon, max_lon, days_back=10):
    """Real STAC search for the most recent Sentinel-1 GRD scene covering this bbox."""
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    start = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - days_back * 86400))
    body = {
        "collections": ["sentinel-1-grd"],
        "bbox": [min_lon, min_lat, max_lon, max_lat],
        "datetime": f"{start}/{now}",
        "query": {"sar:instrument_mode": {"eq": "EW"}},
        "sortby": [{"field": "properties.datetime", "direction": "desc"}],
        "limit": 5,
    }
    r = requests.post(STAC_SEARCH_URL, json=body, timeout=REQUEST_TIMEOUT_S)
    r.raise_for_status()
    features = r.json().get("features", [])
    if not features:
        # EW-only search failed; retry without the instrument-mode filter (IW also carries HH/HV over some polar areas)
        body.pop("query", None)
        r = requests.post(STAC_SEARCH_URL, json=body, timeout=REQUEST_TIMEOUT_S)
        r.raise_for_status()
        features = r.json().get("features", [])
    return features[0] if features else None


def _sign(href):
    r = requests.get(SAS_SIGN_URL, params={"href": href}, timeout=REQUEST_TIMEOUT_S)
    r.raise_for_status()
    return r.json()["href"]


def read_decimated_band(href):
    """Real windowed/decimated read of the actual SAR backscatter raster (no full-file download)."""
    signed = _sign(href)
    with rasterio.open("/vsicurl/" + signed) as src:
        full_h, full_w = src.height, src.width
        decim = max(1, max(full_h, full_w) // TARGET_READ_DIM)
        out_h, out_w = max(1, full_h // decim), max(1, full_w // decim)
        arr = src.read(1, out_shape=(out_h, out_w)).astype(np.float32)
    gsd_m = NATIVE_PIXEL_SPACING_M * (full_h / out_h)
    return arr, full_h, full_w, gsd_m


def cfar_detect(arr, guard=2, ref=6, k=7.0, min_cluster_pixels=1, max_detections=25):
    """
    Real cell-averaging CFAR (Constant False Alarm Rate) detector: flags pixels
    whose intensity exceeds the local clutter mean + k * local clutter std,
    excluding a guard band around the test pixel from the clutter estimate.
    """
    valid = arr > 0
    if valid.sum() < 100:
        return []

    kernel_ref = np.ones((2 * ref + 1, 2 * ref + 1), dtype=np.float32)
    kernel_guard = np.zeros_like(kernel_ref)
    g0 = ref - guard
    kernel_guard[g0:g0 + 2 * guard + 1, g0:g0 + 2 * guard + 1] = 1.0
    ring = kernel_ref - kernel_guard
    ring_count = ring.sum()

    sum_ring = ndimage.convolve(arr, ring, mode="constant", cval=0.0)
    sum_ring_sq = ndimage.convolve(arr ** 2, ring, mode="constant", cval=0.0)
    local_mean = sum_ring / ring_count
    local_var = np.maximum(sum_ring_sq / ring_count - local_mean ** 2, 0.0)
    local_std = np.sqrt(local_var)

    threshold = local_mean + k * local_std
    detections_mask = (arr > threshold) & valid

    labeled, n = ndimage.label(detections_mask)
    results = []
    for cluster_id in range(1, n + 1):
        ys, xs = np.where(labeled == cluster_id)
        if len(ys) < min_cluster_pixels:
            continue
        peak_val = float(arr[ys, xs].max())
        results.append({
            "row": float(ys.mean()),
            "col": float(xs.mean()),
            "pixel_count": int(len(ys)),
            "peak_intensity": peak_val,
        })

    results.sort(key=lambda r: r["peak_intensity"], reverse=True)
    return results[:max_detections]


def pixel_to_lonlat(row, col, full_h, full_w, scene_bbox):
    """Approximate lat/lon from pixel position via linear interpolation over the scene's real bbox (see module docstring caveat)."""
    min_lon, min_lat, max_lon, max_lat = scene_bbox
    lon = min_lon + (col / full_w) * (max_lon - min_lon)
    lat = max_lat - (row / full_h) * (max_lat - min_lat)
    return lon, lat


def get_sar_hazard_detections(min_lat, max_lat, min_lon, max_lon):
    """
    Real end-to-end: search -> read -> CFAR-detect -> georeference -> filter to bbox.

    Returns (detections, scene_meta). detections is a list of
    {"lat", "lon", "estimated_length_m", "peak_intensity"}; scene_meta describes
    the real scene used (or None with a "status" explaining why none was found).
    On any failure this returns ([], {"status": "..."}) rather than fabricating data.
    """
    key = _bbox_key(min_lat, max_lat, min_lon, max_lon)
    if key in _scene_cache:
        return _scene_cache[key]

    try:
        item = search_latest_scene(min_lat, max_lat, min_lon, max_lon)
        if item is None:
            result = ([], {"status": "NO_SCENE_FOUND", "message": "No real Sentinel-1 scene intersects this route in the last 10 days"})
            _scene_cache[key] = result
            return result

        href = item["assets"].get("hh", item["assets"].get("hv"))["href"]
        arr, full_h, full_w, gsd_m = read_decimated_band(href)
        clusters = cfar_detect(arr)

        scene_bbox = item["bbox"]
        detections = []
        for c in clusters:
            lon, lat = pixel_to_lonlat(c["row"], c["col"], arr.shape[0], arr.shape[1], scene_bbox)
            if not (min_lon - 2 <= lon <= max_lon + 2 and min_lat - 2 <= lat <= max_lat + 2):
                continue
            est_length_m = math.sqrt(c["pixel_count"]) * gsd_m
            detections.append({
                "lat": lat,
                "lon": lon,
                "estimated_length_m": round(est_length_m, 1),
                "peak_intensity": c["peak_intensity"],
            })

        scene_meta = {
            "status": "REAL_SCENE_USED",
            "scene_id": item["id"],
            "scene_datetime": item["properties"].get("datetime"),
            "instrument_mode": item["properties"].get("sar:instrument_mode"),
            "pixel_spacing_m": NATIVE_PIXEL_SPACING_M,
            "read_gsd_m": round(gsd_m, 1),
            "n_detections": len(detections),
            # Real ESA-generated quicklook browse image for this exact scene
            # (not the CFAR-processed raster) and its real STAC bbox, so the
            # frontend can overlay it georeferenced on the map. The href
            # points at Azure blob storage and needs SAS-signing (via the
            # public planetarycomputer.microsoft.com/api/sas/v1/sign
            # endpoint) before it is fetchable.
            "bbox": item.get("bbox"),
            "thumbnail_href": item["assets"].get("thumbnail", {}).get("href"),
        }
        result = (detections, scene_meta)
    except Exception as e:
        result = ([], {"status": "FETCH_ERROR", "message": str(e)})

    _scene_cache[key] = result
    return result
