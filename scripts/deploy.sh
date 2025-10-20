#!/usr/bin/env bash
set -euo pipefail

# --- Pfade & Umgebung sauber bestimmen ---
# REPO_ROOT = Ordner über "scripts/"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
BACKEND_DIR="$REPO_ROOT/task-management-backend"
NPM_CACHE_DIR="$REPO_ROOT/.cache/npm"

echo "[deploy] repo root:  $REPO_ROOT"
echo "[deploy] frontend:   $FRONTEND_DIR"
echo "[deploy] backend:    $BACKEND_DIR"

# Minimalchecks
command -v docker >/dev/null || { echo "[deploy] Docker nicht gefunden"; exit 1; }
command -v git >/dev/null || { echo "[deploy] Git nicht gefunden"; exit 1; }
test -f "$FRONTEND_DIR/package.json" || { echo "[deploy] $FRONTEND_DIR/package.json fehlt"; exit 1; }

# --- Git Pull mit Autostash ---
echo "[deploy] pulling..."
pushd "$REPO_ROOT" >/dev/null
if ! git diff --quiet || ! git diff --quiet --staged || test -n "$(git ls-files --others --exclude-standard)"; then
  echo "[deploy] local changes -> autostash"
  git stash push -u -m "deploy-autostash $(date -Iseconds)" || true
  STASHED=1
else
  STASHED=0
fi
git fetch --all --prune
git pull --rebase
if [ "${STASHED:-0}" = "1" ]; then
  git stash pop || true
fi
popd >/dev/null

# --- Frontend-Build im Container ---
echo "[deploy] Frontend-Build (im Container)..."
# Node-UID/GID auf Host übernehmen, um Root-Dateien zu vermeiden
UID_GID="$(id -u):$(id -g)"
mkdir -p "$NPM_CACHE_DIR"

docker run --rm \
  -u "$UID_GID" \
  -v "$FRONTEND_DIR":/app \
  -v "$NPM_CACHE_DIR":/home/node/.npm \
  -w /app node:20 bash -lc '
    set -e
    # Ownership-Fallen vermeiden (falls vorher als root gebaut wurde)
    if [ -d node_modules ] && [ ! -w node_modules ]; then
      echo "[container] node_modules nicht beschreibbar -> entferne sie"
      rm -rf node_modules
    fi
    # Lockfile respektieren: bevorzugt "npm ci"
    if [ -f package-lock.json ]; then
      echo "[container] npm ci (clean install)"
      npm ci --no-audit --no-fund
    else
      echo "[container] npm install (kein Lockfile gefunden)"
      npm install --no-audit --no-fund
    fi
    echo "[container] npm run build"
    npm run build
  '

# --- Backend-Image bauen & Services starten ---
echo "[deploy] building backend image..."
pushd "$REPO_ROOT" >/dev/null
docker compose build backend

echo "[deploy] starting/updating services..."
docker compose up -d
popd >/dev/null

# --- Status & Healthcheck ---
echo "[deploy] status:"
docker compose ps

echo "[deploy] health:"
if command -v jq >/dev/null 2>&1; then
  curl -s http://localhost/api/ts/health | jq . || true
else
  curl -s http://localhost/api/ts/health || true
fi

echo "[deploy] done."

