# HimDrishti — Antarctic Maritime Intelligence & Route Optimization Platform

![HimDrishti Banner](https://img.shields.io/badge/HimDrishti-Antarctic%20Command-00daf3?style=for-the-badge&logo=compass&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?style=for-the-badge&logo=three.js)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?style=for-the-badge&logo=postgresql)

---

## 📌 Executive Summary

**HimDrishti** is an AI-powered maritime intelligence and route optimization platform built specifically for hostile Antarctic operational environments (McMurdo Station, Ross Sea, Drake Passage, Cape Horn).

Navigating polar waters poses extreme hazards: fast-consolidating sea ice (SIC > 90%), drifting icebergs, unpredictable blizzards, and structural hull breach risks. HimDrishti addresses these challenges by fusing real-time multi-spectral satellite telemetry, deep learning sea-ice forecasting, iceberg trajectory prediction models, and an A* spatial routing engine with natural language LLM explainability.

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
- **Model 3 LLM Explainability Box**: Displays generated natural language routing reasoning and safety recommendations.
- **Per-Leg Risk Breakdown**: Detailed waypoint table showing sequence, LAT/LON, ETA UTC, cumulative fuel, and leg-by-leg risk factors (`ICE RISK`, `ICEBERG RISK`, `WEATHER RISK`, `LEG RISK SCORE`).
- **Filter Search**: Coordinate search filter input box.

---

## 🏗️ System Architecture & Tech Stack

```
                        +---------------------------------------+
                        |        React 18 + Vite Frontend       |
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
                        |     + LLM Explainability Service      |
                        +-------------------+-------------------+
                                            |
                                    SQLAlchemy ORM
                                            |
                        +-------------------v-------------------+
                        |         PostgreSQL 18 Database        |
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
├── db/
│   └── migrations/
│       └── 001_init.sql        # PostgreSQL Schema & Seed Records
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── landing/ThreePolarScene.tsx  # 1:1 Three.js 3D Canvas
│   │   │   └── layout/AppLayout.tsx          # Sidebar Nav & Top App Bar
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
│   ├── index.html
│   └── vite.config.ts
├── ml/                                      # Machine Learning artifacts
├── docker-compose.yml
└── README.md
```

---

## ⚡ Quick Start & Execution Guide

### Prerequisites
- **Node.js**: v18.x or higher
- **Python**: v3.12.x
- **PostgreSQL**: v18 (or standard PostgreSQL 14+)

---

### Step 1: Database Initialization
Ensure local PostgreSQL is running on `localhost:5432` (database: `himdrishti`, user: `postgres`, password: `root`). Run the migration script:

```powershell
$env:PGPASSWORD="root"; & "D:\PostgreSQL\18\bin\psql.exe" -U postgres -d himdrishti -f "e:\Antigravity\HimDrishti\db\migrations\001_init.sql"
```

---

### Step 2: Start Backend Microservices

Open 4 separate terminals to launch the backend services:

#### **Terminal 1: API Gateway (Port 8000)**
```powershell
cmd /c "cd /d e:\Antigravity\HimDrishti\backend\api-gateway && C:\Users\shiva\AppData\Local\Programs\Python\Python312\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
```

#### **Terminal 2: Model 1 — Sea-Ice Service (Port 8001)**
```powershell
cmd /c "cd /d e:\Antigravity\HimDrishti\backend\model1-seaice-service && C:\Users\shiva\AppData\Local\Programs\Python\Python312\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"
```

#### **Terminal 3: Model 2 — Iceberg Service (Port 8002)**
```powershell
cmd /c "cd /d e:\Antigravity\HimDrishti\backend\model2-iceberg-service && C:\Users\shiva\AppData\Local\Programs\Python\Python312\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload"
```

#### **Terminal 4: Model 3 — A* Routing Service (Port 8003)**
```powershell
cmd /c "cd /d e:\Antigravity\HimDrishti\backend\model3-routing-service && C:\Users\shiva\AppData\Local\Programs\Python\Python312\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8003 --reload"
```

---

### Step 3: Start Frontend Application

Open a 5th terminal to start the React Vite dev server:

#### **Terminal 5: React / Vite App (Port 5173)**
```powershell
cmd /c "cd /d e:\Antigravity\HimDrishti\frontend && npx vite"
```

---

### Step 4: Open in Web Browser
Open your browser to: 👉 **`http://localhost:5173`**

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

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user (`planner` or `mariner`) |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT access token |
| `POST` | `/api/voyage` | Create voyage & trigger async Model 1 → 2 → 3 pipeline |
| `GET` | `/api/voyage/{id}/route` | Retrieve computed waypoints, ETA, fuel, and risk scores |
| `GET` | `/api/forecast/sea-ice` | Retrieve 7-day predicted Sea-Ice GeoJSON heatmaps |
| `GET` | `/api/forecast/icebergs` | Retrieve 7-day predicted Iceberg drift markers |
| `PATCH` | `/api/alerts/{id}/acknowledge` | Acknowledge active diagnostic warning alert |
| `GET` | `:8003/route/{id}/recommendation` | Retrieve Model 3 LLM explainability & safety rationale |

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for details.
