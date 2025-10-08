#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Task-App updater

Usage:
  ./update.sh [--fast] [--backend] [--frontend] [--full] [--no-cache] [--logs]

Options (choose one of fast/backend/frontend/full; default = full):
  --fast        Git pull + docker compose up -d --no-build (kein Rebuild)
  --backend     Nur Backend neu bauen & neu starten
  --frontend    Nur Frontend neu bauen & neu starten
  --full        Backend & Frontend neu bauen & neu starten (DEFAULT)

Extras:
  --no-cache    Build ohne Cache
  --logs        Tail-Logs nach dem Start (frontend & backend)

Examples:
  ./update.sh --fast
  ./update.sh --backend --no-cache
  ./update.sh --full --logs
USAGE
}

section() { printf "\n\033[1;34m==> %s\033[0m\n" "$*"; }
die() { echo "ERROR: $*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

MODE="full"
NOCACHE=""
TAIL_LOGS=0

for arg in "$@"; do
  case "$arg" in
    -h|--help) usage; exit 0;;
    --fast) MODE="fast";;
    --backend) MODE="backend";;
    --frontend) MODE="frontend";;
    --full) MODE="full";;
    --no-cache) NOCACHE="--no-cache";;
    --logs) TAIL_LOGS=1;;
    *) echo "Unbekannte Option: $arg" >&2; usage; exit 2;;
  esac
done

have git || die "git nicht gefunden"
have docker || die "docker nicht gefunden"
docker compose version >/dev/null 2>&1 || die "'docker compose' nicht verfügbar (Docker Desktop/Compose V2?)"

section "Git pull"
git pull --ff-only

case "$MODE" in
  fast)
    section "Compose up (ohne Build)"
    docker compose up -d --no-build
    ;;
  backend)
    section "Backend build $NOCACHE"
    docker compose build $NOCACHE backend
    section "Backend up -d"
    docker compose up -d backend
    ;;
  frontend)
    section "Frontend build $NOCACHE"
    docker compose build $NOCACHE frontend
    section "Frontend up -d"
    docker compose up -d frontend
    ;;
  full)
    section "Backend & Frontend build $NOCACHE"
    docker compose build $NOCACHE backend frontend
    section "Compose up -d"
    docker compose up -d
    ;;
  *)
    die "Unbekannter Modus: $MODE"
    ;;
esac

if [[ $TAIL_LOGS -eq 1 ]]; then
  section "Logs (Strg+C zum Beenden)"
  docker compose logs -f backend frontend
else
  section "Status"
  docker compose ps
fi

section "Fertig ✅"
