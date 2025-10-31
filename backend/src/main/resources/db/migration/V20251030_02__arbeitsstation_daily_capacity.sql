-- V20251030_02__arbeitsstation_daily_capacity.sql
-- Fügt je Arbeitsstation eine konfigurierbare Tageskapazität (in Stunden) hinzu.

ALTER TABLE arbeitsstation
    ADD COLUMN daily_capacity_hours NUMERIC(5,2) NOT NULL DEFAULT 8.00;

-- Hinweis:
--  - Default 8.00 h pro Kalendertag.
--  - Workday-/Feiertagslogik wird in einem späteren Schritt ergänzt
--    (separate Migration, z. B. Station-Parameter oder globale Kalender-Tabelle).
