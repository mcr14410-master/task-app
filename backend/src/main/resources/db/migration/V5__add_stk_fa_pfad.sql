-- Version-Column für Optimistic Locking (Spring @Version)

ALTER TABLE tasks ADD COLUMN stk INT NULL;
ALTER TABLE tasks ADD COLUMN fa VARCHAR(64) NULL;
ALTER TABLE tasks ADD COLUMN dateipfad VARCHAR(512) NULL;