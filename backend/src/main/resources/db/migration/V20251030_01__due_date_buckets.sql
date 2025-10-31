-- V20251030_01__due_date_buckets.sql
-- Persistenz für visuelle Fälligkeits-Buckets

-- Tabelle
CREATE TABLE due_date_bucket (
    key          VARCHAR(64) PRIMARY KEY,        -- z.B. 'overdue', 'today', 'custom-1'
    label        VARCHAR(128) NOT NULL,          -- Anzeigename
    min_days     INTEGER NULL,                   -- inklusiv; NULL = -∞
    max_days     INTEGER NULL,                   -- inklusiv; NULL = +∞
    color        VARCHAR(32) NOT NULL,           -- z.B. '#ef4444' oder 'rgb(255,0,0)'
    role         VARCHAR(16) NOT NULL,           -- 'overdue' | 'warn' | 'ok' (nur Visual-Gruppierung)
    fixed        BOOLEAN NOT NULL DEFAULT FALSE, -- System-Buckets (overdue/today) = TRUE
    sort_order   INTEGER NOT NULL                -- Reihenfolge in der UI
);

-- Basiskonsistenzen
ALTER TABLE due_date_bucket
    ADD CONSTRAINT chk_due_bucket_role
        CHECK (role IN ('overdue', 'warn', 'ok'));

-- (Optional) sinnvolle Sortierung per Index
CREATE INDEX idx_due_date_bucket_sort ON due_date_bucket (sort_order);

-- Defaults seeden (nur wenn leer)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM due_date_bucket) THEN
        INSERT INTO due_date_bucket (key, label, min_days, max_days, color, role, fixed, sort_order) VALUES
            -- feste System-Buckets:
            ('overdue', 'Überfällig', NULL, -1,    '#ef4444', 'overdue', TRUE,  10),
            ('today',   'Heute',       0,    0,    '#f5560a', 'warn',    TRUE,  20),

            -- frei konfigurierbare Defaults:
            ('soon',    'Bald',        1,    3,    '#facc15', 'warn',    FALSE, 30),
            ('week',    'Woche',       4,    7,    '#0ea5e9', 'ok',      FALSE, 40),
            ('future',  'Zukunft',     8,    NULL, '#94a3b8', 'ok',      FALSE, 50);
    END IF;
END$$;
