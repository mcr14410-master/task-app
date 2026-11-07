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


## Nacht-Backup

`scripts/backup.sh` erstellt nachts einen DB-Dump und prüft ihn. Lokal bleiben 7 Tage in `/srv/taskapp/backups`.
Dump, Anhänge (`/srv/taskapp/files/attachments`) und `.env` gehen per restic aufs Netzlaufwerk
(30 Tage täglich, 12 Monate monatlich). Das Skript nutzt das restic-Repository des MDS auf demselben Pi mit dem
Host-Namen `taskapp`. Dessen Freigabe, Passwortdatei und `restic` müssen also eingerichtet sein. Die Windows-Freigabe
`share1` wird nicht gesichert.

### Einrichtung (einmalig)

```bash
cd ~/task-app && git pull --rebase
sudo mkdir -p /srv/taskapp/backups && sudo chmod 700 /srv/taskapp/backups
sudo ./scripts/backup.sh
(sudo crontab -l; echo '15 2 * * * /home/rpi01/task-app/scripts/backup.sh >> /srv/taskapp/backups/backup.log 2>&1') | sudo crontab -
sudo crontab -l
```

Der erste Lauf muss mit `✅ Netzlaufwerk-Sicherung fertig` enden. Die Uhrzeit liegt bewusst vor den MDS-Jobs (02:30, 02:45),
weil sich restic-Läufe im selben Repository sonst gegenseitig sperren können.

Fehlschläge stehen nur in `/srv/taskapp/backups/backup.log`, es gibt keine Anzeige in der App.

### Wiederherstellen

Den Dump lokal aus `/srv/taskapp/backups` nehmen oder vom Netzlaufwerk holen:

```bash
sudo mount /mnt/mds-offsite
export RESTIC_REPOSITORY=/mnt/mds-offsite/restic RESTIC_PASSWORD_FILE=/root/.mds-restic-password
sudo -E restic snapshots --host taskapp
sudo -E restic restore latest --host taskapp --target /tmp/taskapp-restore
sudo umount /mnt/mds-offsite
```

Danach in eine leere Datenbank einspielen. Das ersetzt den aktuellen Stand, also vorher einen frischen Dump ziehen:

```bash
cd ~/task-app
docker compose stop backend
docker compose exec -T db dropdb -U task taskapp
docker compose exec -T db createdb -U task taskapp
sudo sh -c 'gunzip -c <DUMP>.sql.gz' | docker compose exec -T db psql -q -U task -d taskapp
docker compose start backend
```
