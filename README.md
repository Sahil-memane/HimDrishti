# HimDrishti — Antarctic Maritime Intelligence & Route Optimization Platform

![HimDrishti Banner](https://img.shields.io/badge/HimDrishti-Antarctic%20Command-00daf3?style=for-the-badge&logo=compass&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?style=for-the-badge&logo=typescript)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?style=for-the-badge&logo=three.js)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostGIS-15-4169E1?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)

---

## 📌 Executive Summary

**HimDrishti** is an AI-powered maritime intelligence and route optimization platform built specifically for hostile Antarctic operational environments (McMurdo Station, Ross Sea, Drake Passage, Cape Horn).

Navigating polar waters poses extreme hazards: fast-consolidating sea ice (SIC > 90%), drifting icebergs, unpredictable blizzards, and structural hull breach risks. HimDrishti addresses these challenges by fusing real-time multi-spectral satellite telemetry, deep learning sea-ice forecasting, iceberg trajectory prediction models, and an A* spatial routing engine with natural language LLM explainability (powered by Mistral AI).

---

## ✨ Key Features & Capabilities

### 🚢 1. 1:1 Three.js 3D Polar Ocean Canvas (`/`)
- **WebGL Simulation**: Real-time rendering of a container ship model navigating a procedural 3D polar ocean with wave tilt animations and bioluminescent cyan icebergs.
- **Scroll-Driven Camera**: Smooth camera spline path interpolation as users scroll through the landing sequence.
- **Dual UI Modes**: Single-click top bar switcher between **3D Scene UI** and **Minimal UI**.

### 🔐 2. Authentication Gateway (`/login`)
- **Role-Based Access Control**: Supports **Strategic Planners** (fleet-wide route optimization) and **Field Mariners** (bridge navigation).
- **JWT Security**: Encrypted password hashing (Bcrypt) and JSON Web Tokens.
- **Demo Mode**: Includes a **Skip to Demo (Bypass Auth)** option for quick testing and demonstration.

### 🗺️ 3. Voyage Setup Protocol (`/setup`)
- **Coordinate Validation**: Inputs origin and destination coordinates (LAT/LON) with strict boundary validation.
- **Vessel Telemetry**: Configures vessel selection, cruising speed (KTS), fuel rate (LPH), fuel capacity (L), and departure datetime.
- **Risk Preference Profiles**:
  - `SAFEST`: Bypasses all ice hazards regardless of distance.
  - `BALANCED`: Optimizes fuel consumption while maintaining strict structural safety margins.
  - `EFFICIENT`: Prioritizes shortest passage duration.

### 🧭 4. Decision Support Dashboard (`/dashboard`)
- **Interactive Route Map**: SVG route polyline connecting computed waypoints over a dark polar map canvas.
- **Map Overlays**: Checkbox toggles for *Sea-Ice (SIC)*, *Icebergs*, and *Risk Zones*.
- **Live Telemetry Bar**: Active route metrics (ETA target, estimated fuel, speed in KTS, heading in HDG, and overall risk index meter).
- **Model 3 AI Rationale**: Natural language AI explanation for waypoint selection.

### 📅 5. 7-Day Forecast Timeline (`/forecast`)
- **Predictive Time Scrubbing**: Forward projection slider (Day 1 through Day 7) for sea-ice drift and iceberg trajectories.
- **Confidence Decay Readout**: Dynamic display of predictive model confidence decaying from `94.2%` (Day 1) down to `42.8%` (Day 7) with color indicator shifts (`Cyan` → `Amber` → `Red`).
- **Auto-Play Stepper**: Automatically loops through Days 1 to 7 to visually inspect ice drift patterns.

### ⚠️ 6. Live Diagnostics & Alerts (`/alerts`)
- **Real-Time Monitor**: Streaming status drawer displaying severity-graded anomaly cards (`Hull Integrity Breach Risk`, `Thermal Deviation Detected`, `Routine Comms Sync`).
- **One-Click Acknowledgement**: Functional acknowledgment triggers calling backend REST APIs to update alert states and decrement active alert badges.

### 📊 7. Route Analysis & Voyage Manifest (`/analytics`)
- **KPI Summary**: Total distance (KM), total ETA, estimated fuel burn (L), and overall risk score.
- **Model 3 LLM Explainability Box**: Displays generated natural language routing reasoning and safety recommendations (Mistral AI).
- **Per-Leg Risk Breakdown**: Detailed waypoint table showing sequence, LAT/LON, ETA UTC, cumulative fuel, and leg-by-leg risk factors (`ICE RISK`, `ICEBERG RISK`, `WEATHER RISK`, `LEG RISK SCORE`).
- **Filter Search**: Coordinate search filter input box.

---

## 🏗️ System Architecture & Tech Stack

```
                        +---------------------------------------+
                        |        React 19 + Vite Frontend       |
                        | (Three.js, Tailwind, TypeScript, TSX) |
                        +-------------------+-------------------+
                                            |
                                  REST API / JWT Auth
                                            |
                        +-------------------v-------------------+
                        |         Python API Gateway            |
                        |      (FastAPI / Uvicorn :8000)        |
                        +---------+-----------------+-----------+
                                  |                 |
             +--------------------+                 +--------------------+
             |                                                           |
+------------v------------+                                 +------------v------------+
| Model 1: Sea-Ice (8001) |                                 | Model 2: Iceberg (8002) |
|  (LSTM Neural Network)  |                                 | (GRU + Physics Drift)   |
+------------+------------+                                 +------------+------------+
             |                                                           |
             +--------------------+                 +--------------------+
                                  |                 |
                        +---------v-----------------v-----------+
                        |   Model 3: A* Routing Engine (8003)   |
                        |     + LLM Explainability (Mistral)    |
                        +-------------------+-------------------+
                                            |
                                    SQLAlchemy ORM
                                            |
                        +-------------------v-------------------+
                        |    PostGIS 15 (PostgreSQL + Spatial)  |
                        | (10 Core Tables + Spatial Literals)   |
                        +---------------------------------------+
```

---

## 📁 Repository Directory Structure

```text
HimDrishti/
├── backend/
│   ├── api-gateway/            # FastAPI API Gateway (Port 8000)
│   │   ├── main.py             # App entrypoint & CORS config
│   │   ├── routes_auth.py      # /api/auth/register & /api/auth/login
│   │   ├── routes_voyage.py    # /api/voyage & /api/voyage/{id}/route
│   │   ├── routes_forecast.py  # /api/forecast/sea-ice & /api/forecast/icebergs
│   │   ├── routes_alerts.py    # /api/alerts/{id}/acknowledge
│   │   ├── auth.py             # JWT token handling & Bcrypt hashing
│   │   ├── pipeline.py         # Async Model 1 → Model 2 → Model 3 pipeline
│   │   └── models.py           # SQLAlchemy ORM models
│   ├── model1-seaice-service/  # Sea-Ice Forecast Service (Port 8001)
│   ├── model2-iceberg-service/ # Iceberg Trajectory Service (Port 8002)
│   └── model3-routing-service/ # A* Routing & LLM Recommendation Service (Port 8003)
│       ├── main.py             # FastAPI entrypoint, /route & /route/{id}/recommendation
│       ├── llm_service.py      # Mistral AI LLM integration for route explainability
│       ├── engine.py           # A* search algorithm implementation
│       ├── grid.py             # Navigation grid builder
│       ├── cost.py             # Cost function for A* routing
│       └── db.py               # SQLAlchemy session & ORM models
├── db/
│   └── migrations/
│       └── 001_init.sql        # PostgreSQL Schema & Seed Records
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── landing/ThreePolarScene.tsx  # 1:1 Three.js 3D Canvas
│   │   │   └── layout/AppLayout.tsx         # Sidebar Nav & Top App Bar
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx              # Master Landing Page Switcher
│   │   │   ├── LandingPageVariant1.tsx      # Minimal UI Landing Page
│   │   │   ├── LandingPageVariant2.tsx      # 3D Scene UI Landing Page
│   │   │   ├── LoginPage.tsx                # Auth Gateway & Registration
│   │   │   ├── VoyageSetupPage.tsx          # Voyage Setup Parameter Form
│   │   │   ├── DashboardPage.tsx            # Tactical Decision Support Dashboard
│   │   │   ├── ForecastPage.tsx             # 7-Day Forecast Timeline
│   │   │   ├── AlertsPage.tsx               # Live Diagnostics & Risk Alerts
│   │   │   └── AnalyticsPage.tsx            # Manifest & Per-Leg Risk Breakdown
│   │   ├── services/api.ts                  # REST API Client & Fallbacks
│   │   ├── store/useStore.ts                # Zustand State Stores
│   │   └── App.tsx                          # React Router configuration
│   ├── Dockerfile              # Multi-stage build (Vite build → serve)
│   ├── index.html
│   └── vite.config.ts
├── ml/                         # Machine Learning artifacts
├── .env.example                # Environment variable template
├── docker-compose.yml          # Full-stack container orchestration
└── README.md
```

---

## ⚡ Quick Start — Docker (Recommended)

> **This is the standardized execution method for all team members.**
> All 7 services (PostgreSQL, pgAdmin, API Gateway, Model 1, Model 2, Model 3, Frontend) are containerized and orchestrated via a single `docker-compose up` command.

### Prerequisites

| Tool             | Version   | Install Link                                     |
| :--------------- | :-------- | :----------------------------------------------- |
| **Docker**       | 24.x+     | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) |
| **Docker Compose** | v2.20+  | Bundled with Docker Desktop                      |
| **Git**          | 2.x+      | [git-scm.com](https://git-scm.com/)              |

> **Note:** You do **not** need Node.js, Python, or PostgreSQL installed locally when using Docker.

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/Sahil-memane/HimDrishti.git
cd HimDrishti
```

---

### Step 2: Configure Environment Variables

Copy the template and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```dotenv
DATABASE_URL=postgresql://postgres:HimDrishti_Secure_DB_2026@localhost:5435/himdrishti
DB_PASSWORD=HimDrishti_Secure_DB_2026
JWT_SECRET=<generate-a-random-256-bit-hex-string>
MAPBOX_TOKEN=<your-mapbox-public-token>
MISTRAL_API_KEY=<your-mistral-api-key>
```

| Variable          | Description                                                                 |
| :---------------- | :-------------------------------------------------------------------------- |
| `DB_PASSWORD`     | PostgreSQL password (used by all backend services inside Docker)            |
| `JWT_SECRET`      | Secret key for signing JWT auth tokens (generate via `openssl rand -hex 32`) |
| `MAPBOX_TOKEN`    | Mapbox GL JS public access token for map rendering                          |
| `MISTRAL_API_KEY` | Mistral AI API key for Model 3 LLM route explainability                     |

> **Tip — Generate a JWT secret:**
> ```bash
> openssl rand -hex 32
> ```

---

### Step 3: Build & Launch All Services

```bash
docker compose up --build
```

> First build may take 3–5 minutes (downloading base images, installing dependencies).
> Subsequent runs use Docker layer cache and start in seconds.

Wait until you see all services report healthy/ready in the terminal output:

```
postgres    | LOG:  database system is ready to accept connections
api-gateway | INFO:  Uvicorn running on http://0.0.0.0:8000
model1      | INFO:  Uvicorn running on http://0.0.0.0:8001
model2      | INFO:  Uvicorn running on http://0.0.0.0:8002
model3      | INFO:  Uvicorn running on http://0.0.0.0:8003
frontend    | INFO:  Accepting connections at http://localhost:3001
```

---

### Step 4: Access the Application

| Service              | URL                          | Description                        |
| :------------------- | :--------------------------- | :--------------------------------- |
| **Frontend (Web UI)**| http://localhost:3001         | Main HimDrishti web application    |
| **API Gateway**      | http://localhost:8010         | FastAPI backend (Swagger: `/docs`) |
| **Model 1 (Sea-Ice)**| http://localhost:8001         | Sea-Ice Forecast microservice      |
| **Model 2 (Iceberg)**| http://localhost:8002         | Iceberg Trajectory microservice    |
| **Model 3 (Routing)**| http://localhost:8003         | A* Routing + LLM explainability    |
| **pgAdmin**          | http://localhost:5050         | Database admin panel               |
| **PostgreSQL**       | `localhost:5435`              | Direct DB connection (mapped port) |

---

### Step 5: Stop All Services

```bash
# Graceful shutdown (preserves data volumes)
docker compose down

# Full teardown including database volume (⚠️ deletes all data)
docker compose down -v
```

---

## 🔄 Execution Sequence (Pipeline Flow)

Understanding how the system processes a voyage request end-to-end:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER (Browser @ :3000)                       │
│  1. Login/Register  →  2. Setup Voyage  →  3. View Dashboard       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ POST /api/voyage
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (FastAPI @ :8010)                     │
│                                                                      │
│  • Validates JWT auth token                                          │
│  • Creates Voyage record in PostgreSQL                               │
│  • Triggers background pipeline (pipeline.py):                       │
│                                                                      │
│    ┌─────────────────────────────────────────────────────────────┐   │
│    │  PIPELINE ORCHESTRATOR (async background task)              │   │
│    │                                                             │   │
│    │  Step 1: Model 1 (Sea-Ice) — pre-seeded on startup         │   │
│    │          Sea-ice concentration forecasts already in DB      │   │
│    │                          ↓                                  │   │
│    │  Step 2: POST http://model2:8002/seed                      │   │
│    │          Generates iceberg trajectory predictions           │   │
│    │          Writes to iceberg_predictions table                │   │
│    │                          ↓                                  │   │
│    │  Step 3: POST http://model3:8003/route                     │   │
│    │          A* routing engine computes optimal path            │   │
│    │          Writes waypoints + risk_scores to DB               │   │
│    │                          ↓                                  │   │
│    │  Step 4: voyage.status → "planned"                         │   │
│    └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│               MODEL 3: LLM EXPLAINABILITY (@ :8003)                  │
│                                                                      │
│  GET /route/{voyage_id}/recommendation                               │
│                                                                      │
│  1. Fetches Model 1 + Model 2 + Model 3 outputs from PostgreSQL     │
│  2. Builds structured prompt with all model data                     │
│  3. Calls Mistral AI API (mistral-small-latest)                      │
│  4. Returns JSON: best_route, risk analysis, fuel, ETA, reasoning    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Local Development (Without Docker)

> Use this only if you need to debug individual services. Docker is the recommended approach.

### Prerequisites
- **Node.js** v20.x+
- **Python** v3.11+
- **PostgreSQL** v15+ with PostGIS extension

### Backend Services

Each backend service runs as an independent FastAPI/Uvicorn server. Open separate terminals for each:

```bash
# Terminal 1: API Gateway (Port 8000)
cd backend/api-gateway
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Model 1 — Sea-Ice Service (Port 8001)
cd backend/model1-seaice-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3: Model 2 — Iceberg Service (Port 8002)
cd backend/model2-iceberg-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8002 --reload

# Terminal 4: Model 3 — A* Routing + LLM Service (Port 8003)
cd backend/model3-routing-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```

### Frontend

```bash
# Terminal 5: Vite Dev Server (Port 5173)
cd frontend
npm install
npm run dev
```

Open your browser to: 👉 **http://localhost:5173**

> **Note:** When running locally, update `DATABASE_URL` in `.env` to point to `localhost:5432` (native PostgreSQL) instead of `localhost:5435` (Docker-mapped port).

---

## 🔑 Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| Strategic Planner | `planner@himdrishti.dev` | `Password123!` |
| Strategic Planner | `commander.explorer@himdrishti.dev` | `Password123!` |
| Field Mariner | `captain.polar@himdrishti.dev` | `Password123!` |

*(You can also use the **`Skip to Demo (Bypass Auth) →`** button on the Login page for instant access).*

---

## 🛰️ API Reference Summary

| Method | Endpoint | Port | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | 8010 | Register a new user (`planner` or `mariner`) |
| `POST` | `/api/auth/login` | 8010 | Authenticate and obtain JWT access token |
| `POST` | `/api/voyage` | 8010 | Create voyage & trigger async Model 1 → 2 → 3 pipeline |
| `GET` | `/api/voyage/{id}/route` | 8010 | Retrieve computed waypoints, ETA, fuel, and risk scores |
| `GET` | `/api/forecast/sea-ice` | 8010 | Retrieve 7-day predicted Sea-Ice GeoJSON heatmaps |
| `GET` | `/api/forecast/icebergs` | 8010 | Retrieve 7-day predicted Iceberg drift markers |
| `PATCH` | `/api/alerts/{id}/acknowledge` | 8010 | Acknowledge active diagnostic warning alert |
| `GET` | `/route/{id}/recommendation` | 8003 | Model 3 LLM explainability & safety rationale (Mistral AI) |

---

## 🐳 Docker Services Reference

| Service      | Image / Build Context               | Internal Port | External Port | Description                            |
| :----------- | :----------------------------------- | :------------ | :------------ | :------------------------------------- |
| `postgres`   | `postgis/postgis:15-3.4`            | 5432          | 5435          | PostGIS database with spatial support  |
| `pgadmin`    | `dpage/pgadmin4`                    | 80            | 5050          | Database administration UI             |
| `api-gateway`| `./backend/api-gateway`             | 8000          | 8010          | FastAPI API Gateway                    |
| `model1`     | `./backend/model1-seaice-service`   | 8001          | 8001          | Sea-Ice LSTM forecast service          |
| `model2`     | `./backend/model2-iceberg-service`  | 8002          | 8002          | Iceberg GRU trajectory service         |
| `model3`     | `./backend/model3-routing-service`  | 8003          | 8003          | A* routing + Mistral LLM service       |
| `frontend`   | `./frontend`                        | 3000          | 3001          | React/Vite web application             |

---

## 🔐 Environment Variables Reference

| Variable          | Required | Used By                   | Description                                              |
| :---------------- | :------- | :------------------------ | :------------------------------------------------------- |
| `DB_PASSWORD`     | ✅       | postgres, api-gateway, model1, model2, model3 | PostgreSQL password                     |
| `JWT_SECRET`      | ✅       | api-gateway               | Secret for signing/verifying JWT tokens                  |
| `MAPBOX_TOKEN`    | ✅       | frontend                  | Mapbox GL JS public access token                         |
| `MISTRAL_API_KEY` | ✅       | model3                    | Mistral AI API key for LLM route explainability          |
| `DATABASE_URL`    | ⬜       | local dev only            | Full PostgreSQL connection string (auto-set in Docker)   |

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for details.
