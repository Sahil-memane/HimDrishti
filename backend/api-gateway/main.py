"""
HimDrishti API Gateway — Main Application
Central entry point. Mounts all route groups and serves the REST API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes_auth import router as auth_router
from routes_voyage import router as voyage_router
from routes_forecast import router as forecast_router
from routes_alerts import router as alerts_router

app = FastAPI(
    title="HimDrishti API",
    description="AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System",
    version="1.0.0",
)

# -- CORS (allow frontend dev server) --
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Mount route groups --
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(voyage_router, prefix="/api", tags=["Voyages"])
app.include_router(forecast_router, prefix="/api/forecast", tags=["Forecasts"])
app.include_router(alerts_router, prefix="/api", tags=["Alerts"])


@app.get("/health", tags=["System"])
def health_check():
    """Liveness probe — returns 200 if the service is up."""
    return {"status": "ok", "service": "api-gateway"}
