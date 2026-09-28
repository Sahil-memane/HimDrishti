# HimDrishti — API Reference

> All endpoints under `/api` — JSON responses (GeoJSON for forecast endpoints).
> Auth: JWT access + refresh tokens with rotation flow.

---

## Authentication

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/register` | POST | Public | Register new user |
| `/api/auth/login` | POST | Public | Login, get JWT tokens |

### POST `/api/auth/register`

**Request:**
```json
{
  "full_name": "string",
  "email": "string",
  "password": "string",
  "role": "mariner | planner"
}
```

**Response:** `201 Created`
```json
{
  "user_id": "uuid",
  "full_name": "string",
  "email": "string",
  "role": "string"
}
```

**Validation:** email format & uniqueness; password ≥ 8 chars; role ∈ {`mariner`, `planner`}
**Errors:** `400` validation error; `409` email already registered

---

### POST `/api/auth/login`

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "expires_in": 3600
}
```

**Validation:** Rate-limited (5 attempts / 15 min)
**Errors:** `401` invalid credentials; `429` too many attempts

---

## Voyages

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/voyage` | POST | Bearer JWT (mariner/planner) | Create voyage (async) |
| `/api/voyage/{voyage_id}/route` | GET | Bearer JWT (owner/admin) | Get computed route |
| `/api/voyages` | GET | Bearer JWT | List user's voyages |

### POST `/api/voyage`

**Request:**
```json
{
  "vessel_id": "uuid",
  "start_lat": -65.0,
  "start_lon": 20.0,
  "dest_lat": -70.0,
  "dest_lon": 30.0,
  "speed_knots": 12.0,
  "fuel_capacity_l": 50000,       // optional
  "fuel_consumption_lph": 200,    // optional
  "departure_time": "2026-01-15T08:00:00Z",
  "risk_tolerance": "Medium"      // optional, default Medium
}
```

**Response:** `202 Accepted` (triggers async Model 1 → 2 → 3 pipeline)
```json
{
  "voyage_id": "uuid",
  "status": "processing"
}
```

**Validation:**
- `lat` ∈ [-90, 90]; `lon` ∈ [-180, 180]
- `speed_knots` > 0 and ≤ `vessel.max_speed_knots`
- `departure_time` ≥ now()
- `risk_tolerance` ∈ {`Low`, `Medium`, `High`}

**Errors:** `400` validation; `404` vessel not found; `422` destination unreachable

---

### GET `/api/voyage/{voyage_id}/route`

**Response:** `200 OK`
```json
{
  "waypoints": [
    {
      "sequence_no": 1,
      "lat": -65.5,
      "lon": 20.3,
      "eta": "2026-01-15T10:00:00Z",
      "cumulative_fuel_l": 400,
      "segment_risk_score": 0.12
    }
  ],
  "total_distance_km": 1250.5,
  "eta": "2026-01-17T14:00:00Z",
  "total_fuel_estimate_l": 12000,
  "overall_risk_score": 0.23
}
```

**Errors:** `404` voyage not found; `409` route not yet computed

---

### GET `/api/voyages`

**Query Params:** `status` (optional: `planned|active|completed`), `page`, `page_size` (max 100)

**Response:** `200 OK`
```json
{
  "items": [...],
  "page": 1,
  "page_size": 20,
  "total": 5
}
```

---

## Forecasts

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/forecast/sea-ice` | GET | Bearer JWT | Sea-ice concentration forecast |
| `/api/forecast/icebergs` | GET | Bearer JWT | Iceberg position predictions |

### GET `/api/forecast/sea-ice`

**Query Params:**
- `bbox` = `minLon,minLat,maxLon,maxLat`
- `day` = `1-7` (forecast horizon)

**Response:** `200 OK` — GeoJSON FeatureCollection
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Polygon", "coordinates": [...] },
      "properties": {
        "ice_concentration": 72.5,
        "confidence": 0.85
      }
    }
  ]
}
```

**Validation:** bbox within Antarctic operational region; day ∈ [1, 7]
**Errors:** `400` invalid bbox/day; `503` forecast not yet available

---

### GET `/api/forecast/icebergs`

**Query Params:** same as sea-ice

**Response:** `200 OK` — GeoJSON FeatureCollection
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [22.3, -66.2] },
      "properties": {
        "iceberg_id": "B15",
        "confidence_radius_km": 13.5
      }
    }
  ]
}
```

---

## Alerts

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/alerts/{voyage_id}` | GET | Bearer JWT (owner/admin) | Get voyage alerts |
| `/api/alerts/{alert_id}/acknowledge` | PATCH | Bearer JWT (owner/admin) | Acknowledge an alert |

### GET `/api/alerts/{voyage_id}`

**Query Params:** `acknowledged` (optional: `true|false`)

**Response:** `200 OK`
```json
[
  {
    "alert_id": "uuid",
    "alert_type": "iceberg_proximity",
    "severity": "high",
    "message": "Iceberg detected 42 km ahead — rerouting",
    "triggered_at": "2026-01-15T12:30:00Z",
    "acknowledged": false
  }
]
```

**Alert Types:** `iceberg_proximity`, `storm`, `high_ice_risk`, `reroute`
**Severity Levels:** `low`, `medium`, `high`

---

### PATCH `/api/alerts/{alert_id}/acknowledge`

**Response:** `200 OK`
```json
{
  "alert_id": "uuid",
  "acknowledged": true
}
```

**Errors:** `404` alert not found; `403` not the voyage owner

---

*Source: [HimDrishti_Project_Document.docx](file:///e:/Projects/HimDrishti/docs/HimDrishti_Project_Document.docx)*
