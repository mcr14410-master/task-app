# task-app — Start & Deploy

Monorepo mit **Frontend (Vite/React)**, **Backend (Spring Boot)** und **Docker/Compose**.  
Lokal in der IDE entwickeln, optional lokal in Docker testen, auf dem Pi mit Docker deployen.

---

## Inhalt

- `backend/` – Spring Boot (Java 17, Maven)
- `frontend/` – Vite/React (Node 20+, npm)
- `compose.yaml` – Services: `db`, `backend`, `caddy`
- `.env.example` – ENV-Vorlage (niemals echte Secrets commiten)
- (optional) `deploy.sh`, `dev.ps1`

---

## 1) Voraussetzungen

- Java 17, Maven (oder `./mvnw`)
- Node 20+, npm
- Docker & Docker Compose
- optional: `jq` für hübsche JSON-Ausgabe

---

## 2) Profile & Pfade (wichtig)

Pfade kommen aus `application.yml` **und** können per ENV in Compose überschrieben werden:

- `folderpicker.base-path`
- `attachments.base-path`

**Ladereihenfolge (später gewinnt):**
1. `application.yml` (Standard + Profil-Blöcke)
2. `application-<profile>.*` (falls vorhanden)
3. **ENV/Compose** (`FOLDERPICKER_BASE_PATH`, `ATTACHMENTS_BASE_PATH`, `SPRING_DATASOURCE_PASSWORD` …)

**Relaxed Binding:**  
`FOLDERPICKER_BASE_PATH` ⇄ `folderpicker.base-path`  
`ATTACHMENTS_BASE_PATH` ⇄ `attachments.base-path`

**Profilgruppe:**  
In `application.yml` ist `pi` als Gruppe definiert: `pi = [docker, prod]`.

---

## 3) Schnellstart lokal (IDE, Profil `dev`)

### Backend (Dev)
```bash
cd backend
./mvnw -DskipTests package
./mvnw spring-boot:run
# -> http://localhost:8080
```

### Frontend (Dev)
```bash
cd frontend
npm ci
npm run dev
# -> http://localhost:5173
```

**Dev-Pfade (Windows, in `application.yml`):**
```yaml
folderpicker:
  base-path: "C:/Users/Master/task-app/files"
attachments:
  base-path: "C:/Users/Master/task-app/files/attachments"
```

---

## 4) Docker lokal (Profil `docker`)

**ENV-Datei (nicht committen):** `.env.dev.docker`
```ini
SPRING_PROFILES_ACTIVE=docker
SPRING_DATASOURCE_PASSWORD=devpw
POSTGRES_PASSWORD=devpw
FOLDERPICKER_BASE_PATH=/data/files
ATTACHMENTS_BASE_PATH=/data/files/attachments
```

**Starten:**
```bash

docker compose down
docker compose --env-file .env.dev.docker build --no-cache
docker compose --env-file .env.dev.docker up -d

docker compose --env-file .env.dev.docker up -d
docker compose logs -f --tail=200 backend
```

---

## 5) Deployment auf dem Pi (Profilgruppe `pi` = `docker,prod`)

**ENV (auf dem Pi im Repo-Ordner):** `.env`
```ini
SPRING_PROFILES_ACTIVE=pi
SPRING_DATASOURCE_PASSWORD=<STRONG>
POSTGRES_PASSWORD=<STRONG>
FOLDERPICKER_BASE_PATH=/data/files
ATTACHMENTS_BASE_PATH=/data/files/attachments
```

**Starten/Update:**
```bash
docker compose up -d
docker compose ps
curl -s http://localhost/api/fs/health | jq .
```

**Volumes (Compose, Host → Container):**
- `/srv/taskapp/files` → `/data/files`
- `/srv/taskapp/files/attachments` → `/data/files/attachments`

---

## 6) Prod-Tuning (Profil `prod`)

- kleines Hikari-Pool-Sizing (Pi-freundlich)
- `show-sql=false`, schlankes Logging
- `server.shutdown=graceful`, Kompression aktiviert
- `forward-headers-strategy=framework` (Caddy)
- Actuator minimal (nur Health)

> `prod` **stapelt** sich über `docker`. Auf dem Pi wird per `SPRING_PROFILES_ACTIVE=pi` automatisch beides aktiviert.

---

## 7) Profil-Matrix (Überblick)

| Kontext        | `SPRING_PROFILES_ACTIVE` | Pfadquelle (`folderpicker`/`attachments`)                          | DB URL/User                                   | Passwörter            | FE API-Base | Reverse Proxy | Besonderheiten |
|----------------|---------------------------|---------------------------------------------------------------------|-----------------------------------------------|-----------------------|-------------|---------------|----------------|
| IDE lokal      | `dev`                     | `application.yml` (dev, Windows-Pfade)                              | `jdbc:postgresql://localhost:5432/taskapp` / `taskdb_admin` | IDE-ENV (z. B. `SPRING_DATASOURCE_PASSWORD`) | `http://localhost:8080` (dev) | –             | `show-sql=true`, ausführliches Logging |
| Docker lokal   | `docker`                  | **ENV/Compose** → `/data/files`, `/data/files/attachments`          | `jdbc:postgresql://db:5432/taskapp` / `task`  | `.env.dev.docker`     | `/api`      | Caddy (optional) | Prod-ähnlich ohne Prod-Tweaks |
| Prod (Pi)      | `docker,prod` oder `pi`   | **ENV/Compose** → `/data/files`, `/data/files/attachments`          | `jdbc:postgresql://db:5432/taskapp` / `task`  | `.env` am Pi          | `/api`      | Caddy         | Prod-Tweaks aktiv (s. o.) |

---

## 8) Nützliche Kommandos

```bash
# Backend-Logs (Compose)
docker compose logs -f --tail=200 backend

# Caddy neu laden (wenn Caddyfile geändert)
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# DB-Shell
docker compose exec db psql -U task -d taskapp

# Health (direkt Backend)
curl -s http://localhost:8080/api/fs/health | jq .

# Health (durch Caddy)
curl -s http://localhost/api/fs/health | jq .
```

---

## 9) Kiosk (optional, Pi)

Autostart via `~/.config/lxsession/LXDE-pi/autostart` → startet `~/bin/kiosk.sh`.  
Skalierung im Script (4K-TV): `SCALE="1.50"`.

---

## 10) Git-Hygiene

```
.env
.env.*
!/.env.example
!/.env.prod.example
```

---

## 11) Hilfsskripte

**Windows (lokal):** `dev.ps1`  
Baut Backend (skip tests), öffnet Frontend-Dev in neuem Fenster, startet Backend.

**Pi/Unix (Deploy):** `deploy.sh`  
Pull → Backend-Image bauen → Compose up → Status + Healthcheck.
