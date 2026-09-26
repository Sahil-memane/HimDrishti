import os
import json
import requests
from datetime import datetime


from db import (
    SessionLocal,
    Waypoint,
    RiskScore,
    SeaIceForecast,
    IcebergPrediction
)


# ============================================================
# MISTRAL CONFIG
# ============================================================

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"

# You can change this model later if required
MISTRAL_MODEL = "mistral-small-latest"

 
# ============================================================
# DATABASE DATA
# ============================================================

def get_model_outputs(db, voyage_id):
    """
    Fetch Model 1 and Model 2 outputs from PostgreSQL/PostGIS.

    Model 1:
        sea_ice_forecasts

    Model 2:
        iceberg_predictions

    Model 3:
        waypoints + risk_scores
    """

    # --------------------------------------------------------
    # MODEL 1 - SEA ICE FORECAST
    # --------------------------------------------------------

    sic_rows = (
        db.query(SeaIceForecast)
        .order_by(
            SeaIceForecast.horizon_day.asc()
        )
        .all()
    )

    model1_output = []

    for row in sic_rows:

        model1_output.append({
            "forecast_date": str(row.forecast_date),
            "horizon_day": row.horizon_day,
            "ice_concentration": float(row.ice_concentration),
            "confidence": (
                float(row.confidence)
                if row.confidence is not None
                else None
            )
        })


    # --------------------------------------------------------
    # MODEL 2 - ICEBERG PREDICTIONS
    # --------------------------------------------------------

    iceberg_rows = (
        db.query(IcebergPrediction)
        .order_by(
            IcebergPrediction.iceberg_id.asc(),
            IcebergPrediction.horizon_day.asc()
        )
        .all()
    )

    model2_output = []

    for row in iceberg_rows:

        # position is stored as plain WKT text (see models.py / the schema
        # migrations — this database never uses PostGIS geometry columns
        # or the postgis extension), so it's already usable as-is. The
        # previous func.ST_AsText(...) call assumed a native PostGIS
        # geometry type and a live PostGIS extension; it happened to work
        # locally only because the local dev Postgres image bundles
        # PostGIS regardless of whether the schema uses it, and broke
        # immediately against a real Cloud SQL instance (plain Postgres,
        # no PostGIS): "function st_astext(unknown) does not exist".
        point_wkt = row.predicted_position

        lat = None
        lon = None

        if point_wkt:
            coords = (
                point_wkt
                .replace("POINT(", "")
                .replace(")", "")
                .split()
            )

            if len(coords) >= 2:
                lon = float(coords[0])
                lat = float(coords[1])

        model2_output.append({
            "iceberg_id": row.iceberg_id,
            "horizon_day": row.horizon_day,
            "latitude": lat,
            "longitude": lon,
            "confidence_radius_km": (
                float(row.confidence_radius_km)
                if row.confidence_radius_km is not None
                else None
            )
        })


    # --------------------------------------------------------
    # MODEL 3 - A* ROUTE
    # --------------------------------------------------------

    waypoint_rows = (
        db.query(Waypoint)
        .filter(Waypoint.voyage_id == voyage_id)
        .order_by(Waypoint.sequence_no.asc())
        .all()
    )

    model3_waypoints = []

    for row in waypoint_rows:

        # See the comment above the model2_output loop — position is
        # already plain WKT text, no PostGIS/ST_AsText needed.
        point_wkt = row.position

        lat = None
        lon = None

        if point_wkt:

            coords = (
                point_wkt
                .replace("POINT(", "")
                .replace(")", "")
                .split()
            )

            if len(coords) >= 2:
                lon = float(coords[0])
                lat = float(coords[1])

        model3_waypoints.append({
            "sequence": row.sequence_no,
            "latitude": lat,
            "longitude": lon,
            "eta": (
                row.eta.isoformat()
                if row.eta
                else None
            ),
            "cumulative_fuel_l": (
                float(row.cumulative_fuel_l)
                if row.cumulative_fuel_l is not None
                else None
            ),
            "segment_risk_score": (
                float(row.segment_risk_score)
                if row.segment_risk_score is not None
                else None
            )
        })


    # --------------------------------------------------------
    # MODEL 3 RISK SCORES
    # --------------------------------------------------------

    risk_rows = (
        db.query(RiskScore)
        .filter(RiskScore.voyage_id == voyage_id)
        .all()
    )

    model3_risks = []

    for row in risk_rows:

        model3_risks.append({
            "ice_risk": (
                float(row.ice_risk)
                if row.ice_risk is not None
                else None
            ),
            "iceberg_risk": (
                float(row.iceberg_risk)
                if row.iceberg_risk is not None
                else None
            ),
            "weather_risk": (
                float(row.weather_risk)
                if row.weather_risk is not None
                else None
            ),
            "satellite_risk": (
                float(row.satellite_risk)
                if row.satellite_risk is not None
                else None
            ),
            "combined_score": (
                float(row.combined_score)
                if row.combined_score is not None
                else None
            )
        })


    return {
        "model1_sea_ice": model1_output,
        "model2_iceberg": model2_output,
        "model3_waypoints": model3_waypoints,
        "model3_risk_scores": model3_risks
    }


# ============================================================
# LLM PROMPT
# ============================================================

def build_prompt(voyage_id, data):

    prompt = f"""
You are the AI route recommendation assistant for HimDrishti,
an Antarctic maritime navigation decision-support system.

Your job is NOT to calculate a new route.

The mathematical route has already been calculated by Model 3
using an A* routing algorithm.

You must analyze the outputs of:

Model 1:
Sea-Ice Concentration Forecast

Model 2:
Iceberg Trajectory Prediction

Model 3:
A* Candidate Route / Waypoints / Risk Scores

Then explain the route and recommend the best available route.

IMPORTANT:
- Do not invent coordinates.
- Do not invent fuel values.
- Do not invent ETA.
- Use the numerical values supplied by Model 3.
- Model 3 is the mathematical routing engine.
- LLM is only the explanation and recommendation layer.
- If information is missing, clearly say it is unavailable.
- Do not create a completely new route.
- Keep the recommendation suitable for a prototype/demo.

Voyage ID:
{voyage_id}

==================================================
MODEL 1 — SEA ICE FORECAST
==================================================

{json.dumps(data["model1_sea_ice"], indent=2)}

==================================================
MODEL 2 — ICEBERG TRAJECTORY
==================================================

{json.dumps(data["model2_iceberg"], indent=2)}

==================================================
MODEL 3 — A* ROUTE WAYPOINTS
==================================================

{json.dumps(data["model3_waypoints"], indent=2)}

==================================================
MODEL 3 — RISK SCORES
==================================================

{json.dumps(data["model3_risk_scores"], indent=2)}

==================================================
REQUIRED OUTPUT
==================================================

Return ONLY valid JSON in this exact structure:

{{
    "best_route": {{
        "route_summary": "Short description of the selected A* route",
        "waypoints": [
            {{
                "sequence": 0,
                "latitude": 0,
                "longitude": 0
            }}
        ]
    }},

    "why_this_route": [
        "Reason 1",
        "Reason 2",
        "Reason 3"
    ],

    "risk": {{
        "overall_risk": "Low/Medium/High",
        "ice_risk": "Low/Medium/High",
        "iceberg_risk": "Low/Medium/High",
        "weather_risk": "Low/Medium/High",
        "explanation": "Short explanation"
    }},

    "fuel": {{
        "estimated_fuel_l": 0,
        "explanation": "Short explanation"
    }},

    "eta": {{
        "destination_eta": "ISO datetime or unavailable",
        "explanation": "Short explanation"
    }},

    "model_summary": {{
        "model1": "How sea ice affected the route",
        "model2": "How iceberg predictions affected the route",
        "model3": "How A* selected the route"
    }}
}}
"""

    return prompt


# ============================================================
# CALL MISTRAL
# ============================================================

def call_mistral(prompt):

    if not MISTRAL_API_KEY:

        raise RuntimeError(
            "MISTRAL_API_KEY environment variable is not set."
        )

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MISTRAL_MODEL,

        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a maritime route analysis assistant. "
                    "Return only valid JSON."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],

        "temperature": 0.2,

        "response_format": {
            "type": "json_object"
        }
    }

    response = requests.post(
        MISTRAL_API_URL,
        headers=headers,
        json=payload,
        timeout=60
    )

    if response.status_code != 200:

        raise RuntimeError(
            f"Mistral API error {response.status_code}: "
            f"{response.text}"
        )

    result = response.json()

    content = (
        result["choices"][0]["message"]["content"]
    )

    try:
        return json.loads(content)

    except json.JSONDecodeError:

        # Sometimes LLM may return JSON inside ```json ... ```
        cleaned = content.strip()

        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]

        if cleaned.startswith("```"):
            cleaned = cleaned[3:]

        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        return json.loads(cleaned.strip())


# ============================================================
# MAIN FUNCTION USED BY main.py
# ============================================================

def generate_route_recommendation(voyage_id):

    db = SessionLocal()

    try:

        # ----------------------------------------------------
        # 1. Get Model 1 + Model 2 + Model 3 outputs
        # ----------------------------------------------------

        data = get_model_outputs(
            db,
            voyage_id
        )

        # ----------------------------------------------------
        # 2. Check whether Model 3 actually generated route
        # ----------------------------------------------------

        if not data["model3_waypoints"]:

            raise ValueError(
                f"No Model 3 route found for voyage "
                f"{voyage_id}. Run POST /route first."
            )

        # ----------------------------------------------------
        # 3. Build LLM prompt
        # ----------------------------------------------------

        prompt = build_prompt(
            voyage_id,
            data
        )

        # ----------------------------------------------------
        # 4. Send everything to Mistral (with fallback)
        # ----------------------------------------------------
        is_fallback = False
        try:
            recommendation = call_mistral(prompt)
        except Exception as err:
            print(f"[Model 3 LLM] Mistral API call fallback ({err}). Generating structured recommendation from real route data.")
            is_fallback = True

            risks = data["model3_risk_scores"]
            n = len(risks) or 1
            avg_ice = sum((r["ice_risk"] or 0.0) for r in risks) / n
            avg_iceberg = sum((r["iceberg_risk"] or 0.0) for r in risks) / n
            avg_weather = sum((r["weather_risk"] or 0.0) for r in risks) / n
            avg_combined = sum((r["combined_score"] or 0.0) for r in risks) / n

            def _band(v):
                return "Low" if v <= 0.3 else "Moderate" if v <= 0.6 else "High"

            recommendation = {
                "best_route": {
                    "route_summary": "A* Navigation Path (real Model 1/2/3 route data; Mistral explainability unavailable this run)",
                    "waypoints": data["model3_waypoints"]
                },
                "why_this_route": [
                    f"1. Real computed route risk profile: ice={avg_ice:.2f}, iceberg={avg_iceberg:.2f}, weather={avg_weather:.2f}, overall={avg_combined:.2f}.",
                    f"2. {len(data['model3_waypoints'])} waypoints computed by the real A* engine over the real Model 1/2 hazard grid.",
                    "3. This explanation is templated from real route data, not an AI-generated narrative — Mistral could not be reached for this request."
                ],
                "risk": {
                    "overall_risk": f"{_band(avg_combined)} ({avg_combined:.2f})",
                    "ice_risk": f"{_band(avg_ice)} ({avg_ice:.2f})",
                    "iceberg_risk": f"{_band(avg_iceberg)} ({avg_iceberg:.2f})",
                    "weather_risk": f"{_band(avg_weather)} ({avg_weather:.2f})",
                    "explanation": "Computed directly from real per-segment risk_scores for this voyage (not an LLM narrative)."
                },
                "fuel": {
                    "estimated_fuel_l": data["model3_waypoints"][-1]["cumulative_fuel_l"] if data["model3_waypoints"] else None,
                    "explanation": "Real cumulative fuel from the last computed waypoint."
                },
                "eta": {
                    "destination_eta": data["model3_waypoints"][-1]["eta"] if data["model3_waypoints"] else None,
                    "explanation": "Real ETA from the last computed waypoint."
                },
                "model_summary": {
                    "model1": f"Model 1 SIC Forecast: {len(data['model1_sea_ice'])} real forecast cells considered.",
                    "model2": f"Model 2 Iceberg Trajectory: {len(data['model2_iceberg'])} real predicted positions considered.",
                    "model3": "Model 3 A* Engine: real least-cost path computed; this text block is templated, not Mistral-generated."
                }
            }

        # ----------------------------------------------------
        # 5. Return complete response
        # ----------------------------------------------------
        return {
            "status": "success",
            "voyage_id": voyage_id,
            "llm": {
                "provider": "Mistral / Model 3 Engine",
                "model": MISTRAL_MODEL,
                "is_fallback": is_fallback
            },
            "recommendation": recommendation,
            "source_data": {
                "model1_records": len(data["model1_sea_ice"]),
                "model2_records": len(data["model2_iceberg"]),
                "model3_waypoints": len(data["model3_waypoints"]),
                "model3_risk_segments": len(data["model3_risk_scores"])
            }
        }

    finally:

        db.close()

print("LLM Service Loaded successfully ")        