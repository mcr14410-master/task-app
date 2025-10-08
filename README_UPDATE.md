# Update-Skripte

## Windows (PowerShell)
```powershell
# ggf. einmalig:
# Unblock-File .\scripts\update.ps1
# Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

.\scripts\update.ps1              # Full rebuild (Backend+Frontend) + up -d
.\scripts\update.ps1 -Fast        # git pull + up -d --no-build
.\scripts\update.ps1 -Backend     # nur Backend build + up
.\scripts\update.ps1 -Frontend    # nur Frontend build + up
.\scripts\update.ps1 -Full -NoCache -Logs   # harter Rebuild + Logs
```

## Linux/macOS
```bash
chmod +x ./scripts/update.sh
./scripts/update.sh                 # Full rebuild (Backend+Frontend)
./scripts/update.sh --fast          # git pull + up -d --no-build
./scripts/update.sh --backend       # nur Backend build + up
./scripts/update.sh --frontend      # nur Frontend build + up
./scripts/update.sh --full --no-cache --logs
```

Voraussetzungen:
- Docker Desktop (Compose V2: `docker compose version`)
- Git CLI
