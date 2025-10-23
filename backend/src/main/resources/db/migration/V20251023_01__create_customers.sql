-- Kunden-Stammdaten
create table if not exists customers (
  id          bigserial primary key,
  name        varchar(200)  not null,
  active      boolean       not null default true,
  created_at  timestamp     not null default now(),
  updated_at  timestamp     not null default now()
);

-- eindeutige Namen (case-insensitive)
create unique index if not exists ux_customers_name
  on customers (lower(name));

-- Trigger-Äquivalent fallback (optional; wer DB-Trigger nutzt, kann die updated_at-Logik dort pflegen)
-- Für jetzt machen wir es in der Entity per @PreUpdate.
