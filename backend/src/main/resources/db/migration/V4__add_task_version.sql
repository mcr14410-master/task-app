-- Version-Column für Optimistic Locking (Spring @Version)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;
