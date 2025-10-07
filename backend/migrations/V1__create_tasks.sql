-- V1__create_tasks.sql (PostgreSQL)
-- Creates table 'tasks' matching the JPA entity, with useful indexes and a CHECK constraint for status.

CREATE TABLE IF NOT EXISTS tasks (
  id                BIGSERIAL PRIMARY KEY,
  bezeichnung       VARCHAR(255) NOT NULL,
  teilenummer       VARCHAR(120),
  kunde             VARCHAR(255),
  zustaendig        VARCHAR(255),
  aufwand_stunden   NUMERIC(8,2),
  zusaetzliche_infos TEXT,
  end_datum         DATE,
  arbeitsstation    VARCHAR(255),
  status            VARCHAR(40) NOT NULL DEFAULT 'NEU',
  prioritaet        INTEGER NOT NULL DEFAULT 9999,
  CONSTRAINT tasks_status_check CHECK (status IN ('NEU','TO_DO','IN_BEARBEITUNG','FERTIG'))
);

-- Helpful indexes for common board queries/filtering
CREATE INDEX IF NOT EXISTS idx_tasks_station ON tasks (arbeitsstation);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_enddatum ON tasks (end_datum);
