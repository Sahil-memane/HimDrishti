-- =============================================================
-- HimDrishti — Database Schema Migration 007
-- 007_voyage_cancel_reason.sql
-- Every cancelled voyage showed the exact same hardcoded "located inland on
-- continental landmass" message regardless of the real cause — including a
-- genuine Model 3 timeout on an oversized route, which has nothing to do
-- with the coordinates being invalid. Persist the real reason instead.
-- =============================================================

ALTER TABLE voyages ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
