-- =============================================================
-- HimDrishti — Database Schema Migration
-- 001_init.sql
-- All 10 tables as specified in DATABASE_SCHEMA.md
-- =============================================================

-- Enable PostGIS for geospatial types and functions
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable uuid generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- 1. users
-- =============================================================
CREATE TABLE users (
    user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('mariner', 'planner', 'admin')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- =============================================================
-- 2. vessels
-- =============================================================
CREATE TABLE vessels (
    vessel_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(150) NOT NULL,
    imo_number          VARCHAR(20)  UNIQUE,
    max_speed_knots     FLOAT        NOT NULL CHECK (max_speed_knots > 0),
    fuel_capacity_l     FLOAT        CHECK (fuel_capacity_l > 0),
    fuel_consumption_lph FLOAT       CHECK (fuel_consumption_lph > 0),
    owner_user_id       UUID         REFERENCES users(user_id)
);

CREATE INDEX idx_vessels_owner ON vessels(owner_user_id);

-- =============================================================
-- 3. voyages
-- =============================================================
CREATE TABLE voyages (
    voyage_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID         NOT NULL REFERENCES users(user_id),
    vessel_id         UUID         NOT NULL REFERENCES vessels(vessel_id),
    start_point       GEOMETRY(Point, 4326) NOT NULL,
    destination_point GEOMETRY(Point, 4326) NOT NULL,
    departure_time    TIMESTAMPTZ  NOT NULL,
    risk_tolerance    VARCHAR(10)  DEFAULT 'Medium' CHECK (risk_tolerance IN ('Low', 'Medium', 'High')),
    status            VARCHAR(20)  DEFAULT 'planned' CHECK (status IN ('planned', 'processing', 'active', 'completed', 'cancelled')),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_voyages_start_point ON voyages USING GIST(start_point);
CREATE INDEX idx_voyages_dest_point  ON voyages USING GIST(destination_point);
CREATE INDEX idx_voyages_user_id     ON voyages(user_id);
CREATE INDEX idx_voyages_status      ON voyages(status);

-- =============================================================
-- 4. waypoints
-- =============================================================
CREATE TABLE waypoints (
    waypoint_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voyage_id          UUID         NOT NULL REFERENCES voyages(voyage_id) ON DELETE CASCADE,
    sequence_no        INT          NOT NULL,
    position           GEOMETRY(Point, 4326) NOT NULL,
    eta                TIMESTAMPTZ  NOT NULL,
    cumulative_fuel_l  FLOAT        CHECK (cumulative_fuel_l >= 0),
    segment_risk_score FLOAT        CHECK (segment_risk_score >= 0 AND segment_risk_score <= 1),
    UNIQUE(voyage_id, sequence_no)
);

CREATE INDEX idx_waypoints_position ON waypoints USING GIST(position);

-- =============================================================
-- 5. sea_ice_forecasts
-- =============================================================
CREATE TABLE sea_ice_forecasts (
    forecast_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_date     DATE   NOT NULL,
    horizon_day       INT    NOT NULL CHECK (horizon_day >= 1 AND horizon_day <= 7),
    grid_cell         GEOMETRY(Polygon, 4326) NOT NULL,
    ice_concentration FLOAT  NOT NULL CHECK (ice_concentration >= 0 AND ice_concentration <= 100),
    confidence        FLOAT  CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX idx_sic_grid_cell ON sea_ice_forecasts USING GIST(grid_cell);
CREATE INDEX idx_sic_date_day  ON sea_ice_forecasts(forecast_date, horizon_day);

-- =============================================================
-- 6. iceberg_tracks
-- =============================================================
CREATE TABLE iceberg_tracks (
    iceberg_id    VARCHAR(30)  NOT NULL,
    observed_at   TIMESTAMPTZ  NOT NULL,
    position      GEOMETRY(Point, 4326) NOT NULL,
    velocity_ms   FLOAT        CHECK (velocity_ms >= 0),
    direction_deg FLOAT        CHECK (direction_deg >= 0 AND direction_deg <= 360),
    PRIMARY KEY (iceberg_id, observed_at)
);

CREATE INDEX idx_iceberg_tracks_position ON iceberg_tracks USING GIST(position);

-- =============================================================
-- 7. iceberg_predictions
-- =============================================================
CREATE TABLE iceberg_predictions (
    prediction_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iceberg_id          VARCHAR(30) NOT NULL,
    horizon_day         INT         NOT NULL CHECK (horizon_day >= 1 AND horizon_day <= 7),
    predicted_position  GEOMETRY(Point, 4326) NOT NULL,
    confidence_radius_km FLOAT      CHECK (confidence_radius_km >= 0),
    UNIQUE(iceberg_id, horizon_day)
);

CREATE INDEX idx_iceberg_pred_position ON iceberg_predictions USING GIST(predicted_position);

-- =============================================================
-- 8. risk_scores
-- =============================================================
CREATE TABLE risk_scores (
    risk_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voyage_id      UUID  NOT NULL REFERENCES voyages(voyage_id) ON DELETE CASCADE,
    segment        GEOMETRY(LineString, 4326) NOT NULL,
    ice_risk       FLOAT CHECK (ice_risk >= 0 AND ice_risk <= 1),
    iceberg_risk   FLOAT CHECK (iceberg_risk >= 0 AND iceberg_risk <= 1),
    weather_risk   FLOAT CHECK (weather_risk >= 0 AND weather_risk <= 1),
    combined_score FLOAT CHECK (combined_score >= 0 AND combined_score <= 1)
);

CREATE INDEX idx_risk_segment   ON risk_scores USING GIST(segment);
CREATE INDEX idx_risk_voyage_id ON risk_scores(voyage_id);

-- =============================================================
-- 9. alerts
-- =============================================================
CREATE TABLE alerts (
    alert_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voyage_id    UUID         NOT NULL REFERENCES voyages(voyage_id) ON DELETE CASCADE,
    alert_type   VARCHAR(30)  NOT NULL CHECK (alert_type IN ('iceberg_proximity', 'storm', 'high_ice_risk', 'reroute')),
    severity     VARCHAR(10)  NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    message      TEXT         NOT NULL,
    triggered_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    acknowledged BOOLEAN      DEFAULT false
);

CREATE INDEX idx_alerts_voyage_ack ON alerts(voyage_id, acknowledged);

-- =============================================================
-- 10. external_data_cache
-- =============================================================
CREATE TABLE external_data_cache (
    cache_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name  VARCHAR(60)  NOT NULL,
    dataset_type VARCHAR(40)  NOT NULL,
    fetched_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    storage_path VARCHAR(500) NOT NULL,
    status       VARCHAR(20)  DEFAULT 'fetched' CHECK (status IN ('fetched', 'validated', 'fused', 'failed'))
);

CREATE INDEX idx_cache_source_type_date ON external_data_cache(source_name, dataset_type, fetched_at);

-- =============================================================
-- Seed data: test vessels for demo
-- =============================================================
INSERT INTO users (user_id, full_name, email, password_hash, role) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Demo Planner', 'planner@himdrishti.dev', '$2b$12$placeholder_hash_will_be_replaced', 'planner');

INSERT INTO vessels (vessel_id, name, imo_number, max_speed_knots, fuel_capacity_l, fuel_consumption_lph, owner_user_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'MV Antarctic Explorer', 'IMO9876543', 15.0, 80000, 250, 'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000002', 'RV Polar Research', 'IMO1234567', 12.0, 50000, 180, 'a0000000-0000-0000-0000-000000000001');

-- Seed: test icebergs for Model 2 demo
INSERT INTO iceberg_tracks (iceberg_id, observed_at, position, velocity_ms, direction_deg) VALUES
    ('B15', now() - INTERVAL '7 days', ST_SetSRID(ST_MakePoint(22.0, -66.0), 4326), 0.15, 135),
    ('B15', now() - INTERVAL '6 days', ST_SetSRID(ST_MakePoint(22.1, -66.05), 4326), 0.14, 138),
    ('B15', now() - INTERVAL '5 days', ST_SetSRID(ST_MakePoint(22.2, -66.1), 4326), 0.16, 132),
    ('B15', now() - INTERVAL '4 days', ST_SetSRID(ST_MakePoint(22.3, -66.12), 4326), 0.15, 140),
    ('B15', now() - INTERVAL '3 days', ST_SetSRID(ST_MakePoint(22.35, -66.15), 4326), 0.13, 137),
    ('B15', now() - INTERVAL '2 days', ST_SetSRID(ST_MakePoint(22.4, -66.18), 4326), 0.14, 135),
    ('B15', now() - INTERVAL '1 day',  ST_SetSRID(ST_MakePoint(22.5, -66.2), 4326), 0.15, 136),
    ('C28', now() - INTERVAL '7 days', ST_SetSRID(ST_MakePoint(30.0, -68.0), 4326), 0.10, 180),
    ('C28', now() - INTERVAL '6 days', ST_SetSRID(ST_MakePoint(30.0, -68.05), 4326), 0.11, 182),
    ('C28', now() - INTERVAL '5 days', ST_SetSRID(ST_MakePoint(30.0, -68.1), 4326), 0.10, 178),
    ('C28', now() - INTERVAL '4 days', ST_SetSRID(ST_MakePoint(30.0, -68.15), 4326), 0.12, 185),
    ('C28', now() - INTERVAL '3 days', ST_SetSRID(ST_MakePoint(30.0, -68.2), 4326), 0.10, 180),
    ('C28', now() - INTERVAL '2 days', ST_SetSRID(ST_MakePoint(30.0, -68.25), 4326), 0.11, 183),
    ('C28', now() - INTERVAL '1 day',  ST_SetSRID(ST_MakePoint(30.0, -68.3), 4326), 0.10, 181);
