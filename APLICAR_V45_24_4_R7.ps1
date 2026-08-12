$ErrorActionPreference = "Stop"

function Fail([string]$message) {
  throw $message
}

function Replace-Strict([string]$content, [string]$oldValue, [string]$newValue, [string]$label) {
  if (-not $content.Contains($oldValue)) {
    Fail "Nao encontrei o trecho esperado: $label"
  }
  return $content.Replace($oldValue, $newValue)
}

if (-not (Test-Path -LiteralPath "package.json")) {
  Fail "Execute este pacote na raiz do repositorio candinho-gestao."
}

$target = "src/app/v45-24-company-home-final.css"

if (-not (Test-Path -LiteralPath $target)) {
  Fail "Arquivo nao encontrado: $target"
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.24.4 R7 - Moeda da Vitrine (PC centraliza + sobe)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = Join-Path (
  Split-Path -Parent (Get-Location)
) "BACKUP_V45_24_4_R7_$stamp"

$backupFile = Join-Path $backupRoot $target
$backupDir = Split-Path -Parent $backupFile
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item -LiteralPath $target -Destination $backupFile -Force

Write-Host "Backup criado em:" -ForegroundColor Yellow
Write-Host " $backupRoot" -ForegroundColor Yellow

$content = [System.IO.File]::ReadAllText(
  (Get-Item -LiteralPath $target).FullName,
  [System.Text.Encoding]::UTF8
).Replace("`r`n","`n")

# Incremental sobre a R6: desktop only.
$content = Replace-Strict `
  $content `
  'left: 73.1%;' `
  'left: 71.4%;' `
  'left desktop da moeda (centro do podium)'

$content = Replace-Strict `
  $content `
  'top: 52.8%;' `
  'top: 48.6%;' `
  'top desktop da moeda (sobe bem mais)'

$content = $content.TrimEnd("`r","`n"," ","`t") + "`n"

[System.IO.File]::WriteAllText(
  (Get-Item -LiteralPath $target).FullName,
  $content,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "CSS atualizado:" -ForegroundColor Green
Write-Host " - desktop left: 71.4%" -ForegroundColor White
Write-Host " - desktop top: 48.6%" -ForegroundColor White
Write-Host " - desktop width: mantida (R6)" -ForegroundColor White
Write-Host " - mobile: mantido como esta" -ForegroundColor White

Write-Host ""
Write-Host "Validando TypeScript..." -ForegroundColor Cyan
& npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
  Fail "TypeScript encontrou erro. NAO faca commit. Mande um print desta janela."
}
Write-Host "TypeScript OK." -ForegroundColor Green

Write-Host ""
Write-Host "Validando diff..." -ForegroundColor Cyan
& git diff --check
if ($LASTEXITCODE -ne 0) {
  Fail "git diff --check encontrou erro. NAO faca commit. Mande um print desta janela."
}
Write-Host "git diff --check OK." -ForegroundColor Green

Write-Host ""
Write-Host "V45.24.4 R7 concluida com sucesso." -ForegroundColor Green
Write-Host "Teste localmente em: http://localhost:3000/dashboard" -ForegroundColor Cyan
Write-Host ""
