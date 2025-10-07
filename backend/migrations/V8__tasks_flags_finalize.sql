-- V8__tasks_flags_finalize.sql
-- In case an earlier attempt added the columns without defaults or NOT NULL.

-- Backfill any nulls (idempotent)
UPDATE tasks SET fai = FALSE WHERE fai IS NULL;
UPDATE tasks SET qs  = FALSE WHERE qs  IS NULL;

-- Enforce defaults and NOT NULL
ALTER TABLE tasks ALTER COLUMN fai SET DEFAULT FALSE;
ALTER TABLE tasks ALTER COLUMN qs  SET DEFAULT FALSE;
ALTER TABLE tasks ALTER COLUMN fai SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN qs  SET NOT NULL;
