-- =============================================================
-- HimDrishti — Database Schema Migration 005
-- 005_seaice_voyage_scope.sql
-- sea_ice_forecasts was a single global table: every voyage's Model 1 run
-- deleted and replaced ALL rows, so only the most recently computed
-- voyage's forecast ever existed. Any other voyage's Forecast page silently
-- showed either the wrong voyage's cells (pre-bbox-filter) or nothing at
-- all (post-bbox-filter). Scope it per voyage, matching how waypoints and
-- risk_scores already work.
-- =============================================================

ALTER TABLE sea_ice_forecasts ADD COLUMN IF NOT EXISTS voyage_id UUID;
CREATE INDEX IF NOT EXISTS idx_sic_voyage_horizon ON sea_ice_forecasts(voyage_id, horizon_day);
