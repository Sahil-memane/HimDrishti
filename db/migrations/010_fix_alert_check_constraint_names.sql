-- =============================================================
-- HimDrishti — Database Schema Migration 010
-- 010_fix_alert_check_constraint_names.sql
--
-- Bug: 002_alerts_update.sql tried to drop the original restrictive check
-- constraints on alerts.alert_type/severity (from 001_init.sql) by the
-- names 'ck_alert_type'/'ck_alert_severity' — but those columns were
-- defined with an inline CHECK (...) in 001_init.sql, which Postgres
-- names automatically as '<table>_<column>_check', not the names 002
-- guessed. So 002's DROP CONSTRAINT IF EXISTS silently no-op'd, and its
-- own newer, more permissive constraint was added ALONGSIDE the original
-- one instead of replacing it. Since Postgres ANDs every CHECK constraint
-- on a column, this made every value 002 was explicitly trying to allow
-- (e.g. 'ROUTE_RISK', 'CRITICAL') still fail against the untouched
-- original constraint — reproduced on a fresh database (verified against
-- a freshly migrated Cloud SQL instance: inserting alert_type='ROUTE_RISK'
-- raised "violates check constraint alerts_alert_type_check"). This never
-- surfaced against the local dev database only because those original
-- constraints had at some point been dropped there by hand, outside of
-- any migration file — schema drift a fresh database doesn't have.
--
-- This only drops the ORIGINAL auto-named constraints; 002's own
-- ck_alert_type/ck_alert_severity/ck_alert_status constraints (the
-- intended, permissive ones) are untouched and remain in effect.
-- =============================================================

ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_alert_type_check;
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_severity_check;
