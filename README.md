# Task App (Monorepo)

- `backend/`: Spring Boot (Java 17, Maven)
- `frontend/`: React (Vite, Node.js)

## Development
- Backend starten: `mvn spring-boot:run` im Ordner `backend/`
- Frontend starten: `npm run dev` im Ordner `frontend/`






# task-app — Start & Deploy

Kurzfassung: **Monorepo mit Frontend (Vite) + Backend (Spring Boot) + Docker/Compose**.  
Lokal entwickeln, auf dem Pi per Compose deployen.

---

## 1) Voraussetzungen

- **Backend**: Java 17, Maven (oder `./mvnw`)
- **Frontend**: Node 20+, npm
- **Docker/Compose** (für Pi/Prod)
- Optional: `jq` für hübsche JSON-Outputs

---

## 2) Profile & Pfade (wichtig)

Pfade kommen **immer** aus `application.yml`/Profil + **ENV**:
- `folderpicker.base-path`
- `attachments.base-path`

**Reihenfolge (später gewinnt):**
1. `application.yml` (Default/Profil)
2. `application-<profile>.*`
3. **ENV** (`FOLDERPICKER_BASE_PATH`, `ATTACHMENTS_BASE_PATH`)

**Dev (Windows)** – in `application.yml`:
```yaml
spring.profiles.active: dev
folderpicker.base-path: "C:/Users/Master/task-app/files"
attachments.base-path: "C:/Users/Master/task-app/files/attachments"


Docker/Prod – via .env/Compose:

# .env
FOLDERPICKER_BASE_PATH=/data/files
ATTACHMENTS_BASE_PATH=/data/files/attachments
SPRING_DATASOURCE_PASSWORD=change-me
POSTGRES_PASSWORD=change-me



## 3) Schnellstart lokal (IDE/CLI)
Backend (dev)
cd backend
./mvnw -DskipTests package
./mvnw spring-boot:run
# läuft auf http://localhost:8080

Frontend (dev)
cd frontend
npm ci
npm run dev
# läuft auf http://localhost:5173 (VITE_API_BASE im .env.development beachten)

## 4) Docker (Pi/Prod)
Einmalig auf dem Pi
# im Repo-Root
cp .env.example .env        # und Secrets setzen
docker compose up -d db     # DB starten
docker compose build backend
docker compose up -d backend
docker compose up -d caddy  # Reverse Proxy + statische Files

Health-Checks
# Backend OK?
curl -s http://localhost:8080/api/fs/health | jq .

# Durch Caddy (UI/Proxy)
curl -I http://localhost/
curl -s http://localhost/api/fs/health | jq .

## 5) Deploy-Workflow (Pi)
git pull --rebase
docker compose build backend
docker compose up -d
docker compose ps
curl -s http://localhost/api/fs/health | jq .

## 6) Ordner/Volumes (Compose)

Host: /srv/taskapp/files → Container: /data/files

Anhänge: /srv/taskapp/files/attachments → /data/files/attachments

Passen zum FOLDERPICKER_BASE_PATH & ATTACHMENTS_BASE_PATH in .env.

## 7) Kiosk (optional, Pi)

Autostart via ~/.config/lxsession/LXDE-pi/autostart ruft ~/bin/kiosk.sh auf.
Skalierung im Script: SCALE="1.50" (für 4K-TV).

## 8) Troubleshooting

Pfad wird nicht gefunden: Logs beim Start zeigen FolderPicker base: und Attachments base:

Actuator 404: Wir nutzen /api/fs/health als Health-Endpoint.

VNC Bild weich: RealVNC Viewer auf „Best/Full Color“, 100% Zoom; für Admin lieber RDP.

## 9) Nützliche Kommandos
# Backend-Logs (Compose)
docker compose logs -f --tail=200 backend

# Caddy neu laden
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# DB-Shell
docker compose exec db psql -U task -d taskapp

## 10) Struktur
backend/         # Spring Boot
frontend/        # Vite React
compose.yaml     # Services: db, backend, caddy
.env.example     # ENV-Vorlage (copy to .env)


---

# `Makefile` (optional, falls du make nutzt)
```make
.PHONY: backend-build backend-run frontend-dev compose-up backend-logs deploy

backend-build:
	cd backend && ./mvnw -DskipTests package

backend-run:
	cd backend && ./mvnw spring-boot:run

frontend-dev:
	cd frontend && npm ci && npm run dev

compose-up:
	docker compose up -d

backend-logs:
	docker compose logs -f --tail=200 backend

deploy:
	git pull --rebase
	docker compose build backend
	docker compose up -d
	docker compose ps
	curl -s http://localhost/api/fs/health | jq .

package.json-Skripte (frontend) – Ergänzung
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 5173",
    "lint": "eslint ."
  }
}

deploy.sh (Pi, komfort)
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
git pull --rebase
docker compose build backend
docker compose up -d
docker compose ps
curl -s http://localhost/api/fs/health | jq . || true

dev.ps1 (Windows, lokal)
# Backend bauen & laufen lassen; Frontend dev in zweitem Terminal starten
cd backend; ./mvnw -q -DskipTests package; Start-Process powershell -ArgumentList 'cd ..\frontend; npm ci; npm run dev'; ./mvnw spring-boot:run
