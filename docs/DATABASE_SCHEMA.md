# HimDrishti — Database Schema

> PostgreSQL 15 + PostGIS — single relational + geospatial store.
> Raw satellite/reanalysis files remain in S3 object storage, referenced (not duplicated) from `external_data_cache`.

---

## Entity Relationship Overview

```
users ──┬── vessels (owner_user_id)
        │
        └── voyages (user_id, vessel_id)
              │
              ├── waypoints (voyage_id) ← Model 3 output
              ├── risk_scores (voyage_id) ← Model 3 intermediate
              └── alerts (voyage_id)

sea_ice_forecasts       ← Model 1 output (standalone)
iceberg_tracks          ← Historical/observed positions
iceberg_predictions     ← Model 2 output (references iceberg_tracks)
external_data_cache     ← Raw ingested file ledger
```

---

## Table Definitions

### `users`
Registered platform users (mariners, planners, admins).

| Column | Type | Constraints |
|---|---|---|
| `user_id` | UUID | PK, `gen_random_uuid()` |
| `full_name` | VARCHAR(150) | NOT NULL |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `password_hash` | VARCHAR(255) | NOT NULL |
| `role` | VARCHAR(20) | NOT NULL, CHECK IN (`mariner`, `planner`, `admin`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |

**Indexes:** UNIQUE on `email`

---

### `vessels`
Vessel master data referenced by voyages.

| Column | Type | Constraints |
|---|---|---|
| `vessel_id` | UUID | PK, `gen_random_uuid()` |
| `name` | VARCHAR(150) | NOT NULL |
| `imo_number` | VARCHAR(20) | UNIQUE |
| `max_speed_knots` | FLOAT | NOT NULL, CHECK > 0 |
| `fuel_capacity_l` | FLOAT | CHECK > 0 |
| `fuel_consumption_lph` | FLOAT | CHECK > 0 |
| `owner_user_id` | UUID | FK → `users.user_id` |

**Indexes:** B-tree on `owner_user_id`

---

### `voyages`
One record per planned/active voyage — the anchor entity for routing.

| Column | Type | Constraints |
|---|---|---|
| `voyage_id` | UUID | PK, `gen_random_uuid()` |
| `user_id` | UUID | FK → `users.user_id`, NOT NULL |
| `vessel_id` | UUID | FK → `vessels.vessel_id`, NOT NULL |
| `start_point` | GEOMETRY(Point, 4326) | NOT NULL |
| `destination_point` | GEOMETRY(Point, 4326) | NOT NULL |
| `departure_time` | TIMESTAMPTZ | NOT NULL, CHECK >= `created_at` |
| `risk_tolerance` | VARCHAR(10) | DEFAULT `'Medium'`, CHECK IN (`Low`, `Medium`, `High`) |
| `status` | VARCHAR(20) | DEFAULT `'planned'`, CHECK IN (`planned`, `active`, `completed`, `cancelled`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |

**Indexes:** GiST on `start_point`, `destination_point`; B-tree on `user_id`, `status`

---

### `waypoints`
Ordered route waypoints computed by Model 3 for a voyage.

| Column | Type | Constraints |
|---|---|---|
| `waypoint_id` | UUID | PK, `gen_random_uuid()` |
| `voyage_id` | UUID | FK → `voyages.voyage_id`, NOT NULL, ON DELETE CASCADE |
| `sequence_no` | INT | NOT NULL |
| `position` | GEOMETRY(Point, 4326) | NOT NULL |
| `eta` | TIMESTAMPTZ | NOT NULL |
| `cumulative_fuel_l` | FLOAT | CHECK >= 0 |
| `segment_risk_score` | FLOAT | CHECK BETWEEN 0 AND 1 |

**Indexes:** Composite UNIQUE(`voyage_id`, `sequence_no`); GiST on `position`

---

### `sea_ice_forecasts`
Model 1 output — gridded ice-concentration forecast cells.

| Column | Type | Constraints |
|---|---|---|
| `forecast_id` | UUID | PK, `gen_random_uuid()` |
| `forecast_date` | DATE | NOT NULL |
| `horizon_day` | INT | NOT NULL, CHECK BETWEEN 1 AND 7 |
| `grid_cell` | GEOMETRY(Polygon, 4326) | NOT NULL |
| `ice_concentration` | FLOAT | NOT NULL, CHECK BETWEEN 0 AND 100 |
| `confidence` | FLOAT | CHECK BETWEEN 0 AND 1 |

**Indexes:** GiST on `grid_cell`; B-tree on (`forecast_date`, `horizon_day`)

---

### `iceberg_tracks`
Historical / observed iceberg positions (source-of-truth history).

| Column | Type | Constraints |
|---|---|---|
| `iceberg_id` | VARCHAR(30) | PK (composite) |
| `observed_at` | TIMESTAMPTZ | PK (composite with `iceberg_id`) |
| `position` | GEOMETRY(Point, 4326) | NOT NULL |
| `velocity_ms` | FLOAT | CHECK >= 0 |
| `direction_deg` | FLOAT | CHECK BETWEEN 0 AND 360 |

**Indexes:** Composite PK(`iceberg_id`, `observed_at`); GiST on `position`

---

### `iceberg_predictions`
Model 2 output — predicted future iceberg positions.

| Column | Type | Constraints |
|---|---|---|
| `prediction_id` | UUID | PK, `gen_random_uuid()` |
| `iceberg_id` | VARCHAR(30) | FK → `iceberg_tracks.iceberg_id`, NOT NULL |
| `horizon_day` | INT | NOT NULL, CHECK BETWEEN 1 AND 7 |
| `predicted_position` | GEOMETRY(Point, 4326) | NOT NULL |
| `confidence_radius_km` | FLOAT | CHECK >= 0 |

**Indexes:** Composite UNIQUE(`iceberg_id`, `horizon_day`); GiST on `predicted_position`

---

### `risk_scores`
Model 3 intermediate/output — per-segment combined risk for a voyage.

| Column | Type | Constraints |
|---|---|---|
| `risk_id` | UUID | PK, `gen_random_uuid()` |
| `voyage_id` | UUID | FK → `voyages.voyage_id`, NOT NULL, ON DELETE CASCADE |
| `segment` | GEOMETRY(LineString, 4326) | NOT NULL |
| `ice_risk` | FLOAT | CHECK BETWEEN 0 AND 1 |
| `iceberg_risk` | FLOAT | CHECK BETWEEN 0 AND 1 |
| `weather_risk` | FLOAT | CHECK BETWEEN 0 AND 1 |
| `combined_score` | FLOAT | CHECK BETWEEN 0 AND 1 |

**Indexes:** GiST on `segment`; B-tree on `voyage_id`

---

### `alerts`
Generated alerts for an active voyage.

| Column | Type | Constraints |
|---|---|---|
| `alert_id` | UUID | PK, `gen_random_uuid()` |
| `voyage_id` | UUID | FK → `voyages.voyage_id`, NOT NULL, ON DELETE CASCADE |
| `alert_type` | VARCHAR(30) | NOT NULL, CHECK IN (`iceberg_proximity`, `storm`, `high_ice_risk`, `reroute`) |
| `severity` | VARCHAR(10) | NOT NULL, CHECK IN (`low`, `medium`, `high`) |
| `message` | TEXT | NOT NULL |
| `triggered_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |
| `acknowledged` | BOOLEAN | DEFAULT `false` |

**Indexes:** B-tree on (`voyage_id`, `acknowledged`)

---

### `external_data_cache`
Ledger of raw ingested files/datasets (metadata only; payload in object storage).

| Column | Type | Constraints |
|---|---|---|
| `cache_id` | UUID | PK, `gen_random_uuid()` |
| `source_name` | VARCHAR(60) | NOT NULL (e.g., `NSIDC`, `CMEMS`, `ERA5`, `NIC`) |
| `dataset_type` | VARCHAR(40) | NOT NULL (e.g., `SIC`, `SST`, `currents`, `iceberg_tracks`) |
| `fetched_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` |
| `storage_path` | VARCHAR(500) | NOT NULL — S3 object key |
| `status` | VARCHAR(20) | DEFAULT `'fetched'`, CHECK IN (`fetched`, `validated`, `fused`, `failed`) |

**Indexes:** B-tree on (`source_name`, `dataset_type`, `fetched_at`)

---

*Source: [HimDrishti_Project_Document.docx](file:///e:/Projects/HimDrishti/docs/HimDrishti_Project_Document.docx)*
