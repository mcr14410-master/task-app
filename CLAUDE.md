# Task-App – Hinweise für Claude Code

Kanban für die Produktionsplanung. Läuft produktiv auf einem Firmen-Pi neben dem MDS und soll irgendwann im MDS aufgehen.
**Das Repo ist öffentlich:** keine Kundendaten, Zugangsdaten, IP-Adressen oder internen Hostnamen einchecken.

## Aufbau
- `backend/` – Spring Boot 3.1 / Java 17, Paket `com.pp`. JPA mit `ddl-auto: validate`, Schema nur über Flyway.
  Profile in `application.yml`: `dev`, `docker` (Produktion im Container), `prod`.
- `frontend/` – React + Vite 7, Board mit `@hello-pangea/dnd`, Live-Updates per SSE (`/api/tasks/stream`).
- `Caddyfile` – liefert `frontend/dist` aus (SPA-Fallback) und leitet `/api` an `backend:8080` weiter.
- `compose.yaml` – `db` (postgres:16), `backend`, `caddy` (Port 80). Backend-Port nur an `127.0.0.1`.

## Konventionen
- Flyway-Migrationen: `V<JJJJMMTT>_<NN>__<beschreibung>.sql`, z. B. `V20261102_01__arbeitsstation_abteilung.sql`.
  Bestehende Migrationen nie ändern.
- Release: Branch `release/vX.Y.Z` → PR gegen `main`. Version in `frontend/package.json` (+ Lockfile) hochziehen
  und Eintrag im Changelog von `frontend/src/components/settings/InfoTab.jsx` ergänzen.
  `CHANGELOG.md` und die Version in `backend/pom.xml` werden nicht mehr gepflegt.
- Commits: `type(scope): Beschreibung` auf Deutsch (feat, fix, ui, docs, refactor).
- Es gibt weder Backend-Tests noch CI. Prüfen heißt: `npm run build` und `npm run lint` im Frontend, Backend gegen
  eine Dev-DB starten (Flyway + Hibernate-Validierung) und die Oberfläche im Browser ansehen.

## Abteilungsansicht (seit v0.9.0)
- `/?abteilung=fraesen` bzw. `/?abteilung=drehen` zeigt nur das Board mit den Stationen dieser Abteilung.
  Reine Anzeige ohne Drag & Drop, ohne Dialoge und ohne Suche; lädt alle 60 s neu.
- Die Zuordnung erfolgt pro Station unter Einstellungen → Stationen (Spalte `arbeitsstation.abteilung`, Freitext).
  Der Vergleich ignoriert Groß-/Kleinschreibung und schreibt Umlaute um („Fräsen“ = `fraesen`).
- Ohne Parameter erscheint die normale Admin-Ansicht.

## Produktion (Firmen-Pi)
- Deployt wird nur auf dem Pi selbst, nie vom Dev-Server aus. Ablauf: DB sichern
  (`docker compose exec -T db pg_dump -U task taskapp > ~/taskapp-<anlass>.sql`), dann `./scripts/deploy.sh`.
  Das Skript pullt (mit Autostash), baut das Frontend in einem node:20-Container, baut und startet das Backend
  und lädt Caddy neu. Spring Boot braucht nach dem Start 30–60 s, bis `/api/fs/health` antwortet.
- Ändert ein Release `deploy.sh` selbst, vorher manuell `git pull --rebase` ausführen, damit schon die neue
  Version läuft.
- Kiosk-TV: `~/bin/kiosk.sh` (liegt nicht im Repo), gestartet über den LXDE-Autostart. Die angezeigte Seite
  steuert `APP_PATH`. `URL_BASE` nicht ändern, weil der Health-Check darauf aufbaut.
  Neustart ohne Reboot: Prozesse von kiosk.sh und Chromium beenden, dann
  `setsid nohup ~/bin/kiosk.sh >/dev/null 2>&1 </dev/null &`.
- Nacht-Backup: `scripts/backup.sh` per root-Crontab um 02:15, nutzt das restic-Repository des MDS mit Host-Namen `taskapp`.
  Einrichtung und Wiederherstellung: `docs/deploy_main.md`.
- Im Repo auf dem Pi liegen alte git-Stashes. Nicht ungefragt löschen.
