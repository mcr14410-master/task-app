# dev-rebuild.ps1
# Lokaler "prod-like" Neu-Start:
# 1. Frontend builden -> ./frontend/dist
# 2. Docker-Stack sauber neu bauen
# 3. Stack hochfahren
# 4. Health / Status ausgeben

$ErrorActionPreference = "Stop"

Write-Host "[dev] step 1/5: checking folders..."
# prüft grob, ob wir im richtigen Verzeichnis sind
if (-not (Test-Path "./compose.yaml")) {
    Write-Host "[dev] WARN: compose.yaml nicht im aktuellen Ordner gefunden. Bitte im Projekt-Root ausführen." -ForegroundColor Yellow
}

if (-not (Test-Path "./frontend/package.json")) {
    Write-Host "[dev] ERROR: ./frontend/package.json nicht gefunden. Frontend-Verzeichnis nicht da?"
    exit 1
}
if (-not (Test-Path "./backend/pom.xml")) {
    Write-Host "[dev] ERROR: ./backend/pom.xml nicht gefunden. Backend-Verzeichnis nicht da?"
    exit 1
}

Write-Host "[dev] step 2/5: frontend build (npm install && npm run build) ..."
Push-Location ./frontend
# Wir nehmen absichtlich kein Docker hier, für Dev reicht lokales Node.
# Falls du Node nicht lokal haben willst, können wir das in eine docker run Variante drehen.
npm install
npm run build
Pop-Location

Write-Host "[dev] step 3/5: docker compose down ..."
docker compose down

Write-Host "[dev] step 4/5: docker compose build (backend image + multi-stage maven build) ..."
docker compose build --no-cache

Write-Host "[dev] step 5/5: docker compose up -d ..."
docker compose up -d

Write-Host ""
Write-Host "===== status ====="
docker compose ps

Write-Host ""
Write-Host "===== backend health ====="
try {
    curl.exe -s http://localhost:8080/api/fs/health
} catch {
    Write-Host "[dev] healthcheck request failed (backend evtl. noch im Bootvorgang)"
}

Write-Host ""
Write-Host "[dev] done. Browser-URL:"
Write-Host "  http://localhost   (Caddy -> Frontend dist + Backend proxy)"
Write-Host "  http://localhost:8080/api/fs/health   (direkt Backend)"
