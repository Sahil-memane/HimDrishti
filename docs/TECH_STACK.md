# HimDrishti — Technology Stack

> Complete technology inventory across all layers of the platform.

---

## Frontend

| Layer | Technology | Purpose |
|---|---|---|
| Framework | **React 18 + TypeScript** | Component-based dashboard UI |
| Mapping | **Mapbox GL JS** (Leaflet as OSS fallback) | Route polyline, heatmap overlay, iceberg markers |
| State Management | **Redux Toolkit / Zustand** | Voyage, forecast, and alert state |
| Styling | **Tailwind CSS** | Design system and responsive layout |
| Build Tool | **Vite** | Fast dev server and production bundling |
| Charting | **Recharts / D3** | Forecast timeline, risk/fuel charts |

---

## Backend

| Layer | Technology | Purpose |
|---|---|---|
| API Gateway | **Node.js (Express)** or **FastAPI** | Public REST endpoints, auth, validation |
| Model-Serving | **Python (FastAPI)** | Model 1/2/3 inference microservices |
| Ingestion & Fusion | **Python** | Scheduled data pulls, regridding, feature fusion |
| Task Orchestration | **Apache Airflow** | DAG-based scheduling (ingestion → fusion → retraining) |
| Messaging / Queue | **Redis (pub/sub)** or RabbitMQ | Alert triggers, async job handoff |

---

## Database

| Component | Technology | Purpose |
|---|---|---|
| Primary DB | **PostgreSQL 15 + PostGIS** | Voyages, waypoints, forecasts, iceberg tracks, alerts |
| Raw Data Lake | **S3-compatible** (AWS S3 / MinIO) | Raw NetCDF/GeoTIFF satellite & reanalysis files |
| Cache | **Redis** | Hot forecast/tile caching, session cache |

---

## AI / Machine Learning

| Model | Architecture | Framework |
|---|---|---|
| Model 1 — Sea-Ice Forecast | ConvLSTM or U-Net | **PyTorch** |
| Model 2 — Iceberg Trajectory | LSTM/GRU ensemble + physics-informed regression | **PyTorch / Keras / scikit-learn** |
| Model 3 — Route Optimization | Weighted A*/Dijkstra graph search | **NetworkX / custom Python** |
| Experiment Tracking | — | **MLflow** |

---

## DevOps & Deployment

| Component | Technology |
|---|---|
| Containerization | **Docker** (one image per service) |
| Orchestration | **Kubernetes** (Helm charts per service) |
| Infrastructure as Code | **Terraform** |
| Monitoring & Logging | **Prometheus + Grafana**; ELK stack / CloudWatch |
| CI/CD | **GitHub Actions** — lint, test, build on PR; Helm upgrade on merge |

---

## Testing

| Layer | Technology |
|---|---|
| Frontend unit/component | **Jest + React Testing Library** |
| Backend unit tests | **pytest** (Python), **Jest** (Node.js) |
| Integration tests | **pytest + Testcontainers** (Postgres/PostGIS in CI) |
| End-to-end tests | **Playwright** (voyage submission → route rendering) |
| Model evaluation | Custom backtesting harness against historical hold-out data |

---

## Authentication

| Component | Technology |
|---|---|
| Auth protocol | **JWT** (access + refresh tokens) |
| Identity provider (optional) | **OAuth2 / OpenID Connect** (for NCPOR institutional SSO) |
| Password storage | **bcrypt / argon2** hashing |
| Role-based access | Roles: `mariner`, `planner`, `admin` — enforced in API Gateway middleware |

---

## Non-Trivial Technologies Explained

### ConvLSTM (Convolutional LSTM)
Replaces fully-connected multiplications inside standard LSTM with convolution operations. Learns temporal patterns while preserving 2D spatial structure — ideal for forecasting sea-ice concentration grids forward in time. **Used in Model 1.**

### Physics-Informed Regression (for iceberg drift)
Starts from known drift-force equations (ocean current drag, wind drag, Coriolis effect) and uses ML to learn only the residual correction. Valuable where iceberg-track data is sparse. **Used in Model 2.**

### PostGIS
Spatial extension for PostgreSQL — geometry/geography data types and spatial functions (distance, intersection, nearest-neighbour) directly in SQL. Used for ship/iceberg positions, route waypoints, and forecast grid cells.

### EASE-Grid 2.0 Regridding
Standard equal-area spatial grid used in cryosphere science. The fusion service resamples every dataset onto this grid before merging on a common lat/lon/time key, ensuring area-based calculations stay consistent.

### Apache Airflow
Workflow orchestration platform — schedules ingestion → fusion → retraining as a DAG with retry, alerting, and dependency management. Chosen over cron for complex multi-step pipelines.

---

*Source: [HimDrishti_Project_Document.docx](file:///e:/Projects/HimDrishti/docs/HimDrishti_Project_Document.docx)*
