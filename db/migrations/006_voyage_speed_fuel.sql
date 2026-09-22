-- =============================================================
-- HimDrishti — Database Schema Migration 006
-- 006_voyage_speed_fuel.sql
-- The Voyage Setup form collects a per-voyage cruising speed and fuel
-- consumption rate (matches the documented POST /api/voyage request), but
-- voyages had nowhere to store them — the pipeline silently fell back to
-- the vessel's own fixed max_speed_knots/fuel_consumption_lph every time,
-- so whatever the user actually requested for that voyage was discarded
-- and every route's ETA/fuel estimate used the vessel's master-data values
-- instead, regardless of what was submitted.
-- =============================================================

ALTER TABLE voyages ADD COLUMN IF NOT EXISTS speed_knots FLOAT;
ALTER TABLE voyages ADD COLUMN IF NOT EXISTS fuel_consumption_lph FLOAT;
ALTER TABLE voyages ADD COLUMN IF NOT EXISTS fuel_capacity_l FLOAT;
