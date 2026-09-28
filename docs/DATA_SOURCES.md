# HimDrishti — Data Sources & Processing Pipeline

> Every dataset, its source, format, status, and how it flows through the ingestion → fusion → model pipeline.

---

## Dataset Inventory

| Dataset | Source | Format | Size/Rows | Status | Pipeline Role |
|---|---|---|---|---|---|
| **Sea Ice Concentration (SIC)** — AMSR2, 10km | NSIDC / EUMETSAT OSI SAF | NetCDF → CSV | 16 daily files (Jan–Feb 2025) | ✅ Collected | Model 1 core training signal |
| **Sea Ice Drift** — OSI SAF, 62.5km | OSI SAF (EUMETSAT) / Copernicus | NetCDF → CSV | 16,375 rows/file | ✅ Collected | Ice motion prediction |
| **Ocean Currents** | CMEMS Global Ocean Physics | NetCDF → CSV | 461,160 rows | ✅ Collected | Route fuel/drift cost, iceberg drift |
| **Sea Surface Temperature** | CMEMS | NetCDF → CSV | 461,160 rows | ✅ Collected | Secondary ice-edge indicator, risk layer |
| **Ocean Waves** | CMEMS | NetCDF → CSV | 2,042,280 rows | ✅ Collected | Safe-route definition, sea-state risk |
| **ERA5 Meteorological** (oper stream) | Copernicus CDS via `cdsapi` | NetCDF → CSV | 5,298,840 rows | ✅ Collected | Wind, temperature, storm/pressure risk |
| **ERA5 Wave stream** | Copernicus CDS via `cdsapi` | NetCDF → CSV | 1,357,020 rows | ✅ Collected | Cross-check supplement to CMEMS waves |
| **Iceberg Tracks** (consolidated) | BYU / NIC Antarctic Iceberg Tracking DB | CSV (165 files → 1) | 102,036 rows | ✅ Collected | Model 2 training target |
| **Coastline & Land Polygons** | Natural Earth, 10m scale | Shapefile (.shp) | ~9.6 MB | ✅ Collected | Land-mask exclusion for routing |
| **Bathymetry** (seafloor depth) | GEBCO | NetCDF / GeoTIFF | Region-limited (~GB) | ✅ Collected | Minimum-depth clearance for routing |
| **World Port Index** | US NGA Maritime Safety | CSV / Shapefile | ~3,700 ports | ✅ Collected | Valid start/destination points |
| **AIS Vessel Tracks** | MarineCadastre.gov / Spire Maritime | CSV | Varies | ⏳ Optional | Validate routes vs real traffic |
| **Historical Vessel Routes** | Internal (43 routes) | CSV | 654,808 records | ✅ Collected | Model 3 validation & navigation analysis |

---

## Key Variables by Dataset

| Dataset | Key Variables |
|---|---|
| Sea Ice Concentration | `ice_conc`, `lat`, `lon`, `time` |
| Sea Ice Drift | `dX`, `dY`, `lat`, `lon`, `time` |
| Ocean Currents | `uo`, `vo`, `latitude`, `longitude`, `time`, `depth` (surface only) |
| Sea Surface Temperature | `thetao`, `latitude`, `longitude`, `time` |
| Ocean Waves | `VHM0`, `VMDR`, `VTPK`, `latitude`, `longitude`, `time` |
| ERA5 Meteorological | `u10`, `v10`, `t2m`, `msl`, `valid_time`, `latitude`, `longitude` |
| ERA5 Wave stream | `swh`, `valid_time`, `latitude`, `longitude` |
| Iceberg Tracks | `iceberg_id`, `date`, `lat`, `lon`, `length_km`, `area_km2` |
| Coastline & Land | `geometry` (line/polygon), `feature_rank` |
| Bathymetry | `elevation` (depth, m) |
| World Port Index | `port_name`, `lat`, `lon`, `depth`, `facilities` |
| AIS Vessel Tracks | `MMSI`, `timestamp`, `lat`, `lon`, `speed`, `heading` |
| Historical Vessel Routes | `latitude`, `longitude`, `timestamp`, `speed`, `heading`, `north_speed`, `east_speed`, `route_id`, `source_file` |

---

## Processing Pipeline

### Stage 1 — Ingestion

The **Ingestion Service** pulls each source on its own schedule (daily for most):
1. Downloads the raw file
2. Stores in S3-compatible object storage
3. Logs the pull in `external_data_cache` table

**Connectors:** `nsidc.py`, `cmems.py`, `era5.py`, `nic_iceberg.py`, `gebco.py`

### Stage 2 — Fusion

The **Fusion Service** prepares data for model consumption:
1. **Regrids** every source onto **EASE-Grid 2.0** (common equal-area grid)
2. Applies **quality-control checks**
3. **Joins** all sources on shared `lat/lon/time` key → fused feature table
4. Surface-only depth levels, daily-mean time aggregation, 4× spatial thinning

**Key design:** All datasets share `time` (or `valid_time`) and `lat/lon` as common join keys.

### Stage 3 — Model Consumption

| Consumer | What It Uses |
|---|---|
| **Model 1** | Fused grid → forecast SIC for t+1…t+7 |
| **Model 2** | Iceberg track history + ocean/weather features → predict positions for t+1…t+7 |
| **Model 3** | Model 1 + Model 2 outputs + coastline + bathymetry + vessel data → risk-scored optimal route |

### Stage 4 — Dashboard Delivery

- Fused features and raw-file metadata staged for model input
- Forecasts written to `sea_ice_forecasts` and `iceberg_predictions` tables
- Optimized route written to `waypoints` and `risk_scores` tables
- Anomalies trigger rows in `alerts` table
- React dashboard calls API Gateway → reads from PostgreSQL/PostGIS
- Forecast endpoints return **GeoJSON** rendered natively by Mapbox GL

---

## Iceberg Track Consolidation

- **165 individual per-iceberg CSV files** → consolidated into single `all_icebergs.csv`
- Unified `iceberg_id` column
- Used as Model 2 training target

---

## Historical Vessel Route Dataset Notes

| Property | Value |
|---|---|
| Records | ~654,808 vessel-position records |
| Routes | 43 routes |

**Usage:** Speed/direction/distance analysis, route validation, comparing Model 3 output with real routes.

> **Important Limitation:** `heading`, `north_speed`, `east_speed` have substantial missing values — don't treat as mandatory inputs for every record.

---

## Common Join Keys

All collected datasets share these merge keys:
- **Time:** `time` or `valid_time`
- **Location:** `lat/lon` or `latitude/longitude`

This is what enables the entire fusion pipeline to produce one master grid.

---

*Sources: [HimDrishti_Project_Document.docx](file:///e:/Projects/HimDrishti/docs/HimDrishti_Project_Document.docx), [Model3_Route_Planning_Project_Report.docx](file:///e:/Projects/HimDrishti/docs/Model3_Route_Planning_Project_Report.docx)*
