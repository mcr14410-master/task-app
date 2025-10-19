-- 1) Tabelle für Status
CREATE TABLE IF NOT EXISTS task_statuses (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code       VARCHAR(64) UNIQUE NOT NULL,
    label      VARCHAR(128)      NOT NULL,
    color_bg   VARCHAR(16)       NOT NULL,
    color_fg   VARCHAR(16)       NOT NULL,
    sort_order INT               NOT NULL DEFAULT 0,
    is_final   BOOLEAN           NOT NULL DEFAULT FALSE,
    active     BOOLEAN           NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP         NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP         NOT NULL DEFAULT NOW()
);

-- 2) FK-Spalte an tasks
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS status_code VARCHAR(64);

-- 3) Seeds (idempotent)
INSERT INTO task_statuses (code,label,color_bg,color_fg,sort_order,is_final)
SELECT 'NEU','Neu','#2e3847','#d7e3ff',0,FALSE
WHERE NOT EXISTS (SELECT 1 FROM task_statuses WHERE code='NEU');

INSERT INTO task_statuses (code,label,color_bg,color_fg,sort_order,is_final)
SELECT 'TO_DO','To do','#374151','#e5e7eb',1,FALSE
WHERE NOT EXISTS (SELECT 1 FROM task_statuses WHERE code='TO_DO');

INSERT INTO task_statuses (code,label,color_bg,color_fg,sort_order,is_final)
SELECT 'IN_BEARBEITUNG','In Bearbeitung','#1f4a3a','#b5f5d1',2,FALSE
WHERE NOT EXISTS (SELECT 1 FROM task_statuses WHERE code='IN_BEARBEITUNG');

INSERT INTO task_statuses (code,label,color_bg,color_fg,sort_order,is_final)
SELECT 'FERTIG','Fertig','#133b19','#b2fcb8',3,TRUE
WHERE NOT EXISTS (SELECT 1 FROM task_statuses WHERE code='FERTIG');

-- 4) Bestehende Tasks auf Default setzen
UPDATE tasks SET status_code='NEU' WHERE status_code IS NULL;

-- 5) NOT NULL + FK (ON UPDATE CASCADE erlaubt spätere Code-Umbenennungen)
ALTER TABLE tasks
    ALTER COLUMN status_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_code_fkey') THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_status_code_fkey
      FOREIGN KEY (status_code) REFERENCES task_statuses(code)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END$$;
