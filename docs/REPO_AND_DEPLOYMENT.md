# HimDrishti — Repository Structure & Deployment

> Monorepo layout, service boundaries, deployment strategy, and external integrations.

---

## Repository Structure

Service-oriented monorepo — one folder per deployable backend service, independently containerized.

```
himdrishti/
├── frontend/                        # React + Mapbox GL dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoyageSetupForm/     # Voyage input form + validation
│   │   │   ├── MapView/             # Map, route, icebergs, heatmap
│   │   │   ├── ForecastPanel/       # 7-day SIC forecast + slider
│   │   │   ├── AlertsPanel/         # Live alert banners + history
│   │   │   └── RouteDetail/         # Waypoint table, ETA, fuel, risk
│   │   ├── hooks/                   # useVoyage, useForecast, useAlerts
│   │   ├── services/                # api.ts — typed REST client
│   │   └── store/                   # Global state (voyage, forecast, alerts)
│   └── package.json
│
├── backend/
│   ├── api-gateway/                 # Public REST API — auth, routing, validation
│   ├── ingestion-service/           # Scheduled pulls from external data providers
│   │   └── connectors/              # nsidc.py, cmems.py, era5.py, nic_iceberg.py, gebco.py
│   ├── fusion-service/              # Regrid, clean, align, merge all data sources
│   ├── model1-seaice-service/       # SIC forecasting microservice
│   ├── model2-iceberg-service/      # Iceberg trajectory prediction microservice
│   ├── model3-routing-service/      # Risk/cost scoring + route optimization
│   └── alerts-service/              # Rerouting/alert trigger logic
│
├── ml/
│   ├── notebooks/                   # Exploratory analysis, model prototyping
│   ├── datasets/                    # Dataset loaders shared by Model 1/2
│   └── evaluation/                  # Backtesting scripts against hold-out data
│
├── infra/                           # Docker, Kubernetes, Terraform, Airflow config
├── db/                              # SQL migrations and seed data
├── tests/                           # Unit, integration, E2E tests
├── docs/                            # Documentation (this folder)
├── docker-compose.yml               # Local multi-service dev environment
└── README.md
```

---

## Backend Services

| Service | Language | Purpose |
|---|---|---|
| `api-gateway` | Node.js (Express) / FastAPI | Public REST endpoints, JWT auth, validation, request routing |
| `ingestion-service` | Python | Scheduled data pulls from NSIDC, CMEMS, ERA5, NIC, GEBCO |
| `fusion-service` | Python | Regrid to EASE-Grid 2.0, QC, merge on lat/lon/time |
| `model1-seaice-service` | Python (FastAPI) | SIC forecast inference (ConvLSTM/U-Net) |
| `model2-iceberg-service` | Python (FastAPI) | Iceberg trajectory prediction (GRU ensemble + physics) |
| `model3-routing-service` | Python (FastAPI) | Risk scoring + A* route optimization |
| `alerts-service` | Python | Rerouting/alert triggers, scheduled re-scoring |

---

## External Integrations

| Category | Integration | Purpose |
|---|---|---|
| **Government/Scientific APIs** | NSIDC, EUMETSAT OSI SAF | SIC and ice-edge data (AMSR2) |
| | Copernicus Marine Service (CMEMS) | SST, ocean currents, wave data |
| | Copernicus CDS (ERA5 via cdsapi) | Wind, temperature, pressure reanalysis |
| | BYU / NIC Iceberg Tracking DB | Historical and near-real-time iceberg positions |
| | US NGA World Port Index | Valid start/destination port locations |
| **Geospatial Reference** | Natural Earth (coastline), GEBCO (bathymetry) | Land-mask exclusion, depth clearance |
| **Maps** | Mapbox GL JS (Leaflet fallback) | Interactive map rendering |
| **Auth** | JWT + optional OAuth2/OIDC | Login and role-based access |
| **Storage** | AWS S3 / MinIO | Raw satellite/reanalysis file storage |
| **Notifications (Phase 2)** | Email (SES/SendGrid), SMS (Twilio) | Push critical alerts |
| **AI APIs** | None external | All inference is self-hosted |
| **Payment** | Not applicable | Internal tool, no transactions |

---

## Deployment Architecture

### Environment Strategy

| Environment | Purpose | Notes |
|---|---|---|
| **Local** | Developer machines | All services + Postgres/PostGIS + Redis via `docker-compose`; mocked external connectors |
| **Staging** | Integration testing | Full pipeline against limited historical replay; auto-deployed from `main` |
| **Production** | Live NCPOR/MoES use | Manual approval gate; blue-green/canary rollout for model-serving |

### Scaling Approach

1. **Model-serving services** — horizontally scaled via Kubernetes HPA (request queue depth / CPU)
2. **Region-scoped inference** — SIC forecast limited to route bounding box (not full polar grid)
3. **Time-partitioned storage** — raw files partitioned by date/source in S3; fused table partitioned by time in PostgreSQL
4. **Offline/low-bandwidth mode** — dashboard caches last-fetched route + alerts client-side for connectivity loss
5. **Seasonal retraining** — bounded compute; new checkpoint gated by automated backtest
6. **Decoupled models** — scale/upgrade one without redeploying others; extend to Arctic by retraining Models 1 & 2 only

### Infrastructure Stack

```
┌─────────────────────────────────────────────┐
│              CDN (static assets)            │
├─────────────────────────────────────────────┤
│         Kubernetes Cluster (Helm)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │API Gateway│ │ Model 1  │ │ Model 2  │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Model 3  │ │Ingestion │ │ Alerts   │    │
│  └──────────┘ └──────────┘ └──────────┘    │
├─────────────────────────────────────────────┤
│  PostgreSQL/PostGIS  │  Redis  │  Airflow  │
├─────────────────────────────────────────────┤
│          S3 Object Storage (raw data)       │
└─────────────────────────────────────────────┘
```

---

## CI/CD Pipeline

```
PR opened → GitHub Actions:
  ├── Lint (ESLint, flake8)
  ├── Unit tests (Jest, pytest)
  ├── Build Docker images
  └── Integration tests (Testcontainers)

PR merged to main → 
  ├── Push images to registry
  ├── Auto-deploy to Staging
  └── (Manual gate) → Deploy to Production (Helm upgrade)
```

---

## Operational Disclaimer

> HimDrishti is a **decision-support / research prototype**. It is not an autonomous navigation system. All recommended routes must be validated against official maritime and polar navigation procedures before real-world use. The system augments, but does not replace, the judgement of the ship's officers.

---

*Source: [HimDrishti_Project_Document.docx](file:///e:/Projects/HimDrishti/docs/HimDrishti_Project_Document.docx)*
