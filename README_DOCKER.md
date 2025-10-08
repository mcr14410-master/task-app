# Task-App: Docker & Compose

## Quickstart (lokal)
```bash
docker compose build
docker compose up -d

# Frontend: http://localhost:8081
# Backend:  http://localhost:8080 (optional direkt)
```
> Frontend sollte die API relativ als **/api** aufrufen; Nginx proxyt /api -> backend:8080.

## Struktur
```
.
├─ backend/
│  └─ Dockerfile
├─ frontend/
│  ├─ Dockerfile
│  └─ nginx.conf
└─ docker-compose.yml
```

## ENV
- DB: taskdb / taskuser / taskpass (siehe compose)
- Backend: Flyway enabled, ddl-auto=validate
- Frontend: `VITE_API_BASE_URL` Build-ARG (optional)

## Images auf 2. PC
- Registry: `docker push youruser/taskapp-frontend:0.4.14` u. `...-backend:0.4.14`
- Offline: `docker save -o taskapp_frontend.tar taskapp-frontend` + `docker load -i ...`

## Troubleshooting
- 404 bei Reload -> nginx.conf SPA fallback.
- CORS -> /api nutzen statt http://localhost:8080.
- „missing column“ -> Migrationen / manuelle ALTER TABLE.
