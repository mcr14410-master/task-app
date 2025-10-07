-- V4__index_tasks_station_priority.sql (PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_tasks_station_priority
  ON tasks (arbeitsstation, prioritaet, id);
