-- V6__tasks_add_additional_flags.sql  (Flyway default location: classpath:db/migration)
-- Add both flags with safe defaults and NOT NULL in one go (PostgreSQL).

-- FAI
ALTER TABLE IF EXISTS tasks
  ADD COLUMN IF NOT EXISTS fai BOOLEAN NOT NULL DEFAULT FALSE;

-- QS
ALTER TABLE IF EXISTS tasks
  ADD COLUMN IF NOT EXISTS qs  BOOLEAN NOT NULL DEFAULT FALSE;

-- Make sure defaults are set for future inserts (idempotent)
ALTER TABLE tasks ALTER COLUMN fai SET DEFAULT FALSE;
ALTER TABLE tasks ALTER COLUMN qs  SET DEFAULT FALSE;

-- Backfill (idempotent)
UPDATE tasks SET fai = FALSE WHERE fai IS NULL;
UPDATE tasks SET qs  = FALSE WHERE qs  IS NULL;
