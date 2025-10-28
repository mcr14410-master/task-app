-- Neue Spalte für flexible Zusatzarbeiten an einer Task.
-- Speichert eine Liste von Codes (z. B. '["fai","qs"]') als Text.
-- NULL bedeutet: keine Zusatzarbeiten.
ALTER TABLE tasks
ADD COLUMN additional_works TEXT;
