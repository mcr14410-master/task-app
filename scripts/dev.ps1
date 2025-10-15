# dev.ps1 — build & run locally on Windows
# Usage: PowerShell > .\dev.ps1

$ErrorActionPreference = "Stop"

# ensure script runs from repo root
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "[dev] Building backend..." -ForegroundColor Cyan
Push-Location backend
if (Test-Path .\mvnw.cmd) {
  .\mvnw.cmd -q -DskipTests package
} else {
  mvn -q -DskipTests package
}
Pop-Location

Write-Host "[dev] Starting frontend dev server (new window)..." -ForegroundColor Cyan
$frontendCmd = 'cd "{0}\frontend"; if (Test-Path package-lock.json) {{ npm ci }} else {{ npm install }}; npm run dev' -f (Get-Location).Path
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host "[dev] Starting backend (Spring Boot)..." -ForegroundColor Cyan
Push-Location backend
if (Test-Path .\mvnw.cmd) {
  .\mvnw.cmd spring-boot:run
} else {
  mvn spring-boot:run
}
Pop-Location
