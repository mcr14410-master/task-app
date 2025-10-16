#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "[deploy] pulling..."
git fetch --all --prune
if ! git diff --quiet || ! git diff --quiet --staged || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "[deploy] local changes -> autostash"
  git stash push -u -m "deploy-autostash $(date -Iseconds)"
  STASHED=1
fi
git pull --rebase
[ "${STASHED:-0}" = "1" ] && git stash pop || true

echo "[deploy] Frontend-Build (im Container)..."
docker run --rm -v "$PWD/frontend":/app -w /app node:20 bash -lc "npm ci && npm run build"

echo "[deploy] building backend image..."
docker compose build backend

echo "[deploy] starting/updating services..."
docker compose up -d

echo "[deploy] status:"
docker compose ps

echo "[deploy] health:"
if command -v jq >/dev/null 2>&1; then
  curl -s http://localhost/api/fs/health | jq . || true
else
  curl -s http://localhost/api/fs/health || true
fi
