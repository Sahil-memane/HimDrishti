# Model 2 – Iceberg Trajectory Prediction Flow (Team FAQ)

## Overview
When a user specifies a **start** and **destination** for a planned voyage, the system needs to know not only the current sea‑ice conditions (Phase 4) but also **where icebergs that intersect the route are likely to be over the next 7 days**.  The following diagram and step‑by‑step description show how the request flows from the UI to the **Model 2** service and back to the map.

---

```mermaid
flowchart TD
    UI[User enters start & destination] --> GW[API‑Gateway: /voyage/bbox]
    GW --> BBOX[Compute padded BBOX]
    BBOX --> DB1[SELECT iceberg_id FROM iceberg_tracks WHERE ST_Intersects(position, BBOX)]
    DB1 --> UI2[Return iceberg IDs]
    UI2 --> UI3[Render iceberg icons on map]
    UI3 --> CALL[Frontend GET /predict/{iceberg_id} for each ID]
    CALL --> SVC[Model‑2 Service (FastAPI)]
    SVC --> DB2[Pull last 7 days of track data (lines 36‑54)]
    DB2 --> FM[Build 7×23 feature matrix (ml_utils)]
    FM --> PRED[Blend physics+GRU (ml_utils.predict_iceberg_trajectory)]
    PRED --> CONV[Convert km‑displacements → lat/lon]
    CONV --> WRITE[Insert 7 rows into iceberg_predictions (PostGIS POINT)]
    WRITE --> RESP[Return JSON payload {iceberg_id, anchor, predictions[day, lat, lon, confidence_radius_km]}]
    RESP --> UI4[Frontend draws timeline slider & expanding circles]
```

---

## Detailed Steps
1. **User input** – The UI collects two latitude/longitude points (start & destination).
2. **BBOX generation** – `API‑Gateway` pads the rectangle (≈ 0.5°) and returns the limits `min_lat, max_lat, min_lon, max_lon`.
3. **Iceberg lookup** – A spatial query against `iceberg_tracks` returns all iceberg IDs that intersect the BBOX.
4. **Front‑end rendering** – The IDs are shown as markers on the map.
5. **Prediction request** – For each iceberg the front‑end calls `GET /predict/{iceberg_id}` on **Model 2** (`localhost:8002`).
6. **Data pull (lines 36‑54)** – The service fetches the last 7 days of track data for that iceberg, ordered by observation time.
7. **Feature matrix** – `ml_utils` loads the pickles (`feature_columns_v5.pkl`, `day_confidence_thresholds_v5.pkl`, `config.pkl`) and builds a `(7, 23)` NumPy array matching the model’s expected column order.
8. **Physics + GRU blend** –
   - **Physics term**: `dx = u * day`, `dy = v * day` (drift in km).   
   - **GRU term**: model output `(7, 2)` is the learned correction.   
   - **Blend**: `final = physics_weight * physics + (1‑physics_weight) * model`.   
   - If the `.keras` file is missing, the code falls back to `physics_weight = 1.0` (pure physics).
9. **Coordinate conversion** – `displacement_to_latlon` converts each `(dx, dy)` into a new latitude/longitude using the last known position as an anchor.
10. **Database write** – Each day’s result is stored in the `iceberg_predictions` table as a PostGIS `POINT` with the corresponding `confidence_radius_km` from `day_confidence_thresholds_v5.pkl`.
11. **Response payload** – The service returns a JSON object containing the anchor location and a list of 7 predictions (day, lat, lon, confidence radius).
12. **Front‑end visualization** – The map displays a **timeline slider**; moving the slider updates the position marker and draws a **growing confidence circle** (radius increases with horizon day).

---

## Why This Matters for Presentations & Q&A
- **Explainability** – The blend factor (`physics_weight = 0.1`) is explicitly logged, so we can show that the model is *physics‑informed*.
- **Fallback safety** – Even if the ML model fails to load, the service still returns sensible physics‑only predictions, guaranteeing a response for the demo.
- **Scalability** – The endpoint works per‑iceberg, making it easy to parallelize across many icebergs in a large BBOX.
- **Data lineage** – All predictions are persisted in `iceberg_predictions`; the dashboard can query historical forecasts for audit or regression testing.

---

## Quick Reference for New Team Members
- **Entry point**: `backend/model2-iceberg-service/main.py` – FastAPI app.
- **Database models**: `backend/model2-iceberg-service/db.py` (tracks & predictions).
- **Core utilities**: `backend/model2-iceberg-service/ml_utils.py` – loads artifacts, builds features, blends physics, converts coordinates.
- **Demo seeding**: `backend/model2-iceberg-service/seed.py` – creates 2–3 test icebergs used by `test_model2.py`.
- **Docker**: Service runs on port **8002**; defined in `docker-compose.yml` under `model2`.

---

*All team members can find this file at* `e:/Projects/HimDrishti/docs/team_faqs/model2_iceberg_flow.md`.
