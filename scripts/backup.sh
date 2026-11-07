#!/bin/bash
# Task-App Nacht-Backup: DB-Dump prüfen, lokal aufbewahren und per restic aufs Netzlaufwerk sichern.
# Gesichert werden der neue Dump, die Anhänge und die .env.
# Cronjob (root): 15 2 * * * /home/rpi01/task-app/scripts/backup.sh >> /srv/taskapp/backups/backup.log 2>&1
# Manuell:        sudo ./scripts/backup.sh
# Einrichtung und Wiederherstellung: docs/deploy_main.md
#
# Nutzt das restic-Repository des MDS auf demselben Pi. Die Snapshots tragen den Host-Namen "taskapp",
# das Aufräumen des MDS (--host mds) lässt sie in Ruhe. OFFSITE_MOUNT="" überspringt das Einbinden.

set -euo pipefail
umask 077   # Dumps enthalten alle Aufträge, Backup-Ordner nur für root

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

BACKUP_DIR="${BACKUP_DIR:-/srv/taskapp/backups}"
ATTACHMENTS_DIR="${ATTACHMENTS_DIR:-/srv/taskapp/files/attachments}"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"
OFFSITE_MOUNT="${OFFSITE_MOUNT-/mnt/mds-offsite}"       # Eintrag in /etc/fstab (noauto)
export RESTIC_REPOSITORY="${RESTIC_REPOSITORY:-$OFFSITE_MOUNT/restic}"
export RESTIC_PASSWORD_FILE="${RESTIC_PASSWORD_FILE:-/root/.mds-restic-password}"

RESTIC_HOST="taskapp"      # fester Name, unabhängig vom Hostnamen des Pi
KEEP_DAYS=7
KEEP_DAILY=30
KEEP_MONTHLY=12
MIN_BYTES=2048                                   # alles darunter ist sicher kein vollständiger Dump
END_MARKER="PostgreSQL database dump complete"   # letzte Kommentarzeile jedes vollständigen pg_dump

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/taskapp_backup_$TIMESTAMP.sql.gz"
LOG_FILE="$BACKUP_DIR/backup.log"
MOUNTED_BY_US=0

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

unmount() {
  if [ "$MOUNTED_BY_US" = "1" ]; then
    timeout 30 umount "$OFFSITE_MOUNT" 2>/dev/null || umount -l "$OFFSITE_MOUNT" 2>/dev/null || true
    MOUNTED_BY_US=0
  fi
}
trap unmount EXIT

fail_dump() {
  rm -f "$BACKUP_FILE"
  log "❌ $* – Backup verworfen, alte Backups bleiben erhalten"
  exit 1
}

fail_offsite() {
  log "❌ $* – Netzlaufwerk-Sicherung fehlgeschlagen, der lokale Dump bleibt erhalten"
  exit 1
}

if [ ! -d "$BACKUP_DIR" ] || [ ! -w "$BACKUP_DIR" ]; then
  log "❌ Backup-Ordner $BACKUP_DIR fehlt oder ist nicht beschreibbar (Benutzer: $(whoami))"
  exit 1
fi

# Manueller Aufruf im Terminal: Ausgabe zusätzlich ins Log (Cron leitet selbst dorthin um)
if [ -t 1 ]; then
  exec > >(tee -a "$LOG_FILE") 2>&1
fi

# --- Dump erstellen und prüfen ---
log "📦 Erstelle Backup: $BACKUP_FILE"
if ! docker compose exec -T db pg_dump -U task taskapp | gzip > "$BACKUP_FILE"; then
  fail_dump "pg_dump fehlgeschlagen"
fi
SIZE_BYTES=$(stat -c %s "$BACKUP_FILE")
[ "$SIZE_BYTES" -ge "$MIN_BYTES" ] || fail_dump "Backup zu klein ($SIZE_BYTES Bytes)"
# grep -c statt -q: -q bricht beim Treffer ab, gunzip bekäme SIGPIPE und pipefail meldete Fehler
MARKER_COUNT=$(gunzip -c "$BACKUP_FILE" | grep -c "$END_MARKER" || true)
[ "${MARKER_COUNT:-0}" -ge 1 ] || fail_dump "Backup unvollständig (Endmarke „$END_MARKER“ fehlt)"
log "✅ Backup erstellt und geprüft: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# --- Lokal aufräumen, erst nach erfolgreichem, geprüftem Backup ---
find "$BACKUP_DIR" -name "taskapp_backup_*.sql.gz" -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name "taskapp_backup_*.sql.gz" -size -${MIN_BYTES}c -delete

# --- Netzlaufwerk ---
command -v restic >/dev/null || fail_offsite "restic nicht installiert"
[ -r "$RESTIC_PASSWORD_FILE" ] || fail_offsite "restic-Passwortdatei $RESTIC_PASSWORD_FILE fehlt"
[ "$(stat -c %a "$RESTIC_PASSWORD_FILE")" = "600" ] || fail_offsite "restic-Passwortdatei $RESTIC_PASSWORD_FILE muss chmod 600 haben"
[ -d "$ATTACHMENTS_DIR" ] || fail_offsite "Anhang-Ordner $ATTACHMENTS_DIR fehlt"
[ -r "$ENV_FILE" ] || fail_offsite ".env fehlt ($ENV_FILE)"

if [ -n "$OFFSITE_MOUNT" ]; then
  if mountpoint -q "$OFFSITE_MOUNT"; then
    log "Freigabe schon eingebunden ($OFFSITE_MOUNT), bleibt danach eingebunden"
  else
    [ "$(id -u)" = "0" ] || fail_offsite "Einbinden nur als root: sudo $0"
    log "Binde Freigabe ein: $OFFSITE_MOUNT"
    timeout 60 mount "$OFFSITE_MOUNT" || fail_offsite "Freigabe nicht erreichbar (mount $OFFSITE_MOUNT)"
    MOUNTED_BY_US=1
  fi
fi
[ -f "$RESTIC_REPOSITORY/config" ] || fail_offsite "Kein restic-Repository unter $RESTIC_REPOSITORY"

restic unlock >/dev/null 2>&1 || true   # entfernt nur verwaiste Sperren abgebrochener Läufe
log "📦 Sichere $(basename "$BACKUP_FILE"), $ATTACHMENTS_DIR, $(basename "$ENV_FILE")"
BACKUP_OUT=$(restic backup --host "$RESTIC_HOST" --tag nightly "$BACKUP_FILE" "$ATTACHMENTS_DIR" "$ENV_FILE" 2>&1) \
  || { echo "$BACKUP_OUT"; fail_offsite "restic backup fehlgeschlagen"; }
echo "$BACKUP_OUT"
SNAPSHOT=$(echo "$BACKUP_OUT" | sed -n 's/^snapshot \([0-9a-f]*\) saved$/\1/p' | tail -1)
[ -n "$SNAPSHOT" ] || fail_offsite "restic backup ohne Snapshot-ID"

# group-by host: der Dump heißt jeden Tag anders, nach Pfaden gruppiert würde nie etwas gelöscht
log "🗑️  Aufräumen (täglich $KEEP_DAILY, monatlich $KEEP_MONTHLY)"
restic forget --host "$RESTIC_HOST" --group-by host --keep-daily "$KEEP_DAILY" --keep-monthly "$KEEP_MONTHLY" --prune \
  || fail_offsite "restic forget/prune fehlgeschlagen (Snapshot $SNAPSHOT ist gespeichert)"

log "✅ Netzlaufwerk-Sicherung fertig: Snapshot $SNAPSHOT"
