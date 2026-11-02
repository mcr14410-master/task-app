-- V20261102_01__arbeitsstation_abteilung.sql
-- Ordnet Arbeitsstationen einer Abteilung zu (z. B. "Fräsen", "Drehen").
-- Die Abteilungsansicht (?abteilung=...) zeigt nur die Stationen dieser Abteilung.

ALTER TABLE arbeitsstation
    ADD COLUMN abteilung VARCHAR(50);

-- Hinweis:
--  - NULL = keiner Abteilung zugeordnet (erscheint nur in der Admin-Ansicht).
--  - Freitext, damit neue Abteilungen ohne Code-Änderung angelegt werden können.
