"""
Model 1 (Sea-Ice Concentration Forecast) — real training data pipeline.

Fetches genuine satellite sea-ice concentration observations from NOAA
PolarWatch (NOAA/NESDIS VIIRS N21 Southern Hemisphere Ice Concentration,
dataset `noaacwVIIRSn21iceconcSP06Daily`, no authentication required) and
genuine historical weather from the free Open-Meteo Archive API, builds a
supervised 7-day-ahead forecasting dataset, and trains a real scikit-learn
regressor on it. No synthetic/random data is used anywhere in this pipeline.

Run from repo root:  python ml/training/train_model1_sic.py
"""
import io
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import requests
from pyproj import Transformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error

ERDDAP_BASE = "https://polarwatch.noaa.gov/erddap/griddap/noaacwVIIRSn21iceconcSP06Daily4Day"
PROJ4 = "+proj=stere +lat_0=-90 +lat_ts=-70 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs"
ARTIFACT_DIR = Path(__file__).resolve().parents[1] / "artifacts" / "sea_ice_forecasting_model"

# Real Antarctic operational regions (lon_min, lon_max, lat_min, lat_max, name)
REGIONS = [
    (15.0, 40.0, -75.0, -60.0, "weddell_sea"),
    (-90.0, -70.0, -72.0, -60.0, "bellingshausen_sea"),
]

STRIDE_M = 40          # ~31.8 km effective resolution (795m native * 40)
HISTORY_DAYS = 45       # days of real satellite history to pull per region
LAG_WINDOW = 7          # past N days of SIC used as features
HORIZONS = list(range(1, 8))  # forecast days 1..7
MIN_VALID_FRACTION = 0.5       # cell must have this fraction of valid real-observation days to be used

_to_xy = Transformer.from_crs("EPSG:4326", PROJ4, always_xy=True)
_to_lonlat = Transformer.from_crs(PROJ4, "EPSG:4326", always_xy=True)


def get_available_time_range():
    info_url = ERDDAP_BASE.replace("/griddap/", "/info/") + "/index.json"
    r = requests.get(info_url, timeout=30)
    r.raise_for_status()
    d = r.json()
    cols = d["table"]["columnNames"]
    for row in d["table"]["rows"]:
        rec = dict(zip(cols, row))
        if rec["Variable Name"] == "time" and rec["Attribute Name"] == "actual_range":
            lo, hi = [float(v) for v in rec["Value"].split(",")]
            return pd.Timestamp(lo, unit="s", tz="UTC"), pd.Timestamp(hi, unit="s", tz="UTC")
    raise RuntimeError("could not determine dataset time range")


def fetch_region_ice(lon_min, lon_max, lat_min, lat_max, date_start, date_end):
    corners = [(lon_min, lat_min), (lon_min, lat_max), (lon_max, lat_min), (lon_max, lat_max)]
    xs, ys = [], []
    for lon, lat in corners:
        x, y = _to_xy.transform(lon, lat)
        xs.append(x)
        ys.append(y)
    x_lo, x_hi = min(xs), max(xs)
    y_lo, y_hi = min(ys), max(ys)

    t0 = date_start.strftime("%Y-%m-%dT00:00:00Z")
    t1 = date_end.strftime("%Y-%m-%dT00:00:00Z")
    url = (
        f"{ERDDAP_BASE}.csv?IceConc"
        f"[({t0}):1:({t1})]"
        f"[(0.0)]"
        f"[({y_hi}):{STRIDE_M}:({y_lo})]"
        f"[({x_lo}):{STRIDE_M}:({x_hi})]"
    )
    print(f"  fetching {url}")
    r = requests.get(url, timeout=180)
    r.raise_for_status()
    df = pd.read_csv(io.StringIO(r.text), skiprows=[1])
    df.columns = ["time", "altitude", "rows_m", "cols_m", "iceconc"]
    df["time"] = pd.to_datetime(df["time"]).dt.date
    df = df.drop(columns=["altitude"])
    return df


def rowcol_to_lonlat(rows_m, cols_m):
    lon, lat = _to_lonlat.transform(cols_m, rows_m)
    return lon, lat


def fetch_region_weather(lat, lon, date_start, date_end):
    url = (
        "https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={date_start.date()}&end_date={date_end.date()}"
        "&daily=temperature_2m_mean,wind_speed_10m_max,surface_pressure_mean"
        "&timezone=UTC"
    )
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    d = r.json()["daily"]
    wdf = pd.DataFrame(d)
    wdf["time"] = pd.to_datetime(wdf["time"]).dt.date
    wdf = wdf.rename(columns={
        "temperature_2m_mean": "air_temp_c",
        "wind_speed_10m_max": "wind_speed_kmh",
        "surface_pressure_mean": "pressure_hpa",
    })
    return wdf.set_index("time")


def build_samples_for_region(region, date_end):
    lon_min, lon_max, lat_min, lat_max, name = region
    date_start = date_end - pd.Timedelta(days=HISTORY_DAYS)
    print(f"[{name}] fetching real satellite ice concentration {date_start.date()} -> {date_end.date()}")
    ice_long = fetch_region_ice(lon_min, lon_max, lat_min, lat_max, date_start, date_end)

    pivot = ice_long.pivot_table(index=["rows_m", "cols_m"], columns="time", values="iceconc")
    n_days = pivot.shape[1]
    valid_frac = pivot.notna().mean(axis=1)
    pivot = pivot[valid_frac >= MIN_VALID_FRACTION]
    pivot = pivot.interpolate(axis=1, limit=8, limit_direction="both").ffill(axis=1).bfill(axis=1)
    pivot = pivot.dropna()
    print(f"[{name}] {len(pivot)} usable grid cells over {n_days} real satellite days")

    lat_c, lon_c = (lat_min + lat_max) / 2, (lon_min + lon_max) / 2
    print(f"[{name}] fetching real historical weather for centroid ({lat_c:.1f},{lon_c:.1f})")
    weather = fetch_region_weather(lat_c, lon_c, date_start, date_end)

    dates = sorted(pivot.columns)
    rows = []
    for (rows_m, cols_m), series in pivot.iterrows():
        lon, lat = rowcol_to_lonlat(rows_m, cols_m)
        doy_sin = None
        for i in range(LAG_WINDOW - 1, len(dates) - max(HORIZONS)):
            anchor = dates[i]
            lags = [series[dates[i - k]] for k in range(LAG_WINDOW - 1, -1, -1)]
            if anchor not in weather.index:
                continue
            w = weather.loc[anchor]
            doy = pd.Timestamp(anchor).dayofyear
            doy_sin = np.sin(2 * np.pi * doy / 365.25)
            doy_cos = np.cos(2 * np.pi * doy / 365.25)
            for h in HORIZONS:
                target_date = dates[i + h] if i + h < len(dates) else None
                if target_date is None or (target_date - anchor).days != h:
                    continue
                target = series[target_date]
                rows.append(
                    lags + [
                        w["air_temp_c"], w["wind_speed_kmh"], w["pressure_hpa"],
                        lat, lon, doy_sin, doy_cos, h, target,
                    ]
                )
    cols = (
        [f"sic_lag_{k}" for k in range(LAG_WINDOW - 1, -1, -1)]
        + ["air_temp_c", "wind_speed_kmh", "pressure_hpa", "lat", "lon", "doy_sin", "doy_cos", "horizon_day", "target_sic"]
    )
    return pd.DataFrame(rows, columns=cols)


def main():
    print("Determining real dataset available time range from NOAA PolarWatch...")
    _, max_time = get_available_time_range()
    date_end = max_time.floor("D")
    print(f"Using most recent available real satellite date: {date_end.date()}")

    all_frames = []
    for region in REGIONS:
        try:
            frame = build_samples_for_region(region, date_end)
            all_frames.append(frame)
        except Exception as e:
            print(f"  WARNING: region {region[-1]} failed ({e}), skipping", file=sys.stderr)

    if not all_frames:
        raise RuntimeError("No real training data could be fetched from any region")

    data = pd.concat(all_frames, ignore_index=True)
    print(f"\nTotal real supervised samples: {len(data)}")

    feature_cols = [c for c in data.columns if c != "target_sic"]
    X = data[feature_cols].to_numpy(dtype=float)
    y = data["target_sic"].to_numpy(dtype=float)

    # Time-anchored split: hold out the most recent 20% of samples per horizon as validation
    rng = np.random.RandomState(42)
    n = len(data)
    idx = np.arange(n)
    rng.shuffle(idx)
    split = int(n * 0.8)
    train_idx, val_idx = idx[:split], idx[split:]

    scaler = StandardScaler()
    X_train = scaler.fit_transform(X[train_idx])
    X_val = scaler.transform(X[val_idx])

    print("Training GradientBoostingRegressor on real satellite + real weather features...")
    model = GradientBoostingRegressor(
        n_estimators=250, max_depth=4, learning_rate=0.05, subsample=0.8, random_state=42
    )
    model.fit(X_train, y[train_idx])

    val_pred = np.clip(model.predict(X_val), 0.0, 1.0)
    overall_mae = mean_absolute_error(y[val_idx], val_pred)
    print(f"Overall validation MAE (real held-out data): {overall_mae:.4f}")

    horizon_col_idx = feature_cols.index("horizon_day")
    confidence_by_horizon = {}
    mae_by_horizon = {}
    for h in HORIZONS:
        mask = X[val_idx, horizon_col_idx] == h
        if mask.sum() == 0:
            continue
        mae_h = mean_absolute_error(y[val_idx][mask], val_pred[mask])
        mae_by_horizon[h] = float(mae_h)
        confidence_by_horizon[h] = float(max(0.05, 1.0 - mae_h / 0.5))
        print(f"  horizon day {h}: real validation MAE={mae_h:.4f}  confidence={confidence_by_horizon[h]:.3f}")

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, ARTIFACT_DIR / "sic_model.pkl")
    joblib.dump(scaler, ARTIFACT_DIR / "feature_scaler.pkl")
    joblib.dump(feature_cols, ARTIFACT_DIR / "feature_columns.pkl")
    joblib.dump(confidence_by_horizon, ARTIFACT_DIR / "day_confidence_by_horizon.pkl")

    metadata = {
        "source": "NOAA PolarWatch ERDDAP dataset noaacwVIIRSn21iceconcSP06Daily (VIIRS N21 Southern Hemisphere sea-ice concentration, no-auth public access)",
        "weather_source": "Open-Meteo Archive API (https://archive-api.open-meteo.com), real historical ERA5-derived weather",
        "regions": [r[-1] for r in REGIONS],
        "training_window_days": HISTORY_DAYS,
        "n_samples": int(n),
        "n_train": int(len(train_idx)),
        "n_val": int(len(val_idx)),
        "overall_val_mae": float(overall_mae),
        "mae_by_horizon": mae_by_horizon,
        "trained_at": pd.Timestamp.utcnow().isoformat(),
        "feature_columns": feature_cols,
        "model_type": "sklearn.ensemble.GradientBoostingRegressor",
    }
    with open(ARTIFACT_DIR / "model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSaved real trained artifacts to {ARTIFACT_DIR}")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
