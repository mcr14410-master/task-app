-- V1__baseline_schema.sql (PostgreSQL)  — UPDATED to use DOUBLE PRECISION
-- Baseline: clean schema for fresh DBs

-- Stations
CREATE TABLE IF NOT EXISTS public.arbeitsstation (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- Unique & index (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.arbeitsstation'::regclass
      AND conname  = 'uq_arbeitsstation_name'
  ) THEN
    ALTER TABLE public.arbeitsstation
      ADD CONSTRAINT uq_arbeitsstation_name UNIQUE (name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_arbeitsstation_order'
      AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_arbeitsstation_order
      ON public.arbeitsstation(sort_order, id);
  END IF;
END $$;

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id BIGSERIAL PRIMARY KEY,
  bezeichnung TEXT NOT NULL,
  teilenummer TEXT,
  kunde TEXT,
  zustaendig TEXT,
  zusaetzliche_infos TEXT,
  end_datum DATE,
  aufwand_stunden DOUBLE PRECISION,     -- << changed from NUMERIC to DOUBLE PRECISION
  arbeitsstation TEXT,
  status TEXT NOT NULL DEFAULT 'NEU',
  prioritaet INT NOT NULL DEFAULT 0,
  fai BOOLEAN NOT NULL DEFAULT FALSE,
  qs  BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT chk_task_status CHECK (status IN ('NEU','TO_DO','IN_BEARBEITUNG','FERTIG'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_station_order ON public.tasks(arbeitsstation, prioritaet, id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_enddatum ON public.tasks(end_datum);
