-- Zusatzarbeiten (analog Status-System), z. B. FAI, QS, Sonderprüfung, etc.
-- Postgres-Syntax (jsonb für optionale Flag-Details)

create table if not exists additional_works (
  id           bigserial primary key,
  code         varchar(64)  not null,         -- technischer Schlüssel (z. B. "FAI")
  label        varchar(200) not null,         -- Anzeigename (z. B. "Erstmusterprüfung (FAI)")
  type         varchar(64),                   -- freie Typisierung (z. B. "quality", "logistics")
  flags        jsonb,                         -- optionale Detail-Flags (oder später Bitmask/Enum)
  active       boolean     not null default true,
  sort_order   integer     not null default 0,
  color_bg     varchar(16),                   -- optionale Farbwerte (HEX)
  color_fg     varchar(16),
  is_final     boolean     not null default false,  -- z. B. finale Zusatzarbeit (falls sinnvoll)
  created_at   timestamp   not null default now(),
  updated_at   timestamp   not null default now()
);

-- Eindeutiger Code (case-insensitive)
create unique index if not exists ux_additional_works_code
  on additional_works (lower(code));

-- Optionale sinnvolle Indizes
create index if not exists ix_additional_works_active_order
  on additional_works (active desc, sort_order asc, lower(label));

-- Hinweis:
--  - updated_at wird in der Entity via @PreUpdate gepflegt (kein DB-Trigger nötig).
--  - flags ist jsonb; falls DB != Postgres, bitte auf text/json umstellen.
