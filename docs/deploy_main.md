1) Einmalig auf dem Pi einrichten
cd ~/task-app
git fetch origin
git checkout -B main origin/main    # lokalen main neu aufsetzen & auf origin/main tracken
git config pull.rebase true         # pull macht künftig rebase statt merge


Sanity-Check:

git rev-parse --abbrev-ref HEAD     # → main
git rev-parse --abbrev-ref @{u}     # → origin/main

2) Vor jedem Deploy (immer gleich)
cd ~/task-app
git status -sb                      # kurzer Blick: sauberer Baum?
git pull --rebase                   # neuen Stand holen (von origin/main)


Falls lokale Änderungen rumliegen:

git stash push -u -m "pi-autostash"
git pull --rebase
git stash pop || true               # nur wenn du die Änderungen wirklich brauchst

3) Deploy (Frontend bauen → Backend hoch)
# Frontend build (im Container, kein Node auf dem Pi nötig)
docker run --rm -v "$PWD/frontend":/app -w /app node:20 \
  bash -lc "npm ci && npm run build"

# Backend & Proxy
docker compose build backend
docker compose up -d

# Checks
docker compose ps
curl -s http://localhost/api/fs/health | jq .

Optional: Pull-Autostash in dein deploy.sh

Dann reicht ein Aufruf und es klappt auch mit lokalen Änderungen:

echo "[deploy] pulling..."
git fetch --all --prune
if ! git diff --quiet || ! git diff --quiet --staged || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "[deploy] local changes -> autostash"
  git stash push -u -m "deploy-autostash $(date -Iseconds)"
  STASHED=1
fi
git pull --rebase
[ "${STASHED:-0}" = "1" ] && git stash pop || true

Mini-Spickzettel

Welcher Branch? → git rev-parse --abbrev-ref HEAD (soll main sein)

Welcher Upstream? → git rev-parse --abbrev-ref @{u} (soll origin/main sein)

Sauberer Baum? → git status -sb

Nie frontend/dist pushen; auf dem Pi immer bauen (siehe oben)

.env bleibt nur lokal auf dem Pi (nicht in Git)

