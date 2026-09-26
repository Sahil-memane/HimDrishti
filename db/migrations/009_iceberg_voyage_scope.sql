-- =============================================================
-- HimDrishti — Database Schema Migration 009
-- 009_iceberg_voyage_scope.sql
-- iceberg_tracks / iceberg_predictions were single global tables, seeded
-- once with two fixed demo icebergs (B15/C28, see 001_init.sql) and never
-- scoped to a voyage — every voyage's "Iceberg Detections" count and every
-- route's Model-2 hazard-distance cost read the exact same two hardcoded
-- positions, regardless of the voyage's actual region. Scope both tables
-- per voyage, matching sea_ice_forecasts (see 005_seaice_voyage_scope.sql).
-- Existing demo rows keep voyage_id = NULL and are excluded once a caller
-- filters by voyage_id, without needing to delete them.
-- =============================================================

ALTER TABLE iceberg_tracks ADD COLUMN IF NOT EXISTS voyage_id UUID;
ALTER TABLE iceberg_predictions ADD COLUMN IF NOT EXISTS voyage_id UUID;

CREATE INDEX IF NOT EXISTS idx_iceberg_tracks_voyage ON iceberg_tracks(voyage_id);
CREATE INDEX IF NOT EXISTS idx_iceberg_predictions_voyage ON iceberg_predictions(voyage_id, horizon_day);
