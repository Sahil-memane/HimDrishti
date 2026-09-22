-- =============================================================
-- HimDrishti — Database Schema Migration 002
-- 002_alerts_update.sql
-- Extend alerts table for Central Alert Engine
-- =============================================================

-- 1. Add new columns to alerts table
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS longitude FLOAT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS route_waypoint INT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS route_segment TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS risk_score FLOAT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS source_model VARCHAR(30);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS forecast_time TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS distance_from_route_km FLOAT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 2. Drop existing restrictive check constraints if they exist
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS ck_alert_type;
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS ck_alert_severity;
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS ck_alert_status;

-- 3. Add updated, flexible check constraints
ALTER TABLE alerts ADD CONSTRAINT ck_alert_type CHECK (
    alert_type IN ('HIGH_SEA_ICE', 'ICEBERG_PROXIMITY', 'ROUTE_RISK', 'iceberg_proximity', 'high_ice_risk', 'storm', 'reroute')
);

ALTER TABLE alerts ADD CONSTRAINT ck_alert_severity CHECK (
    severity IN ('CRITICAL', 'WARNING', 'ADVISORY', 'high', 'medium', 'low')
);

ALTER TABLE alerts ADD CONSTRAINT ck_alert_status CHECK (
    status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')
);

-- 4. Create index for fast status & voyage lookups
CREATE INDEX IF NOT EXISTS idx_alerts_voyage_status ON alerts(voyage_id, status);
