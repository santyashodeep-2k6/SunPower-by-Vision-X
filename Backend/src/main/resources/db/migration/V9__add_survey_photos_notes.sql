-- =============================================================================
-- MIGRATION: V9__add_survey_photos_notes.sql
-- =============================================================================
-- Adds persistent photo attachments and survey technician notes as JSON text

ALTER TABLE surveys ADD COLUMN IF NOT EXISTS photos TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS notes TEXT;
