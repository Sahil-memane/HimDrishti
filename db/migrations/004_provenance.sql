-- =============================================================
-- HimDrishti — Database Schema Migration 004
-- 004_provenance.sql
-- Persist real data-provenance fields (Model 1 model choice, Model 3 real
-- satellite scene used) onto the voyage record. These values are computed
-- during the pipeline run but were previously only present in the one-off
-- HTTP responses of /predict and /route, discarded once the background
-- pipeline task moved on — leaving the frontend with no way to show which
-- real model/scene actually produced a given voyage's route.
-- =============================================================

ALTER TABLE voyages ADD COLUMN IF NOT EXISTS sic_model_used VARCHAR(10);
ALTER TABLE voyages ADD COLUMN IF NOT EXISTS satellite_status VARCHAR(30);
ALTER TABLE voyages ADD COLUMN IF NOT EXISTS satellite_scene_id TEXT;
ALTER TABLE voyages ADD COLUMN IF NOT EXISTS satellite_scene_datetime VARCHAR(40);
ALTER TABLE voyages ADD COLUMN IF NOT EXISTS satellite_n_detections INTEGER;
ALTER TABLE voyages ADD COLUMN IF NOT EXISTS satellite_bbox TEXT;
ALTER TABLE voyages ADD COLUMN IF NOT EXISTS satellite_thumbnail_href TEXT;
