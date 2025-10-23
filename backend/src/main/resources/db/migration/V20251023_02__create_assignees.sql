-- Zuständigkeiten / Bearbeiter (Assignees)
create table if not exists assignees (
  id          bigserial primary key,
  name        varchar(200)  not null,
  email       varchar(320),            -- optional
  active      boolean       not null default true,
  created_at  timestamp     not null default now(),
  updated_at  timestamp     not null default now()
);

-- Name muss je System eindeutig sein (case-insensitive)
create unique index if not exists ux_assignees_name
  on assignees (lower(name));
