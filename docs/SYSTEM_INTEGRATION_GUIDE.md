# HimDrishti — System Integration Guide

> Live Data → Model 1 → Model 2 → Model 3 → UI
> How a developer wires the sea ice forecaster, the iceberg forecaster, and the route planner into one live system

---

## 1. Overview

This system takes live satellite and weather data, plus a user's ship position and destination, and produces a safe-heading recommendation shown on a map. It runs three models in a fixed sequence: Model 1 forecasts sea ice, Model 2 forecasts iceberg positions, and Model 3 combines both forecasts with the user's request to recommend a direction.

**The critical design point:** Models 1 and 2 do not use pre-made files in production. They pull fresh data from live APIs (satellite sea ice, ERA5 weather, iceberg tracking) each time they run. Only the user's position, destination, and requested date are supplied at the moment of the request - everything else the system fetches and computes itself.

## 2. End-to-End Flow

| Stage | What Happens | Produces |
|---|---|---|
| **1. Live data ingestion** | Pull today's satellite sea ice data, ERA5 weather data, and iceberg tracking positions via API - not static pre-downloaded files. | Fresh raw feature tables |
| **2. Run Model 1** | Predicts sea ice concentration for the next 7 days across the whole region. | `next_7_day_sic_forecast.csv` |
| **3. Run Model 2** | Predicts each tracked iceberg's position for the next 7 days. | `iceberg_7_day_forecast.csv` |
| **4. Collect user input** | Ship's current position, destination, and requested date - entered by the user or supplied by GPS. | Feeds directly into Model 3 |
| **5. Run Model 3** | Combines both forecasts, historical routes, live environment data, and the user's request into one recommendation. | `model3_route_recommendations.csv` + `recommended_route.csv` |
| **6. Render UI** | Map, confidence circles, timeline, and risk cards, built from Model 3's output. | What the user sees |

## 3. Quick Reference - Who Needs What

This is the core answer to "what does each model need, and where does it come from":

| Component | Required Input | Supplied By | Produces |
|---|---|---|---|
| **Model 1** (SIC forecast) | Last 14 days of sea ice + weather features per location, scaled the same way as training | System - live satellite (NSIDC) + ERA5 API feeds, merged automatically | `next_7_day_sic_forecast.csv` |
| **Model 2** (Iceberg forecast) | Last 7 days of each iceberg's tracked features, plus its last known position and current velocity (u, v) | System - live iceberg tracking API feed | `iceberg_7_day_forecast.csv` |
| **User** | Current position, destination, and the date to plan for | The user (typed in) or the ship's GPS (auto-filled) | Not an output - this is what triggers Model 3 |
| **Model 3** (Route recommendation) | Model 1's forecast + Model 2's forecast + historical ship routes + live environment snapshot + the user's position/destination/date | System (models 1 & 2 outputs, routes, environment) + User (position, destination, date) | Ranked 8-direction comparison + `recommended_route.csv` |
| **UI** | Model 3's output, plus Model 1 and Model 2's raw forecasts for map overlays | System | Rendered map, risk cards, timeline |

## 4. Getting Live Data (Instead of Pre-Made Files)

- **Sea ice data:** pull daily from the satellite sea-ice-concentration feed (e.g. NSIDC) instead of a static download.
- **Weather data:** pull daily from the ERA5 API (Copernicus Climate Data Store) for temperature, wind, and pressure.
- **Iceberg tracking data:** pull from your organization's live iceberg position feed.
- Merge sea ice and weather data the same way as before (matching by location and date), but as an automated job rather than a manual script run.

This automated merge job is what feeds Model 1's rolling 14-day window - see Section 5.2.

## 5. Model 1 - Sea Ice Forecast

Looks at the past 14 days of sea ice and weather data at a location, and predicts sea ice concentration for the next 7 days.

### 5.1 Files Needed

| File | What It Is |
|---|---|
| `sic_lstm_best.keras` | The trained model itself - use this one (not the "final" version) unless testing shows otherwise. |
| `feature_scaler.pkl` | Adjusts input data into the numeric range the model was trained on. Never skip this step and never swap in a different scaler. |
| `final_merged_dataset.csv` | In the pre-made version, this held historical data for building the 14-day input window. In the live version, this is replaced by a rolling window built fresh from the satellite + ERA5 API feeds (see Section 4). |

### 5.2 Step-by-Step Process

1. Load the model and scaler once when the system starts - keep both in memory, don't reload per prediction.
2. For each location, gather the last 14 days of live sea ice + weather data (from Section 4), in the exact column order used during training.
3. Pass this 14-day window through `feature_scaler.pkl` - never feed raw, unscaled numbers into the model.
4. Shape the scaled data as one example: 14 days by however many feature columns.
5. Run the prediction - it returns 7 numbers, one predicted sea ice value per day (tomorrow through day 7).
6. These 7 numbers are already final, usable sea ice concentration values (0 = no ice, 1 = fully frozen) - no unscaling needed.
7. Write the results to `next_7_day_sic_forecast.csv`: one row per location per forecast day, with columns `lat`, `lon`, `forecast_date`, `predicted_SIC`.

### 5.3 Rules

| Do | Don't |
|---|---|
| Always use the exact same scaler file used during training. | Never create or substitute a different scaler. |
| Always provide features in the same column order used during training. | Never mix up or guess the column order. |
| Always gather at least 14 days of history before predicting for a location. | Never predict with less than 14 days of history - no exceptions. |
| Treat Day 1 as most trustworthy, Day 7 as least. | Don't present Day 7 with the same confidence as Day 1. |
| Batch multiple locations into one prediction call. | Don't loop one location at a time - it's much slower. |

## 6. Model 2 - Iceberg Position Forecast

Given the last 7 days of an iceberg's track, predicts where it will be for each of the next 7 days, plus a confidence radius per day. It's an ensemble of GRU models blended 90/10 with a simple physics estimate (the position the iceberg would reach by continuing at its current velocity).

### 6.1 Files Needed

| File | What It Is |
|---|---|
| `combined_model2.keras` | The trained ensemble network. Does the actual prediction. |
| `feature_columns_v5.pkl` | The exact list and order of input columns the model expects - feed columns out of order and predictions become meaningless. |
| `day_confidence_thresholds_v5.pkl` | One error radius per day (1-7), within which the model is right 90% of the time. Used to draw confidence circles. |
| `config.pkl` | The physics blend weight (0.1) and related settings - how to combine model output with a simple physics estimate. |

### 6.2 Input

For each iceberg: its last 7 days of tracked features (position, velocity, and whatever else `feature_columns_v5.pkl` lists), shaped as `1 iceberg x 7 days x N features`. Separately - not fed into the model, but needed afterward - its last known latitude/longitude and current velocity (u, v in km/day).

### 6.3 Step-by-Step Process

1. Pull the iceberg's last 7 days of feature data, live from the tracking feed, in the exact column order from `feature_columns_v5.pkl`.
2. Run the model - it returns a 7 x 2 array: for each of the next 7 days, a (dx, dy) displacement in km, each measured from today's position (not a day-over-day step).
3. Compute the physics estimate for the same 7 days: `physics_dx = velocity_u × day`, `physics_dy = velocity_v × day` (day = 1 to 7).
4. Blend the two: `final = 0.1 × physics + 0.9 × model_output` (weight from `config.pkl`).
5. Convert each day's (dx, dy) into an actual latitude/longitude, anchored to the iceberg's last known position.
6. Attach a confidence radius to each day from `day_confidence_thresholds_v5.pkl`.
7. Write the results to `iceberg_7_day_forecast.csv`: one row per iceberg per forecast day, with columns `iceberg_id`, `date`, `lat`, `lon`, `confidence_radius_km`.

### 6.4 A Caveat Worth Keeping in Mind

The existing evaluation run was not a clean held-out test - some icebergs in that check were seen during training. It confirms the pipeline is wired correctly, not fresh real-world accuracy. Don't quote those error numbers to end users as-is.

## 7. Bridging Model 1 + Model 2 Into Model 3

Model 3 expects specific column names that don't exactly match Model 2's raw output, so a small mapping step is needed before feeding `iceberg_7_day_forecast.csv` into Model 3:

| Model 2's Raw Output | Model 3 Expects | Mapping Needed |
|---|---|---|
| `iceberg_id` (unchanged) | `iceberg_id` | Direct copy |
| `date` (per predicted day) | `anchor_date` + `forecast_day` | Split into the iceberg's anchor date plus a `forecast_day` number 1-7 |
| `lat`, `lon` (post-conversion) | `predicted_lat`, `predicted_lon` | Rename only |
| `confidence_radius_km` (not used by Model 3 directly) | (None) | Keep for the UI's confidence circles, even though Model 3 doesn't consume it |

Model 1's output already matches what Model 3 expects (`lat`, `lon`, `forecast_date`, `predicted_SIC`) with no mapping needed.

## 8. Model 3 - Route Recommendation

Takes Model 1's forecast, Model 2's forecast, historical ship routes, live environment data, and the user's request, and scores 8 compass directions around the ship's current position to recommend the safest heading.

### 8.1 Inputs

| Input | Comes From | Live-System Note |
|---|---|---|
| **Environmental data** | Same ERA5 + satellite feeds used to build Model 1's input | Query live for the exact candidate points being scored, not the whole region |
| **SIC forecast** | Model 1's output (`next_7_day_sic_forecast.csv`) | Read from the latest completed Model 1 run |
| **Iceberg forecast** | Model 2's output (`iceberg_7_day_forecast.csv`), column-mapped per Section 7 | Read from the latest completed Model 2 run |
| **Historical routes** | AIS route history (`route_points.csv`) | Relatively static - refresh occasionally, not per request |
| **User's request** | Current position, destination, forecast date | Always live - this is the one input that must come from the user at request time |

### 8.2 Output

- `model3_route_recommendations.csv` - all 8 candidate directions, ranked by safety score, with every risk component shown.
- `recommended_route.csv` - just the single top-ranked heading.

## 9. Orchestration - How It Fits Together

Two halves: a scheduled part that keeps forecasts fresh, and a live part that responds to each user request.

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

## 10. UI - What To Show

| Element | What To Show |
|---|---|
| **Map view** | Ship's current position and destination as distinct markers; Model 3's 8 candidate headings color-coded by risk level; a dotted path through each iceberg's 7 predicted positions; sea ice concentration as a background layer or heatmap. |
| **Confidence circles** | A translucent circle around each iceberg's predicted daily position, radius equal to that day's confidence threshold - circles grow for later days since uncertainty increases. |
| **Timeline / slider** | Let the user scrub Day 1 through Day 7 and watch both the recommended heading and the iceberg positions update together. |
| **Risk cards** | One card per candidate direction (from Model 3): safety score, risk level, nearest iceberg distance, predicted ice concentration, wind speed. |
| **Text summaries** | E.g. "Day 3: ~13 km expected error" for iceberg predictions, pulled directly from `day_confidence_thresholds_v5.pkl`. |
| **Warnings** | Flag clearly if the best available safety score is still poor, or if any input (SIC, iceberg, or environment data) is stale or missing for the requested date. |

---

*Source: [System_Integration_Guide.docx](file:///e:/Projects/HimDrishti/docs/System_Integration_Guide.docx)*
