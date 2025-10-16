0) Voraussetzungen

Raspberry Pi mit Debian (Bookworm/Trixie)

Docker & Docker Compose

Windows-Share erreichbar (\WINHOST\SHARE), Benutzer/Pass bekannt

1) CIFS-Tools installieren
sudo apt update
sudo apt install -y cifs-utils

2) Mountpoint anlegen
sudo mkdir -p /srv/taskapp/files

3) Credentials sicher ablegen
sudo mkdir -p /etc/samba/credentials
sudo nano /etc/samba/credentials/taskapp.cred


Inhalt:

username=WINUSER
password=DEINPASS
# optional:
# domain=DEINEDOMAIN


Rechte:

sudo chmod 600 /etc/samba/credentials/taskapp.cred

4) Test-Mount
sudo mount -t cifs //WINHOST/SHARE /srv/taskapp/files \
  -o credentials=/etc/samba/credentials/taskapp.cred,uid=1000,gid=1000,dir_mode=0775,file_mode=0664,vers=3.0,iocharset=utf8,nounix,noserverino


Check:

mount | grep /srv/taskapp/files
ls -al /srv/taskapp/files
touch /srv/taskapp/files/_write-test.txt


Tipp: Bei anderen Servern ggf. vers=3.1.1 oder vers=2.1 testen.

5) Dauerhaft einhängen (fstab, mit Automount)
sudo nano /etc/fstab


Zeile ergänzen:

//WINHOST/SHARE  /srv/taskapp/files  cifs  credentials=/etc/samba/credentials/taskapp.cred,uid=1000,gid=1000,dir_mode=0775,file_mode=0664,vers=3.0,iocharset=utf8,nounix,noserverino,_netdev,x-systemd.automount,x-systemd.requires=network-online.target  0  0


Aktivieren:

sudo systemctl daemon-reload
sudo systemctl restart remote-fs.target
# oder sauberer: sudo reboot

6) Docker Compose binden

In compose.yaml sicherstellen (Ausschnitt):

services:
  backend:
    volumes:
      - /srv/taskapp/files:/data/files:rw
  caddy:
    volumes:
      - ./frontend/dist:/srv/frontend:ro


Falls Anhänge im Unterordner liegen sollen:
sudo mkdir -p /srv/taskapp/files/attachments && sudo chown 1000:1000 /srv/taskapp/files/attachments

7) ENV auf dem Pi

.env im Repo-Root:

SPRING_PROFILES_ACTIVE=pi
FOLDERPICKER_BASE_PATH=/data/files
ATTACHMENTS_BASE_PATH=/data/files/attachments
SPRING_DATASOURCE_PASSWORD=<STRONG>
POSTGRES_PASSWORD=<STRONG>

8) Deploy (Kurz)
# Frontend-Build (im Node-Container, kein Node auf dem Pi nötig)
docker run --rm -v "$PWD/frontend":/app -w /app node:20 \
  bash -lc "npm ci && npm run build"

docker compose build backend
docker compose up -d
curl -s http://localhost/api/fs/health | jq .

9) Troubleshooting

Mount klappt nicht / Permission denied

uid/gid prüfen (id zeigt deinen User, meist 1000)

SMB-Version variieren: vers=3.1.1 oder vers=2.1

Freigaberechte auf dem Windows-Host prüfen (NTFS + Share-Permissions)

Boot hängt wegen Share

_netdev + x-systemd.automount sind gesetzt? (siehe fstab-Zeile)

Netzwerk-Bereitschaft: x-systemd.requires=network-online.target

Langsam/instabil

Kabelnetz bevorzugen

Optional cache=strict (Konsistenz) oder actimeo=1 testen

Container sieht den Mount nicht

docker compose restart backend

Im Container prüfen: docker compose exec backend ls -al /data/files

10) Rückbau / Unmount
sudo umount /srv/taskapp/files || sudo umount -l /srv/taskapp/files
sudo sed -i '\|/srv/taskapp/files|d' /etc/fstab

TL;DR

CIFS mounten nach /srv/taskapp/files

In Compose als /data/files binden

ENV: FOLDERPICKER_BASE_PATH=/data/files

Deploy. Fertig.



