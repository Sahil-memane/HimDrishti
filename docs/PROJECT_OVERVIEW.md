# HimDrishti — Project Overview

> **हिम-दृष्टि — "Ice Vision"**
> AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System

---

## Identity

| Field | Value |
|---|---|
| **Project Name** | HimDrishti (हिम-दृष्टि) — "Ice Vision" |
| **Competition** | Smart India Hackathon 2026 |
| **Problem Statement** | ID 26059 |
| **Ministry** | Ministry of Earth Sciences (MoES) — National Centre for Polar and Ocean Research (NCPOR) |
| **Category** | Software |
| **Theme** | Transportation & Logistics |
| **Version** | 1.0 (August 2026) |

---

## What Is HimDrishti?

HimDrishti is a **decision-support platform** that fuses satellite, oceanographic, and meteorological data to:

1. **Forecast** Antarctic sea-ice concentration over a 7-day horizon.
2. **Predict** iceberg drift trajectories over the same 7-day window.
3. **Compute** safe, fuel-efficient navigation routes for research/supply vessels in polar waters.

It is delivered as a **web dashboard**: a mariner or voyage planner enters ship position, destination, and voyage parameters → the system automatically fetches all remote-sensing/reanalysis data → runs forecasting & optimization models → returns a recommended route with risk scoring, ETA, and fuel estimates.

---

## Objectives

1. Forecast Antarctic sea-ice concentration up to **7 days** ahead using satellite and reanalysis data.
2. Predict the future trajectory of tracked icebergs using historical drift, current, and wind data.
3. Fuse both forecasts into a single **risk-cost surface** and compute the safest, most fuel-efficient route.
4. Present forecasts, risk, and routing on an **interactive map-based dashboard** with clear uncertainty communication.
5. Provide a system architecture that can ingest **new/live data sources** (e.g., AIS feeds) without redesigning the modelling layer.
6. Operate as a **decision-support tool** that augments, not replaces, the judgement of the ship's officers.

---

## Target Users

| User Group | Need Addressed |
|---|---|
| Research vessel captains / officers (NCPOR, MoES expeditions) | Safe, fuel-optimal routing through ice-affected Southern Ocean waters |
| Voyage planners / shore-based operations teams | Pre-voyage route planning and what-if risk analysis before departure |
| Polar research scientists | Access to fused, quality-controlled sea-ice and iceberg datasets for research |
| NCPOR / MoES program managers | Situational awareness dashboard for fleet oversight and reporting |
| Maritime safety & search-and-rescue coordinators | Early alerts on high-risk zones, storm probability, and iceberg proximity |

---

## Core Problems Being Solved

1. **Fragmented data** — Sea-ice and iceberg data scattered across NSIDC, EUMETSAT OSI SAF, Copernicus, ECMWF, NIC/BYU in incompatible formats/projections.
2. **Descriptive, not predictive** — Existing ice-charting products show current conditions but don't forecast where ice/icebergs will be.
3. **Manual route planning** — Polar routing is experience-based, not scalable, not repeatable, and doesn't optimize for fuel or quantify risk.
4. **Static iceberg positions** — Few operational tools give vessel-level trajectory forecasts (rather than "last known position").
5. **No uncertainty communication** — Users can't judge how much to trust a Day-6 vs Day-1 prediction.

---

## Proposed Solution — Three-Model AI Pipeline

| Stage | Model | Purpose |
|---|---|---|
| **Model 1** | Sea-Ice Concentration Forecast (ConvLSTM / U-Net) | Predict SIC for t+1 through t+7 from fused satellite/reanalysis grids |
| **Model 2** | Iceberg Trajectory Prediction (LSTM/GRU or physics-informed regression) | Predict per-iceberg lat/lon for t+1 through t+7 |
| **Model 3** | Risk-Cost & Route Optimization (A*/Dijkstra graph search) | Fuse both forecasts with coastline, bathymetry, vessel data to compute optimal route |

All three models sit behind an **automated ingestion and fusion pipeline** — the only manual input is the voyage itself.

---

## Expected Impact

- **Reduced fuel consumption** through optimization-driven routing.
- **Lower collision/grounding risk** via 7-day-ahead forecasting.
- **Faster, consistent voyage planning** with auditable, data-backed recommendations.
- **Reusable fused Antarctic dataset** (SIC, SST, currents, waves, ERA5, iceberg tracks) with research value.
- **Extensible foundation** for Arctic operations, live AIS integration, and other polar-logistics use cases.

---

## Unique Selling Points (USPs)

| # | USP | Description |
|---|---|---|
| 1 | **Dual-Hazard Fusion Routing** | Sea ice + icebergs fused into one risk score before routing |
| 2 | **Forecast-Aware Iceberg Tracking** | 7-day trajectory prediction, not just last observed position |
| 3 | **Visual Uncertainty Communication** | Fading opacity + growing radius from Day 1 → Day 7 |
| 4 | **Zero-Manual-Data-Entry Pipeline** | Only voyage details are manual; all data fetched automatically |
| 5 | **Confidence-Aware Routing** | Route shown with forecast-confidence band along its length |
| 6 | **Fuel-Cost vs. Risk Trade-off Slider** | Captain chooses Safest / Balanced / Most Fuel-Efficient with live estimates |
| 7 | **Beyond the Problem Statement** | Offline mode, email/SMS alerts, explainable routing, reusable research dataset, auto-retraining, Arctic extensibility |

---

## Key Architectural Principles

- **Service-oriented monorepo** — one folder per deployable service.
- **Three decoupled models** — scaling or upgrading one doesn't affect the others.
- **Region-scoped inference** — forecasts limited to route bounding box, not full polar grid.
- **Deterministic routing** — Model 3 is A*/Dijkstra (not a neural network) for auditability.
- **Seasonal auto-retraining** with automated backtest safety gate.

---

*Source: [HimDrishti_Project_Document.docx](file:///e:/Projects/HimDrishti/docs/HimDrishti_Project_Document.docx)*
