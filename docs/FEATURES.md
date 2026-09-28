# HimDrishti — Features & UI Specification

> Detailed breakdown of all six key features with inputs, outputs, technologies, and UI requirements.

---

## F1 — 7-Day Sea-Ice Concentration Forecast

| Aspect | Detail |
|---|---|
| **Problem Solved** | Existing ice charts show current conditions only; planners have no forward-looking view |
| **Trigger** | User submits a voyage → backend defines bounding box → Model 1 invoked |
| **Inputs** | Past 7 days of: SIC, ice drift, SST, wind, air temp, pressure (common lat/lon/time grid) |
| **Outputs** | Predicted SIC (0–100%) per grid cell, t+1 through t+7, with per-cell confidence |
| **Tech** | ConvLSTM/U-Net (PyTorch), PostGIS raster, React + Mapbox GL heatmap layer |

**UI:** Color-graded heatmap with a **day-by-day timeline slider** on the Forecast Panel.

---

## F2 — Iceberg Trajectory Prediction

| Aspect | Detail |
|---|---|
| **Problem Solved** | Iceberg position data is a snapshot; by publication time the iceberg may have drifted |
| **Trigger** | Tracked iceberg IDs within bounding box pulled → Model 2 runs per iceberg |
| **Inputs** | Iceberg ID, time, lat, lon, velocity/direction; ocean current u/v; wind; SST; wave height; temp; pressure |
| **Outputs** | Predicted lat/lon per iceberg for t+1…t+7, with confidence radius (km) widening per day |
| **Tech** | LSTM/GRU ensemble + physics blend (Keras), PostGIS geometry columns |

**UI:** Markers with **growing confidence radius** per day on the map.

---

## F3 — AI Route Optimization Engine

| Aspect | Detail |
|---|---|
| **Problem Solved** | Manual route planning can't jointly optimize safety + fuel across a 7-day hazard picture |
| **Trigger** | Model 1 + Model 2 outputs + coastline/bathymetry + vessel params → graph search |
| **Inputs** | SIC forecast grid, iceberg positions, currents, waves, weather, coastline, bathymetry, vessel data, risk tolerance |
| **Outputs** | Ordered waypoint list, per-segment risk score, cumulative ETA, fuel estimate, overall route risk |
| **Tech** | Python A*/Dijkstra (NetworkX), PostGIS spatial joins, FastAPI microservice |

**UI:** Route polyline on map with per-segment risk coloring.

---

## F4 — Voyage Setup & Live Dashboard

| Aspect | Detail |
|---|---|
| **Problem Solved** | Planners need one place to see every hazard layer, not cross-reference multiple charts |
| **User Input** | Ship lat/lon, destination lat/lon, speed (knots), fuel capacity/consumption (optional), departure time, risk tolerance (Low/Medium/High) |
| **Outputs** | Live `voyage_id` + interactive map dashboard with route, forecast layers, and alerts |
| **Tech** | React, Mapbox GL / Leaflet, REST API (FastAPI/Node.js), WebSocket or polling for live updates |

**UI Components:**
- `VoyageSetupForm/` — Voyage input form + client-side validation
- `MapView/` — Map, route polyline, iceberg markers, heatmap layer
- `ForecastPanel/` — 7-day SIC forecast + timeline slider
- `AlertsPanel/` — Live alert banners and history
- `RouteDetail/` — Waypoint table, ETA, fuel, per-leg risk

---

## F5 — Forecast Uncertainty Visualization

| Aspect | Detail |
|---|---|
| **Problem Solved** | Users tend to trust Day-7 as much as Day-1, which is misleading |
| **Mechanism** | Each forecast carries a confidence value → mapped to visual opacity/radius |
| **Inputs** | Per-cell / per-iceberg confidence score from Model 1 and Model 2 |
| **Outputs** | Opacity-graded heatmap + expanding confidence-radius markers per day |
| **Tech** | Mapbox GL data-driven styling expressions, React state for day-slider |

**UI Behavior:**
- As user scrubs Day 1 → Day 7:
  - Heatmap **opacity fades** (lower confidence)
  - Iceberg confidence circles **visibly grow**
  - Optional: route confidence band shown along route length

---

## F6 — Alerts & Rerouting Engine

| Aspect | Detail |
|---|---|
| **Problem Solved** | Conditions change after initial plan; officers may not learn about new hazards until close |
| **Trigger** | Scheduled data refresh → re-score against active route → if new high-risk cell/iceberg within threshold → alert generated |
| **Inputs** | Active voyage route, latest forecasts, storm probability, distance thresholds |
| **Outputs** | Alert records (type, severity, message, timestamp); optionally an updated route |
| **Alert Examples** | "Iceberg detected 42 km ahead — rerouting", "Storm probability: High" |
| **Tech** | Scheduled Airflow DAG / event trigger, PostgreSQL LISTEN/NOTIFY or Redis queue, REST alerts endpoint |

**Alert Types:** `iceberg_proximity`, `storm`, `high_ice_risk`, `reroute`
**Severity Levels:** `low`, `medium`, `high`

---

## Frontend Component Structure

```
frontend/src/
├── components/
│   ├── VoyageSetupForm/    ← Voyage input form + validation
│   ├── MapView/            ← Map, route, icebergs, heatmap
│   ├── ForecastPanel/      ← 7-day SIC forecast + slider
│   ├── AlertsPanel/        ← Live alerts + history
│   └── RouteDetail/        ← Waypoints, ETA, fuel, risk
├── hooks/                  ← useVoyage, useForecast, useAlerts
├── services/               ← api.ts (typed REST client)
└── store/                  ← Global state (voyage, forecast, alerts)
```

---

## Trade-off Slider (USP Feature)

Instead of one fixed "optimal" route, the captain gets a **slider** to choose between:

| Option | Characteristic |
|---|---|
| **Safest** | Lowest risk, may cost more fuel/time |
| **Balanced** | Default — moderate risk, moderate cost |
| **Most Fuel-Efficient** | Lowest fuel, may accept higher risk |

Each option shows **live fuel-savings and time-cost estimates** as the slider moves.

An **LLM-based explainability layer** provides plain-language summaries of what is being traded off.

---

*Source: [HimDrishti_Project_Document.docx](file:///e:/Projects/HimDrishti/docs/HimDrishti_Project_Document.docx)*
