-- =============================================================================
-- MIGRATION: V10__widen_quotations_site_id.sql
-- =============================================================================
-- Broaden reference columns to accommodate prefixed identifiers (e.g. site-UUID)

ALTER TABLE quotations ALTER COLUMN site_id TYPE VARCHAR(100);
ALTER TABLE quotations ALTER COLUMN lead_id TYPE VARCHAR(100);
ALTER TABLE quotations ALTER COLUMN survey_id TYPE VARCHAR(100);
