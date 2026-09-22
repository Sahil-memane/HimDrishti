-- =============================================================
-- HimDrishti — Database Schema Migration 008
-- 008_iceberg_prediction_timestamp.sql
-- iceberg_predictions had no timestamp of when a prediction run was
-- generated (sea_ice_forecasts has forecast_date; this had nothing),
-- so the Forecast page had no real, honest value to show for "Model 2
-- forecast generated at" — needed for the Forecast Information section.
-- =============================================================

ALTER TABLE iceberg_predictions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
