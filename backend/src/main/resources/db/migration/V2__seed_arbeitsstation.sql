-- V2__seed_arbeitsstation.sql (PostgreSQL)
WITH s(name, sort_order) AS (
  VALUES
    ('nicht zugeordnet', 0),
    ('DMG DMU85', 1),
    ('Hermle C22', 2),
    ('Grob G350', 3),
    ('Mazak HCN5000', 4),
    ('MTrent MTCut', 5)
)
INSERT INTO public.arbeitsstation (name, sort_order)
SELECT s.name, s.sort_order
FROM s
WHERE NOT EXISTS (
  SELECT 1 FROM public.arbeitsstation a WHERE a.name = s.name
);
