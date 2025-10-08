param([switch]$DryRun)

$root = Join-Path (Get-Location) "frontend\src"
if (!(Test-Path $root)) { Write-Host "Pfad nicht gefunden: $root" -ForegroundColor Yellow; exit 1 }

$files = Get-ChildItem -Path $root -Recurse -Include *.js,*.jsx,*.ts,*.tsx
$pattern = 'http://localhost:8080/api'
$repl = '/api'

foreach ($f in $files) {
  $content = Get-Content -Raw -LiteralPath $f.FullName
  if ($content -match [regex]::Escape($pattern)) {
    if ($DryRun) { Write-Host "[DRY] würde ersetzen in: $($f.FullName)" }
    else {
      $new = $content -replace [regex]::Escape($pattern), $repl
      Set-Content -LiteralPath $f.FullName -Value $new -NoNewline
      Write-Host "[OK ] ersetzt in: $($f.FullName)"
    }
  }
}
Write-Host "Fertig." -ForegroundColor Cyan
