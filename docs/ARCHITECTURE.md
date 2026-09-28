# HimDrishti — System Architecture & User Flow

> How data flows from the user's voyage input through the AI pipeline to a recommended route.

---

## End-to-End User Flow

The entire system is designed as **one path** — from dashboard to route — with everything between handled automatically.

### Step 1 — Voyage Setup (Only Manual Step)

The planner opens the **Voyage Setup Form** and enters:
- Ship's current position (lat/lon)
- Destination (lat/lon)
- Speed (knots)
- Fuel capacity / consumption (optional)
- Departure time
- Risk tolerance: `Low` | `Medium` | `High`

Submitting kicks off everything that follows.

### Step 2 — Automatic Environmental Data Collection

Backend defines a **bounding box** around the likely route and pulls:
- Satellite sea-ice data (NSIDC, OSI SAF)
- Ocean currents, SST, waves (CMEMS)
- ERA5 weather (wind, temperature, pressure)
- Historical iceberg tracks (BYU/NIC)

Planner never downloads or reconciles anything — it all happens in the background.

### Step 3 — Parallel Forecasting (Model 1 + Model 2)

Two models run in parallel on the fused data:

| Model | What It Forecasts | Horizon |
|---|---|---|
| **Model 1** (Sea-Ice) | How SIC will evolve per grid cell | t+1 … t+7 |
| **Model 2** (Iceberg) | Where each tracked iceberg will drift | t+1 … t+7 |

Each prediction carries a **confidence value** for the dashboard.

### Step 4 — Risk Fusion & Route Optimization (Model 3)

- Both forecasts + coastline + bathymetry + vessel params → **single hazard picture**
- Risk assessment layer scores each navigable cell
- A*/Dijkstra graph search finds optimal path (safety + fuel efficiency)
- User's fuel-vs-risk slider preference is respected

### Step 5 — Dashboard & Live Updates

Recommended route lands on the **Decision Support Dashboard** with:
- Route polyline + waypoints
- Ice heatmap (SIC forecast)
- Iceberg markers with confidence circles
- Confidence band along route
- Live alerts

If conditions change mid-voyage, the loop **re-runs automatically** and pushes updated route + alerts.

---

## Architecture Diagram

```
┌─────────────────────┐
│     User Input      │  ← Ship location & destination
│  (Voyage Setup)     │
└─────────┬───────────┘
          ▼
┌─────────────────────────────────────────────┐
│        External Data Sources                │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐│
│  │Satellite │ │Meteorological│ │  Ocean   ││
│  │  Data    │ │    Data      │ │  Data    ││
│  └────┬─────┘ └──────┬───────┘ └────┬─────┘│
└───────┼──────────────┼───────────────┼──────┘
        └──────────────┼───────────────┘
                       ▼
          ┌────────────────────────┐
          │   Historical Data      │
          │  Training Data Archive │
          └───────────┬────────────┘
                      ▼
       ┌──────────────────────────────┐
       │ Data Preprocessing & Fusion  │
       │ Cleaning, normalization,     │
       │ feature extraction           │
       └──────────┬───────────────────┘
                  ▼
    ┌─────────────┴──────────────┐
    ▼                            ▼
┌──────────────────┐  ┌───────────────────────┐
│ Sea-Ice Forecast │  │ Iceberg Trajectory    │
│ Model (Model 1)  │  │ Prediction (Model 2)  │
│ Predicts future  │  │ Predicts future       │
│ ice concentration│  │ iceberg positions     │
└────────┬─────────┘  └──────────┬────────────┘
         └─────────┬─────────────┘
                   ▼
       ┌───────────────────────┐
       │ Risk Assessment Layer │
       │ Combined ice, iceberg │
       │ & weather risk        │
       └──────────┬────────────┘
                  ▼
       ┌──────────────────────────┐
       │ AI Route Optimization    │
       │ Agent (Model 3)          │
       │ Optimizes safety, risk   │
       │ & fuel use               │
       └──────────┬───────────────┘
                  ▼                    ◄── Live route updates
       ┌──────────────────────────┐         (feedback loop)
       │ Decision Support         │
       │ Dashboard                │
       │ Recommended safe,        │
       │ fuel-efficient route     │
       └──────────────────────────┘
```

---

## ML System Architecture — The Three Models

### Model 1 — Sea-Ice Concentration Forecast

| Aspect | Detail |
|---|---|
| **Purpose** | Predict SIC for next 7 days from past 7–14 days of observations |
| **Inputs** | SIC, ice drift, SST, wind, temperature, pressure (past 7 days, aligned) |
| **Feature Key** | `lat`, `lon`, `time` |
| **Target** | Predicted `ice_conc(t+1)` … `ice_conc(t+7)` |
| **Architecture** | ConvLSTM or U-Net (spatio-temporal grid forecasting) |
| **Framework** | PyTorch |
| **Actual Lookback** | 14 days (per SIC integration guide) |
| **Output Scale** | 0–1 (0 = no ice, 1 = fully frozen) |

**Data Prep Pipeline:**
```
SIC + SST + Weather datasets
    → merge on (lat, lon, time)
    → Final ML dataset
    → Data alignment
    → Train/Val/Test split
    → Model 1
    → Predicted ice_conc(t+1…t+7)
```

### Model 2 — Iceberg Trajectory Prediction

| Aspect | Detail |
|---|---|
| **Purpose** | Predict where each tracked iceberg will be in 7 days |
| **Source Datasets** | `all-icebergs.csv` + currents + ice-drift + ERA5 + SST + waves |
| **Input Features** | lat, lon, time, current-u/v, wind-u/v, SST, wave-height, air-temp, pressure, previous lat/lon/velocity/direction |
| **Target** | Predicted iceberg `(lat, lon)` for t+1 … t+7 |
| **Architecture** | Ensemble GRU models blended with physics estimate (90% GRU + 10% physics) |
| **Framework** | PyTorch / Keras |
| **Output** | `(dx, dy)` displacement in km from current position |
| **Lookback** | 7 days |

**Feature Groups:**

| Group | Fields |
|---|---|
| Iceberg tracking | iceberg-ID, time, lat, lon, velocity, direction |
| Ocean currents | uo (eastward), vo (northward), current-speed, current-direction |
| Wind | wind-speed, wind-direction |
| Waves | wave-height, wave-direction, wave-period |

### Model 3 — Risk/Cost Calculation & Route Optimization

| Aspect | Detail |
|---|---|
| **Purpose** | Compute safest, most fuel-efficient route |
| **Inputs** | Model 1 output + Model 2 output + currents + waves + weather + coastline + bathymetry + vessel fuel info + voyage params |
| **Processing** | Risk/cost per cell → block dangerous cells → A* path search |
| **Output** | Ordered waypoint list, per-segment risk score, ETA, fuel estimate |
| **Algorithm** | A*/Dijkstra (deterministic, auditable, NOT a neural network) |
| **Framework** | NetworkX / custom Python |

---

## Why Three Separate Models?

- **Decoupled scaling** — upgrade one model without redeploying the others.
- **Different data modalities** — gridded vs. trajectory data require different architectures.
- **Deterministic routing** — Model 3 being graph-search means every route is traceable and explainable.
- **Regional extensibility** — retrain Models 1 & 2 for Arctic; Model 3 works unchanged.

---

## Common ML Feature Set (Cross-Model)

Recurring feature families used across Models 1 and 2:
- Temperature (air / sea surface)
- Wind speed & direction
- Ocean current (u/v components)
- Sea-surface temperature
- Sea-ice concentration
- Latitude, longitude, time (spatio-temporal merge key)

---

*Sources: [HimDrishti_Project_Document.docx](file:///e:/Projects/HimDrishti/docs/HimDrishti_Project_Document.docx), [antarctic_vessel_routing_architecture.png](file:///e:/Projects/HimDrishti/docs/antarctic_vessel_routing_architecture.png)*
