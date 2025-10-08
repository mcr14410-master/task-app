param(
  [switch]$Fast,
  [switch]$Backend,
  [switch]$Frontend,
  [switch]$Full,
  [switch]$NoCache,
  [switch]$Logs
)

function Write-Section($t) { Write-Host "`n==> $t" -ForegroundColor Cyan }
function Die($m) { Write-Host "ERROR: $m" -ForegroundColor Red; exit 1 }

$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) { Die "git nicht gefunden" }
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) { Die "docker nicht gefunden" }
try { docker compose version | Out-Null } catch { Die "'docker compose' nicht verfügbar (Docker Desktop/Compose V2?)" }

$mode = "full"
if ($Fast) { $mode = "fast" }
elseif ($Backend) { $mode = "backend" }
elseif ($Frontend) { $mode = "frontend" }
elseif ($Full) { $mode = "full" }

$cacheArg = ""
if ($NoCache) { $cacheArg = "--no-cache" }

Write-Section "Git pull"
git pull --ff-only
if ($LASTEXITCODE -ne 0) { Die "git pull fehlgeschlagen" }

switch ($mode) {
  "fast" {
    Write-Section "Compose up (ohne Build)"
    docker compose up -d --no-build
    if ($LASTEXITCODE -ne 0) { Die "docker compose up fehlgeschlagen" }
  }
  "backend" {
    Write-Section "Backend build $cacheArg"
    docker compose build $cacheArg backend
    if ($LASTEXITCODE -ne 0) { Die "backend build fehlgeschlagen" }
    Write-Section "Backend up -d"
    docker compose up -d backend
  }
  "frontend" {
    Write-Section "Frontend build $cacheArg"
    docker compose build $cacheArg frontend
    if ($LASTEXITCODE -ne 0) { Die "frontend build fehlgeschlagen" }
    Write-Section "Frontend up -d"
    docker compose up -d frontend
  }
  "full" {
    Write-Section "Backend & Frontend build $cacheArg"
    docker compose build $cacheArg backend frontend
    if ($LASTEXITCODE -ne 0) { Die "build fehlgeschlagen" }
    Write-Section "Compose up -d"
    docker compose up -d
  }
  default { Die "Unbekannter Modus: $mode" }
}

if ($Logs) {
  Write-Section "Logs (Ctrl+C zum Beenden)"
  docker compose logs -f backend frontend
} else {
  Write-Section "Status"
  docker compose ps
}

Write-Section "Fertig ✅"
