# HimDrishti (हिम-दृष्टि) — Implementation Document

> **Project:** AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System
> **Competition:** Smart India Hackathon 2026 — Problem Statement ID 26059 (MoES / NCPOR)
> **Team Size:** Solo (1 developer)
> **Timeline:** 15 hours (single hackathon build window)
> **Document Purpose:** Take the project from an empty repo to a deployed, demoable build with zero additional planning required. Every phase below is scoped to fit inside the 15-hour budget.

**Scope assumption (read this first):** With 15 hours and one person, this document does **not** include training Models 1 and 2 from scratch. Per `MODEL_INTEGRATION_GUIDE.md`, trained artifacts already exist (`sic_lstm_best.keras`, `feature_scaler.pkl`, `combined_model2.keras`, `feature_columns_v5.pkl`, `day_confidence_thresholds_v5.pkl`, `config.pkl`). The 15-hour plan is a **integration-and-delivery sprint**: load the existing models, wire them into FastAPI microservices, build Model 3 (A* routing, which is rule-based and buildable in-session), stand up the database, API gateway, React dashboard, and deploy. If model files are not actually available at kickoff, Phase 4/5 fall back to a stub/mock mode (flagged below) so the pipeline stays demoable end-to-end.

---

## Table of Contents

1. [Team Responsibilities](#1-team-responsibilities)
2. [Repository Setup and Structure](#2-repository-setup-and-structure)
3. [Environment & Tooling Checklist](#3-environment--tooling-checklist)
4. [Time Budget Overview](#4-time-budget-overview)
5. [Architecture Recap (What We're Building)](#5-architecture-recap-what-were-building)
6. [Detailed Development Roadmap](#6-detailed-development-roadmap)
7. [Definition of Done (Demo-Ready Checklist)](#7-definition-of-done-demo-ready-checklist)
8. [Risk Register & Fallback Plan](#8-risk-register--fallback-plan)
9. [Post-Hackathon Backlog (Not in Scope for the 15h Build)](#9-post-hackathon-backlog)

---

## 1. Team Responsibilities

Since this is a **solo build**, one developer wears every hat sequentially. The table below assigns each "role" to the same person but makes the hand-off between roles explicit — treat each row as a **context-switch checkpoint**, not a different person. This keeps scope boundaries clear even without a team.

| Developer | Role (Hat) | Responsibilities | Active During Phase |
|---|---|---|---|
| Solo Dev | **Tech Lead / Architect** | Own the architecture decisions in this doc, resolve scope cuts under time pressure, keep the 15h budget honest | All phases (ongoing) |
| Solo Dev | **DevOps / Repo Owner** | Repo creation, branch/commit hygiene, `.env` and secrets handling, Docker Compose, CI (if time permits), final deployment | Phase 0, Phase 11 |
| Solo Dev | **Database Engineer** | PostgreSQL + PostGIS schema, migrations, seed data | Phase 1 |
| Solo Dev | **Backend Engineer (Auth & Gateway)** | JWT auth, API Gateway routes, request validation, role-based access | Phase 2, Phase 7 |
| Solo Dev | **Data Engineer** | Ingestion stub/mock connectors, `external_data_cache` writes, bounding-box logic | Phase 3 |
| Solo Dev | **ML Integration Engineer (Model 1)** | Load `sic_lstm_best.keras` + scaler, build `/predict` inference endpoint, write forecast rows | Phase 4 |
| Solo Dev | **ML Integration Engineer (Model 2)** | Load `combined_model2.keras`, implement GRU + physics blend, confidence radius attach | Phase 5 |
| Solo Dev | **Routing Engineer (Model 3)** | Build navigation grid, hard safety rules, weighted cost function, A* search | Phase 6 |
| Solo Dev | **Backend Integration Engineer** | Wire Model 1 → Model 2 → Model 3 into the async voyage pipeline, alerts endpoint | Phase 7, Phase 9 |
| Solo Dev | **Frontend Engineer** | React dashboard: Voyage form, MapView, ForecastPanel, AlertsPanel, RouteDetail | Phase 8 |
| Solo Dev | **QA / Release Engineer** | Smoke tests, demo script rehearsal, README polish | Phase 10 |
| Solo Dev | **Deployment Engineer** | Containerize, push, deploy (or run polished local demo if cloud time is short) | Phase 11 |

**Working agreement with yourself (solo-team ground rules):**
- Commit after every completed step in the roadmap below — not at the end of a phase. This protects you against running out of time mid-phase.
- Timebox every phase. If a phase overruns by more than 20%, cut to its fallback (see [Section 8](#8-risk-register--fallback-plan)) and move on — do not borrow time from Phase 8 (Frontend) or Phase 11 (Deployment), since those are demo-critical.
- No refactoring passes during the 15h window. Refactor ideas go straight into [Section 9](#9-post-hackathon-backlog).

---

## 2. Repository Setup and Structure

### 2.1 Repository Creation

| Step | Action |
|---|---|
| 1 | Create a new **private** GitHub repo: `himdrishti` (rename to public post-submission if the hackathon requires it) |
| 2 | Initialize with a `README.md`, `.gitignore` (Node + Python template), and `MIT` or hackathon-mandated license |
| 3 | Clone locally, set `git config user.name` / `user.email` for commit consistency |
| 4 | Create the monorepo folder skeleton in a single first commit (`chore: scaffold monorepo structure`) |
| 5 | Push `main` as the only long-lived branch (solo + 15h ⇒ no `develop` branch overhead) |

### 2.2 Branching Strategy (Solo, Time-Boxed)

Given the timeline, full git-flow is overkill. Use a **lightweight trunk-based model**:

- `main` — always the latest working state. Never force-push.
- Optional short-lived branches only for risky spikes (e.g. `spike/model3-astar`) that you might throw away. Merge back to `main` with a normal merge, no PR review needed (solo dev = self-approved).
- Commit early, commit often — aim for one commit per checklist item in Section 6, so you always have a rollback point if something breaks close to the deadline.

### 2.3 GitHub Settings

| Setting | Value | Why |
|---|---|---|
| Default branch | `main` | Single source of truth |
| Branch protection | **Off** for the 15h window | Solo dev, protection only adds friction; re-enable post-hackathon |
| Issues | Enabled | Track known gaps for the judges / backlog (Section 9) |
| Actions | Enabled, minimal workflow only if time allows (see Phase 10) | Lint + build sanity check, not full CI/CD |
| Secrets (`Settings → Secrets and variables → Actions`) | Add `DATABASE_URL`, `JWT_SECRET`, any model-hosting credentials | Never commit secrets to `.env` in git history |
| Topics/description | `antarctica`, `maritime-routing`, `sih-2026`, `decision-support` | Discoverability for judges |
| `.gitignore` entries | `node_modules/`, `__pycache__/`, `*.pyc`, `.env`, `*.keras` (if large), `venv/`, `dist/`, `build/` | Keep repo lean; large model files go via Git LFS or are excluded and documented in README |

### 2.4 Repository Structure

Adopt the service-oriented monorepo layout as-is (already validated in the project's own architecture docs). Scaffold all folders even if some stay empty placeholders for the hackathon demo — this signals architectural completeness to judges.

```
himdrishti/
├── frontend/                        # React + Mapbox GL dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoyageSetupForm/
│   │   │   ├── MapView/
│   │   │   ├── ForecastPanel/
│   │   │   ├── AlertsPanel/
│   │   │   └── RouteDetail/
│   │   ├── hooks/                   # useVoyage, useForecast, useAlerts
│   │   ├── services/                # api.ts — typed REST client
│   │   └── store/                   # Zustand store
│   └── package.json
│
├── backend/
│   ├── api-gateway/                 # Auth, routing, validation
│   ├── ingestion-service/
│   │   └── connectors/              # nsidc.py, cmems.py, era5.py, nic_iceberg.py, gebco.py (stubbed)
│   ├── fusion-service/              # Regrid/merge (stubbed for 15h scope)
│   ├── model1-seaice-service/
│   ├── model2-iceberg-service/
│   ├── model3-routing-service/
│   └── alerts-service/
│
├── ml/
│   └── artifacts/                   # sic_lstm_best.keras, feature_scaler.pkl, combined_model2.keras, etc.
│
├── infra/
│   └── docker-compose.yml
├── db/
│   └── migrations/                  # SQL DDL matching DATABASE_SCHEMA.md
├── tests/
├── docs/                            # This document + the 8 source docs
├── docker-compose.yml
└── README.md
```

**Checklist — Repo Ready:**
- [ ] Repo created, cloned, `.gitignore` in place
- [ ] Folder skeleton committed
- [ ] `docker-compose.yml` stub committed (services filled in as phases complete)
- [ ] `README.md` has a one-paragraph project summary + "how to run locally" placeholder
- [ ] Secrets added to GitHub Actions secrets (not committed)

---

## 3. Environment & Tooling Checklist

Do this **before** the 15-hour clock starts, or count it inside Phase 0.

- [ ] Node.js 18+ and npm/pnpm installed
- [ ] Python 3.11 installed with `venv`
- [ ] PostgreSQL 15 + PostGIS extension available (local install or Docker image `postgis/postgis:15-3.4`)
- [ ] Docker + Docker Compose installed
- [ ] Mapbox account + access token (or fallback to Leaflet + OpenStreetMap tiles if no token/time)
- [ ] Model artifact files present locally in `ml/artifacts/` (or confirmed unavailable → trigger stub mode)
- [ ] `pip install fastapi uvicorn sqlalchemy psycopg2-binary tensorflow keras scikit-learn pandas numpy networkx python-jose passlib bcrypt pydantic`
- [ ] `npm create vite@latest frontend -- --template react-ts`
- [ ] Postman/Insomnia or `curl`/httpie ready for manual API testing

---

## 4. Time Budget Overview

| # | Phase | Duration | Cumulative |
|---|---|---|---|
| 0 | Project bootstrap & tooling | 0.5 h | 0.5 h |
| 1 | Database schema & backend skeleton | 1.0 h | 1.5 h |
| 2 | Auth (register/login, JWT) | 0.75 h | 2.25 h |
| 3 | Data ingestion stub + bounding box | 0.5 h | 2.75 h |
| 4 | Model 1 integration (Sea-Ice) | 1.5 h | 4.25 h |
| 5 | Model 2 integration (Iceberg) | 1.5 h | 5.75 h |
| 6 | Model 3 — Routing engine (A*) | 2.0 h | 7.75 h |
| 7 | API Gateway wiring (voyage pipeline) | 1.25 h | 9.0 h |
| 8 | Frontend dashboard | 3.25 h | 12.25 h |
| 9 | Alerts & live updates | 0.75 h | 13.0 h |
| 10 | Testing, polish, demo script | 1.0 h | 14.0 h |
| 11 | Deployment | 1.0 h | 15.0 h |

> Treat this table as the master clock. Set a timer per phase. If you're behind by Phase 6, apply the fallback for that phase immediately rather than eating into Phase 8/11.

---

## 5. Architecture Recap (What We're Building)

```
User Input (Voyage Setup)
      ↓
Bounding box defined → Ingestion (stub/mock) → external_data_cache
      ↓
Data Preprocessing & Fusion (simplified for 15h — pass-through/mock fusion)
      ↓
  ┌───────────────┬────────────────────┐
  ▼                                     ▼
Model 1 (Sea-Ice, keras)      Model 2 (Iceberg, keras + physics blend)
  └───────────────┬────────────────────┘
                   ▼
        Risk Assessment Layer
                   ▼
        Model 3 — A* Route Optimization
                   ▼
     waypoints / risk_scores tables
                   ▼
     React Dashboard (Map, Forecast, Alerts, Route Detail)
                   ▲
             Alerts Service (re-score loop)
```

Auth, voyage CRUD, and forecast/alert reads go through the **API Gateway**; Models 1–3 are separate FastAPI microservices called synchronously-in-sequence from the gateway's async voyage-processing task for the 15h build (a proper queue/Airflow DAG is backlog — see Section 9).

---

## 6. Detailed Development Roadmap

Each phase lists **Owner** (always Solo Dev, hat noted), **Steps** (execute in order, check off as you go), and **Exit Criteria** (do not proceed until met — this is what makes the roadmap executable without further planning).

---

### Phase 0 — Project Bootstrap (0.5 h)

**Owner:** Solo Dev — DevOps/Repo Owner

**Steps:**
- [ ] Create repo, push skeleton (Section 2.4)
- [ ] Create `docker-compose.yml` with services: `postgres` (postgis image), placeholders for `api-gateway`, `model1`, `model2`, `model3`, `frontend`
- [ ] Create root `.env.example` listing all required env vars (`DATABASE_URL`, `JWT_SECRET`, `MAPBOX_TOKEN`)
- [ ] Spin up `docker compose up postgres` and confirm connection with `psql`

**Exit Criteria:**
- ✅ `docker compose up postgres` runs cleanly
- ✅ Can connect to DB via `psql "$DATABASE_URL"`
- ✅ Repo pushed to GitHub with skeleton visible

---

### Phase 1 — Database Schema & Backend Skeleton (1.0 h)

**Owner:** Solo Dev — Database Engineer

**Steps:**
- [ ] Write SQL migration file `db/migrations/001_init.sql` implementing all tables from `DATABASE_SCHEMA.md`: `users`, `vessels`, `voyages`, `waypoints`, `sea_ice_forecasts`, `iceberg_tracks`, `iceberg_predictions`, `risk_scores`, `alerts`, `external_data_cache`
- [ ] Enable PostGIS extension: `CREATE EXTENSION IF NOT EXISTS postgis;`
- [ ] Apply all constraints, checks, and indexes exactly as specified (GiST on geometry columns, composite uniques)
- [ ] Run migration against local Postgres, verify with `\dt` and `\d voyages`
- [ ] Scaffold `backend/api-gateway/` as a FastAPI app (`main.py`, `db.py` with SQLAlchemy engine, `models.py` with ORM classes mirroring the schema)
- [ ] Add a `/health` endpoint returning `{"status": "ok"}`

**Exit Criteria:**
- ✅ All 10 tables exist with correct constraints
- ✅ `GET /health` returns 200 from a running `uvicorn` process
- ✅ SQLAlchemy models load without errors against the live schema

---

### Phase 2 — Authentication (0.75 h)

**Owner:** Solo Dev — Backend Engineer (Auth & Gateway)

**Steps:**
- [ ] Implement `POST /api/auth/register` — validate email format/uniqueness, hash password with bcrypt, enforce `role ∈ {mariner, planner}`, return `201` per spec
- [ ] Implement `POST /api/auth/login` — verify credentials, issue JWT access token (`expires_in: 3600`) + refresh token, return `401` on bad credentials
- [ ] Add rate limiting stub on `/login` (simple in-memory counter is fine for 15h scope; note real rate-limiter as backlog)
- [ ] Add JWT-verification dependency (`get_current_user`) reusable across all protected routes
- [ ] Manually test both endpoints with curl/Postman

**Exit Criteria:**
- ✅ Can register a `planner` and a `mariner` user
- ✅ Can log in and receive a valid JWT
- ✅ A protected dummy route rejects requests without a valid token (`401`)

---

### Phase 3 — Data Ingestion Stub + Bounding Box (0.5 h)

**Owner:** Solo Dev — Data Engineer

> Full live connectors to NSIDC/CMEMS/ERA5 are out of scope for 15h (network access, API keys, huge NetCDF files). Build the **interface and cache ledger** so the rest of the pipeline is real, and mock the payload.

**Steps:**
- [ ] Implement `compute_bbox(start, dest, buffer_km)` utility — takes voyage start/dest lat/lon, returns a padded bounding box
- [ ] Implement stub connectors `nsidc.py`, `cmems.py`, `era5.py`, `nic_iceberg.py` — each returns a small mock dataset (few rows of realistic SIC/current/wind/iceberg values) scoped to the bbox, and writes a row to `external_data_cache` with `status='fetched'`
- [ ] Wire ingestion into a function `run_ingestion(voyage_id, bbox)` callable from the voyage pipeline
- [ ] Log clearly (`# MOCK DATA — replace with live connector`) so judges/future-you know this is intentionally stubbed, not broken

**Exit Criteria:**
- ✅ Calling `run_ingestion()` inserts rows into `external_data_cache`
- ✅ Bounding box math verified against 2–3 known lat/lon pairs

---

### Phase 4 — Model 1 Integration: Sea-Ice Forecast (1.5 h)

**Owner:** Solo Dev — ML Integration Engineer (Model 1)

**Steps:**
- [ ] Scaffold `backend/model1-seaice-service/` as its own FastAPI app
- [ ] On startup, load `sic_lstm_best.keras` and `feature_scaler.pkl` **once** into memory (module-level globals, not per-request)
- [ ] Build `prepare_input(location, last_14_days_df)` — assemble the last 14 days of feature columns **in the exact training column order**, scale via `feature_scaler.pkl`, reshape to `(1, 14, num_features)`
- [ ] Build `POST /predict` — accepts a location + historical window (or in mock mode, synthesizes a plausible 14-day window from the ingestion stub output), returns 7 daily SIC values (0–1 scale, **no unscaling**) with a naive confidence value (e.g., linearly decaying 0.95 → 0.55 across days 1–7, documented as a placeholder heuristic)
- [ ] Write results into `sea_ice_forecasts` table (`forecast_date`, `horizon_day` 1–7, `grid_cell`, `ice_concentration` scaled to 0–100 per schema, `confidence`)
- [ ] **Fallback check:** if `.keras` file is unavailable, implement a clearly-labeled mock predictor (e.g., smooth random-walk around a plausible ice-concentration baseline) behind the same `/predict` interface so downstream phases are unaffected

**Exit Criteria:**
- ✅ `POST /predict` returns 7 values on scale 0–1, monotonically-decreasing confidence
- ✅ Rows appear correctly in `sea_ice_forecasts` for a test voyage bbox
- ✅ Model/scaler loaded exactly once at startup (verified via log line, not per-request)

---

### Phase 5 — Model 2 Integration: Iceberg Trajectory (1.5 h)

**Owner:** Solo Dev — ML Integration Engineer (Model 2)

**Steps:**
- [ ] Scaffold `backend/model2-iceberg-service/`
- [ ] Load once at startup: `combined_model2.keras`, `feature_columns_v5.pkl`, `day_confidence_thresholds_v5.pkl`, `config.pkl`
- [ ] Build `GET /predict/{iceberg_id}` — pull last 7 days of iceberg feature data (from mocked `iceberg_tracks` seed data if no live feed), order columns per `feature_columns_v5.pkl`, shape `(1, 7, num_features)`
- [ ] Run model → `(7, 2)` array of `(dx, dy)` in km, each measured from current position (not cumulative day-over-day)
- [ ] Compute physics estimate: `physics_dx = velocity_u × day`, `physics_dy = velocity_v × day` for day 1–7
- [ ] Blend: `final = 0.1 × physics + 0.9 × model_output` (weight sourced from `config.pkl`)
- [ ] Convert `(dx, dy)` → actual `(lat, lon)` using last known position as anchor
- [ ] Attach `confidence_radius_km` per day from `day_confidence_thresholds_v5.pkl`
- [ ] Write results to `iceberg_predictions` table (`iceberg_id`, `horizon_day`, `predicted_position`, `confidence_radius_km`)
- [ ] Seed 2–3 test icebergs into `iceberg_tracks` for demo purposes
- [ ] **Fallback check:** if `.keras`/`.pkl` files unavailable, mock the ensemble output with the physics term alone (`0% GRU + 100% physics`), clearly logged, so the blend interface is still exercised

**Exit Criteria:**
- ✅ `GET /predict/{iceberg_id}` returns 7 `{day, lat, lon, confidence_radius_km}` objects, radius growing with day
- ✅ Rows correctly populate `iceberg_predictions`
- ✅ Caveat comment included in code: evaluation numbers are pipeline-sanity, not real-world accuracy — never surfaced to end users as ground truth

---

### Phase 6 — Model 3: Routing Engine (A*) (2.0 h)

**Owner:** Solo Dev — Routing Engineer

> This is the highest-value, fully from-scratch component — budget the most time here and do not shortcut the safety rules, since they're the credibility centerpiece of the demo.

**Steps:**
- [ ] Scaffold `backend/model3-routing-service/`
- [ ] Build `build_navigation_grid(bbox, resolution)` — generate a grid of cells across the bbox, each cell storing lat/lon center
- [ ] Attach per-cell attributes: SIC (nearest `sea_ice_forecasts` cell for the relevant horizon day), distance to nearest `iceberg_predictions` point (Haversine), wave height/wind/current from mocked environmental data, vessel fuel info
- [ ] Implement **hard safety rules** (block cell if any is true): `SIC > 90%`, `iceberg_distance_km < 20`, `wave_height_m > 5`
- [ ] Implement **weighted cost function** on remaining safe cells:
  `Total Cost = 0.40×IceRisk + 0.30×IcebergRisk + 0.15×WaveRisk + 0.05×WindRisk + 0.05×CurrentRisk + 0.05×FuelCost`
- [ ] Implement iceberg distance risk banding: `<20km` blocked, `20–100km` inverse-distance risk, `>100km` near-zero risk
- [ ] Implement A* search over the grid (`networkx` or a hand-rolled priority-queue A*) from start cell to destination cell, 8-neighbour connectivity, minimizing accumulated cost
- [ ] Respect `risk_tolerance` (`Low/Medium/High`) by scaling the ice/iceberg risk weights (e.g., `Low` tolerance ⇒ amplify ice/iceberg weight terms; `High` tolerance ⇒ amplify fuel weight) — document the scaling factors chosen since these are prototype heuristics
- [ ] Compute route metrics: total distance, ETA (using `speed_knots`), cumulative fuel (`fuel_consumption_lph`), average SIC, min iceberg distance, max wave height, `overall_risk_score`
- [ ] Write ordered waypoints to `waypoints` table and per-segment scores to `risk_scores` table
- [ ] Handle the "no safe path exists" case → return `422 destination unreachable` per API spec

**Exit Criteria:**
- ✅ For a test start/destination pair, A* returns an ordered, non-empty waypoint list that never crosses a blocked cell
- ✅ `waypoints` and `risk_scores` tables populated correctly, respecting FK to `voyage_id`
- ✅ Changing `risk_tolerance` visibly changes the resulting route or its risk profile in at least one test case
- ✅ Unreachable-destination case returns `422`, not a crash

---

### Phase 7 — API Gateway Wiring: Full Voyage Pipeline (1.25 h)

**Owner:** Solo Dev — Backend Integration Engineer

**Steps:**
- [ ] Implement `POST /api/voyage` — validate per spec (`lat`/`lon` ranges, `speed_knots > 0` and `≤ vessel.max_speed_knots`, `departure_time ≥ now()`, `risk_tolerance ∈ {Low,Medium,High}`), insert `voyages` row with `status='processing'`, return `202` immediately
- [ ] Implement the async pipeline task triggered by voyage creation: `run_ingestion` → call Model 1 `/predict` → call Model 2 `/predict/{iceberg_id}` for each tracked iceberg in bbox → call Model 3 routing → update `voyages.status = 'planned'`
- [ ] Implement `GET /api/voyage/{voyage_id}/route` — return waypoints + totals; `409` if pipeline hasn't finished, `404` if voyage doesn't exist
- [ ] Implement `GET /api/voyages` — paginated list, filter by `status`
- [ ] Implement `GET /api/forecast/sea-ice` and `GET /api/forecast/icebergs` — GeoJSON FeatureCollection responses per spec, validated `bbox`/`day` params
- [ ] Wire owner/admin authorization checks (403 on cross-user access to `/route` and `/alerts`)
- [ ] Add basic vessel seed data (`POST` a couple of test vessels directly via SQL seed) so `POST /voyage` has a valid `vessel_id` to reference

**Exit Criteria:**
- ✅ Full round trip works: `POST /api/voyage` → poll `GET /api/voyage/{id}/route` → receive a complete route within a few seconds
- ✅ Forecast endpoints return valid GeoJSON consumable directly by Mapbox GL
- ✅ Authorization correctly blocks a second test user from reading the first user's voyage

---

### Phase 8 — Frontend Dashboard (3.25 h)

**Owner:** Solo Dev — Frontend Engineer

**Steps:**
- [ ] Scaffold Vite + React + TypeScript app, install Tailwind, Zustand, Mapbox GL JS (or Leaflet if no token), Recharts
- [ ] Build `services/api.ts` — typed REST client wrapping all endpoints from `API_REFERENCE.md`, with JWT attached from Zustand auth store
- [ ] Build login/register screen (minimal, functional — not the demo focus)
- [ ] Build `VoyageSetupForm/` — inputs for start/dest lat-lon (or a simple "click on map" UX if time allows), speed, fuel fields, departure time, risk-tolerance selector; client-side validation mirroring backend rules
- [ ] Build `MapView/` — Mapbox GL map rendering: route polyline (color-coded by per-segment risk), iceberg markers with confidence circles, SIC heatmap layer from forecast GeoJSON
- [ ] Build `ForecastPanel/` — day-by-day (1–7) timeline slider driving heatmap opacity and iceberg confidence-circle radius (per `F5` uncertainty visualization spec)
- [ ] Build `RouteDetail/` — waypoint table, ETA, total fuel estimate, per-leg risk score
- [ ] Build `AlertsPanel/` — list of alerts for the active voyage, acknowledge button wired to `PATCH /api/alerts/{alert_id}/acknowledge`
- [ ] Wire `hooks/useVoyage`, `useForecast`, `useAlerts` to poll/fetch from the API client
- [ ] Add the trade-off slider (Safest / Balanced / Most Fuel-Efficient) as a **visual/UX element** mapped to `risk_tolerance` on voyage creation (full live re-optimization on drag is backlog — see Section 9)

**Exit Criteria:**
- ✅ End-to-end demo works fully in-browser: login → submit voyage → see route render on map with heatmap + iceberg markers → scrub forecast slider → view route detail table → see at least one alert
- ✅ No console errors on the happy path
- ✅ Responsive enough to demo on a laptop screen without layout breakage

---

### Phase 9 — Alerts & Live Updates (0.75 h)

**Owner:** Solo Dev — Backend Integration Engineer

**Steps:**
- [ ] Implement `backend/alerts-service/` minimal logic: a re-score function that compares the active route's cells against the latest forecast/iceberg data and inserts an `alerts` row when a threshold is crossed (e.g., a new iceberg prediction lands within 20km of an existing waypoint)
- [ ] Seed 1–2 deliberately-triggering scenarios for the demo (e.g., a mocked iceberg prediction placed near a known waypoint) so the alert reliably fires during the live demo
- [ ] Implement `GET /api/alerts/{voyage_id}` and `PATCH /api/alerts/{alert_id}/acknowledge` per spec
- [ ] Wire a simple polling interval (e.g., 15s) on the frontend `AlertsPanel` instead of full WebSocket (WebSocket/queue-based push is backlog)

**Exit Criteria:**
- ✅ At least one alert type (`iceberg_proximity`) reliably fires for the seeded demo scenario
- ✅ Acknowledging an alert in the UI updates its state and persists on refresh

---

### Phase 10 — Testing, Polish, Demo Script (1.0 h)

**Owner:** Solo Dev — QA / Release Engineer

**Steps:**
- [ ] Run a full manual smoke test of the happy path end-to-end (register → login → create voyage → view route → scrub forecast → acknowledge alert)
- [ ] Test 2–3 edge cases: invalid lat/lon, unreachable destination (`422`), unauthenticated access (`401`), cross-user voyage access (`403`)
- [ ] Fix any blocking bugs found; log non-blocking issues directly to Section 9 (backlog) instead of fixing now
- [ ] Write the final `README.md`: project summary, architecture diagram (reuse the provided one), setup instructions, known limitations (mock ingestion, prototype safety thresholds — explicitly note these, since judges value honesty about scope), and the operational disclaimer from `REPO_AND_DEPLOYMENT.md`
- [ ] Write a 3–5 minute demo script/talk track hitting: problem → architecture → live voyage creation → route + uncertainty visualization → alert firing → USPs (dual-hazard fusion, uncertainty communication, fuel/risk trade-off)
- [ ] (If time remains) Add a minimal GitHub Actions workflow: lint + build check on push

**Exit Criteria:**
- ✅ Happy path runs clean twice in a row from a fresh state
- ✅ README accurately describes what is real vs. mocked (no overclaiming to judges)
- ✅ Demo script rehearsed at least once, fits in time limit

---

### Phase 11 — Deployment (1.0 h)

**Owner:** Solo Dev — Deployment Engineer

**Steps:**
- [ ] Finalize `docker-compose.yml` covering: `postgres` (PostGIS), `api-gateway`, `model1-seaice-service`, `model2-iceberg-service`, `model3-routing-service`, `alerts-service`, `frontend` (built static bundle served via nginx or `vite preview`)
- [ ] Run `docker compose up --build` locally and confirm every service is healthy (`/health` checks)
- [ ] Choose deployment target based on remaining time:
  - **Preferred (if ≥40 min left):** Deploy backend services to a free-tier cloud host (Render/Railway/Fly.io) + frontend to Vercel/Netlify, DB on a managed Postgres+PostGIS free tier (Supabase/Neon with PostGIS enabled)
  - **Fallback (if <40 min left):** Fully-working local Docker Compose demo — acceptable for hackathon judging when network/cloud setup risk outweighs benefit
- [ ] Update README with the live URL (if deployed) or explicit "run locally via `docker compose up`" instructions
- [ ] Final smoke test against the deployed (or freshly-rebuilt local) environment
- [ ] Tag the release commit (`git tag v1.0-sih2026`) and push

**Exit Criteria:**
- ✅ A judge can either open a live URL or run one command (`docker compose up --build`) and reach a working dashboard
- ✅ Final smoke test passes on the actual deployment target, not just dev machine
- ✅ Repo tagged and pushed; README reflects the true, final state of the system

---

## 7. Definition of Done (Demo-Ready Checklist)

- [ ] User can register and log in
- [ ] User can submit a voyage via the form
- [ ] Sea-ice forecast (Model 1) produces 7-day values and renders as a heatmap
- [ ] Iceberg trajectory (Model 2) produces 7-day predicted positions with growing confidence radius
- [ ] Route (Model 3) is computed via A*, respects hard safety rules, and renders on the map with per-segment risk coloring
- [ ] Forecast uncertainty slider (Day 1 → Day 7) visibly changes heatmap opacity and iceberg circle radius
- [ ] At least one alert fires and can be acknowledged
- [ ] Risk-tolerance selection visibly affects the computed route or its metrics
- [ ] README clearly states what's mocked vs. real, and includes the operational disclaimer
- [ ] System is reachable — deployed or one-command local run — for judging

---

## 8. Risk Register & Fallback Plan

| Risk | Likelihood | Impact | Fallback |
|---|---|---|---|
| Trained model files (`.keras`/`.pkl`) not actually available | Medium | High | Use the stub predictors defined in Phase 4/5 — same interface, mocked output, clearly logged. Pipeline stays demoable. |
| PostGIS/geometry setup issues eat time | Medium | Medium | Fall back to plain `lat`/`lon FLOAT` columns instead of `GEOMETRY` types for the 15h build; note PostGIS migration as backlog. Loses spatial indexing but unblocks the demo. |
| Mapbox token unavailable/rate-limited | Low | Medium | Swap to Leaflet + free OSM tiles (`react-leaflet`) — same component API surface, minimal rework. |
| A* implementation runs too slow on a fine grid | Medium | Medium | Coarsen grid resolution for the demo bbox; document resolution as a tunable, prototype-scoped parameter. |
| Cloud deployment fails/takes too long | Medium | High | Ship the local Docker Compose demo (Phase 11 fallback) — fully acceptable, judges can run it live. |
| Running behind schedule by Phase 6 | Medium | High | Cut Phase 9 (Alerts) down to a single hardcoded/seeded alert row (no live re-score loop) to protect Phase 8/11. |
| WebSocket/live-push complexity | Low | Low | Already scoped out — polling only for the 15h build (see Phase 9). |

---

## 9. Post-Hackathon Backlog

Explicitly **not** in the 15-hour scope — track these as GitHub Issues immediately after submission so the roadmap above stays honest about what was actually built:

- Live connectors to NSIDC, EUMETSAT OSI SAF, CMEMS, ERA5 (`cdsapi`), NIC/BYU iceberg DB
- Real EASE-Grid 2.0 regridding + fusion service (currently mocked pass-through)
- Airflow DAG orchestration for ingestion → fusion → model pipeline (currently direct synchronous calls)
- WebSocket/Redis pub-sub push for live alerts (currently polling)
- Full PostGIS spatial indexing if the FLOAT-column fallback was used
- LLM-based explainability layer for the fuel-vs-risk trade-off slider
- Email/SMS alert notifications (SES/SendGrid, Twilio)
- Offline/low-bandwidth client-side caching mode
- Model retraining pipeline with automated backtest safety gate
- Arctic-region extensibility (retrain Models 1 & 2 only, per architecture principle)
- Proper CI/CD with test coverage gates, branch protection, PR review flow
- Validation of prototype safety thresholds (SIC > 90%, iceberg < 20km, wave > 5m) against real maritime/polar navigation guidelines

---

*This document is derived from and consistent with: `PROJECT_OVERVIEW.md`, `ARCHITECTURE.md`, `FEATURES.md`, `DATA_SOURCES.md`, `DATABASE_SCHEMA.md`, `API_REFERENCE.md`, `MODEL_INTEGRATION_GUIDE.md`, `TECH_STACK.md`, `REPO_AND_DEPLOYMENT.md`.*
