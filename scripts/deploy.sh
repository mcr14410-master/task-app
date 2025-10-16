#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "[deploy] pulling..."
git pull --rebase

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
