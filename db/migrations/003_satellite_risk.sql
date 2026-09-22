-- =============================================================
-- HimDrishti — Database Schema Migration 003
-- 003_satellite_risk.sql
-- Add real Sentinel-1 SAR hazard risk to risk_scores (Model 3 satellite change)
-- =============================================================

ALTER TABLE risk_scores ADD COLUMN IF NOT EXISTS satellite_risk FLOAT CHECK (satellite_risk >= 0 AND satellite_risk <= 1);
