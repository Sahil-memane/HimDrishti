# HimDrishti — Model Integration Guides

> Practical integration specifications for all three ML models.
> How to load, feed, run, and display each model's output.

---

## Model 1 — Sea-Ice Concentration (SIC) Forecast

### What It Does
Looks at the **past 14 days** of sea ice and weather data at a location and predicts sea-ice concentration for the **next 7 days**.

### Required Files

| File | Purpose |
|---|---|
| `sic_lstm_best.keras` | The trained model (use this, not "final", unless testing shows final is better) |
| `feature_scaler.pkl` | Adjusts input data into the format the model expects |
| `final_merged_dataset.csv` | Historical data used to build the last-14-days input |

### Step-by-Step Prediction Process

1. **Load model + scaler** at server startup (once, keep in memory)
2. **Collect input** — last 14 days of data for the target location (same columns/order as training)
3. **Scale the data** through `feature_scaler.pkl` — **never skip this** (raw/unscaled input gives wrong results)
4. **Format correctly** — shape: `(1, 14, num_features)` — 1 location, 14 timesteps, N feature columns
5. **Run prediction** — model returns 7 numbers (one per future day)
6. **Read output** — values are on scale 0–1 (0 = no ice, 1 = fully frozen). **No unscaling needed** — they are ready to use as-is
7. **Display/store** the 7 values matched to their forecast dates

### Critical Rules

| ✅ Do | ❌ Don't |
|---|---|
| Use the exact same scaler from training | Create a new scaler |
| Provide features in the same column order | Mix up column order |
| Need ≥ 14 days of history per location | Try predicting with fewer days |
| Batch-predict for many locations at once | One-by-one (slow) |
| Trust Day 1 most, Day 7 least | Assume all days are equally accurate |

### Quick Summary

```
Input:  last 14 days of scaled feature data for one location
        Shape: (1, 14, num_features)
Output: predicted SIC for next 7 days (scale 0–1, ready to use)
```

---

## Model 2 — Iceberg Position Forecast

### What It Does
Takes the **last 7 days** of an iceberg's track data and predicts where it will be for each of the **next 7 days** — as a map location plus a "confidence radius" per day.

**Not a single model** — it's an **ensemble of GRU models** whose output gets blended with a physics estimate (90% GRU + 10% physics drift).

### Required Files

| File | Purpose |
|---|---|
| `combined_model2.keras` | Trained neural network ensemble |
| `feature_columns_v5.pkl` | Exact list/order of input columns (the "recipe") |
| `day_confidence_thresholds_v5.pkl` | Error radius per day (1–7) within which model is right 90% of the time |
| `config.pkl` | Physics blend weight (0.1) and shape settings |

### Step-by-Step Prediction Process

1. **Pull last 7 days** of feature data for the iceberg, in exact column order from `feature_columns_v5.pkl`
   - Shape: `(1, 7, num_features)` — 1 iceberg, 7 timesteps, N features
2. **Also extract separately:** last known position (lat, lon) and current velocity (u, v in km/day)
3. **Run model** → get `(7, 2)` array of `(dx, dy)` displacement in km
   - **Note:** each day is measured from current position (not day-over-day steps)
4. **Compute physics estimate** for 7 days:
   ```
   physics_dx = velocity_u × day
   physics_dy = velocity_v × day    (day = 1 to 7)
   ```
5. **Blend:** `final = 0.1 × physics + 0.9 × model_output`
6. **Convert** each day's `(dx, dy)` to actual lat/lon using last known position as anchor
7. **Attach confidence radius** from `day_confidence_thresholds_v5.pkl`

### Output Per Iceberg

```json
[
  { "day": 1, "lat": -66.15, "lon": 22.35, "confidence_radius_km": 5.2 },
  { "day": 2, "lat": -66.10, "lon": 22.40, "confidence_radius_km": 8.1 },
  ...
  { "day": 7, "lat": -65.80, "lon": 22.90, "confidence_radius_km": 22.5 }
]
```

### Backend Integration Pattern

```
# Load ONCE at startup:
model = keras.models.load_model("combined_model2.keras")
feature_cols = pickle.load("feature_columns_v5.pkl")
thresholds = pickle.load("day_confidence_thresholds_v5.pkl")
config = pickle.load("config.pkl")

# Per prediction request (GET /predict/{iceberg_id}):
1. Fetch last 7 days from DB, order columns per feature_cols
2. Run model.predict()
3. Blend with physics using config's weight
4. Convert to lat/lon using anchor position
5. Attach confidence radius per day
6. Return JSON: list of 7 {date, lat, lon, radius_km}
```

### UI Display Requirements

| Element | Description |
|---|---|
| **Map markers** | Current position as solid marker + dotted/faded path through 7 predicted points |
| **Confidence circles** | Translucent circle around each day's point, radius = day's threshold (grows over time) |
| **Timeline slider** | Scrub Day 1 → Day 7, watch marker move along predicted track |
| **Text summary** | Per day: e.g., "Day 3: ~13 km expected error" |
| **Color coding** | Optional: green (confident) → red/orange (uncertain) as days increase |

### Caveat

> The evaluation run is **not a clean held-out test** — some icebergs in the evaluation were seen during training. Numbers confirm the pipeline is wired correctly, not fresh real-world accuracy. Don't quote these error numbers to end users without this context.

---

## Model 3 — Route Planning & Optimization

### What It Does
Combines Model 1 + Model 2 outputs with environmental data and vessel info to find the **safest, most fuel-efficient route** from start to destination.

**Not a deep-learning model** — it's a **decision-making process** using A* graph search.

### Inputs Required

| Category | Fields |
|---|---|
| **Model 1 output** | Future SIC grid (ice_conc per cell) |
| **Model 2 output** | Predicted iceberg positions (lat, lon per iceberg) |
| **Environmental** | `uo`, `vo` (currents), `u10`, `v10` (wind), `wave_height` |
| **Vessel info** | Start lat/lon, destination lat/lon, speed, fuel consumption |

### Navigation Grid

The geographic area is represented as a **grid of cells**. The ship moves cell-to-cell, evaluating 8 neighbours at each step (N, NE, E, SE, S, SW, W, NW).

Each cell carries attributes:
- Lat/lon position
- SIC (from Model 1)
- Wave height, wind, ocean current
- Distance to nearest predicted iceberg (from Model 2)
- Combined risk/cost score

### Safety Assessment — Hard Rules (Block)

| Condition | Threshold | Result |
|---|---|---|
| Sea Ice Concentration | > 90% | **Cell BLOCKED** |
| Iceberg Distance | < 20 km | **Cell BLOCKED** |
| Wave Height | > 5 m | **Cell BLOCKED** |

> ⚠️ These are **prototype thresholds** — validate against maritime/polar navigation guidelines before real-world use.

### Cost Function — Soft Scoring

Among remaining safe cells, a weighted cost determines preference:

| Risk Component | Weight |
|---|---|
| Sea Ice | **40%** |
| Iceberg | **30%** |
| Wave | **15%** |
| Wind | **5%** |
| Current | **5%** |
| Fuel | **5%** |

```
Total Cost = 0.40 × Ice Risk + 0.30 × Iceberg Risk + 0.15 × Wave Risk
           + 0.05 × Wind Risk + 0.05 × Current Risk + 0.05 × Fuel Cost
```

### A* Algorithm

- **Not a neural network** — it's a deterministic graph-search algorithm
- Searches for path from start to destination while minimizing total accumulated cost
- Considers: cost already travelled + environmental risk of each step + estimated remaining distance
- Every route is **traceable and explainable**

### Iceberg Avoidance

For every navigation cell, calculates **Haversine distance** to the nearest predicted iceberg:
- < 20 km → **blocked**
- 20–100 km → risk score inversely proportional to distance
- > 100 km → near-zero iceberg risk

### Output

The route file (`recommended_route.csv`) contains:

| Column | Description |
|---|---|
| `lat`, `lon` | Position of each route point |
| `ice_conc` | SIC at that point |
| `iceberg_distance_km` | Distance to nearest iceberg |
| `uo`, `vo` | Ocean current |
| `u10`, `v10` | Wind |
| `wave_height` | Wave height |
| `cell_cost` | Calculated cost of that cell |

**Route metrics:**
- Number of route points
- Total route distance
- Estimated fuel consumption
- Average SIC along route
- Minimum iceberg distance along route
- Maximum wave height along route

### Complete Pipeline

```
START + DESTINATION
+ Future SIC (Model 1)
+ Future Iceberg Positions (Model 2)
+ Wind + Wave + Current + Vessel Info
         ↓
Create Navigation Grid
(per cell: iceberg distance, environmental risks, total cost)
         ↓
Apply Safety Rules → Block dangerous cells
         ↓
Run A*: evaluate neighbours, compare paths, select low-cost path
         ↓
Calculate route distance + Estimate fuel
         ↓
Generate recommended_route.csv
```

---

## Important Limitations (All Models)

1. Iceberg predictions contain uncertainty
2. SIC predictions contain uncertainty
3. Environmental datasets may have spatial/temporal mismatches
4. Prototype safety thresholds require validation
5. Fuel consumption is an estimate
6. Historical routes don't guarantee current safety
7. Real-world navigation requires official maritime procedures
8. **The system is a decision-support / research prototype, NOT an autonomous navigation system**

---

## Orchestration - How It Fits Together

Two halves orchestrate the system: a scheduled part that keeps forecasts fresh, and a live part that responds to each user request.

```python
# SCHEDULED (e.g. nightly) - no user involved
live_ice_data = fetch_satellite_sic()
live_weather = fetch_era5_weather()
merged = merge(live_ice_data, live_weather)
sic_forecast = model1.predict(merged)
save_csv(sic_forecast, "next_7_day_sic_forecast.csv")

live_iceberg_tracks = fetch_iceberg_positions()
iceberg_forecast = model2.predict(live_iceberg_tracks)
iceberg_forecast = map_columns_for_model3(iceberg_forecast)
save_csv(iceberg_forecast, "iceberg_7_day_forecast.csv")

# LIVE (per user request)
def handle_request(current_lat, current_lon, dest_lat, dest_lon, forecast_date):
    sic = load_csv("next_7_day_sic_forecast.csv")
    icebergs = load_csv("iceberg_7_day_forecast.csv")
    routes = load_csv("route_points.csv")
    env = fetch_live_environment(current_lat, current_lon, forecast_date)
    return model3.recommend(current_lat, current_lon, dest_lat, dest_lon,
                             forecast_date, sic, icebergs, routes, env)
```

Models 1 and 2 run on a schedule because their output covers the whole region/all tracked icebergs and doesn't depend on any individual user. Model 3 runs live per request because it's the only step that actually needs the user's specific position and destination.

---

*Sources: [SIC_Model_Integration_Guide.docx](file:///e:/Projects/HimDrishti/docs/SIC_Model_Integration_Guide.docx), [Iceberg_Model_Integration_Guide.docx](file:///e:/Projects/HimDrishti/docs/Iceberg_Model_Integration_Guide.docx), [Model3_Route_Planning_Project_Report.docx](file:///e:/Projects/HimDrishti/docs/Model3_Route_Planning_Project_Report.docx), [System_Integration_Guide.docx](file:///e:/Projects/HimDrishti/docs/System_Integration_Guide.docx)*
