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
Write-Host " V45.24.4 R3 - Aumenta moeda da Vitrine" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = Join-Path (
  Split-Path -Parent (Get-Location)
) "BACKUP_V45_24_4_R3_$stamp"

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

$content = Replace-Strict `
  $content `
  'width: clamp(108px, 9.8vw, 168px);' `
  'width: clamp(132px, 11.6vw, 198px);' `
  'largura desktop da moeda'

$content = Replace-Strict `
  $content `
  'width: clamp(108px, 31vw, 146px);' `
  'width: clamp(132px, 36vw, 176px);' `
  'largura mobile da moeda'

$content = $content.TrimEnd("`r","`n"," ","`t") + "`n"

[System.IO.File]::WriteAllText(
  (Get-Item -LiteralPath $target).FullName,
  $content,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "CSS atualizado:" -ForegroundColor Green
Write-Host " - desktop: clamp(132px, 11.6vw, 198px)" -ForegroundColor White
Write-Host " - mobile: clamp(132px, 36vw, 176px)" -ForegroundColor White

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
Write-Host "V45.24.4 R3 concluida com sucesso." -ForegroundColor Green
Write-Host "Teste localmente em: http://localhost:3000/dashboard" -ForegroundColor Cyan
Write-Host ""
