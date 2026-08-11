$ErrorActionPreference = "Stop"

function Fail([string]$message) {
  throw $message
}

function Read-Utf8([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) {
    Fail "Arquivo nao encontrado: $path"
  }

  $resolved = (Get-Item -LiteralPath $path).FullName
  return [System.IO.File]::ReadAllText(
    $resolved,
    [System.Text.Encoding]::UTF8
  ).Replace("`r`n","`n")
}

function Write-Utf8([string]$path, [string]$content) {
  $normalized = $content.Replace("`r`n","`n")
  $fullPath = [System.IO.Path]::GetFullPath($path)
  $parent = Split-Path -Parent $fullPath

  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  [System.IO.File]::WriteAllText(
    $fullPath,
    $normalized,
    (New-Object System.Text.UTF8Encoding($false))
  )
}

if (-not (Test-Path -LiteralPath "package.json")) {
  Fail "Execute este pacote na raiz do repositorio candinho-gestao."
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.23.3 - Menu mobile padronizado" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$cssTarget = "src/app/v45-23-3-mobile-shell-standard.css"
$cssPayload = Join-Path $PSScriptRoot "_v45_23_3_payload\v45-23-3-mobile-shell-standard.css"

if (-not (Test-Path -LiteralPath $cssPayload)) {
  Fail "Payload CSS nao encontrado."
}

Copy-Item -LiteralPath $cssPayload -Destination $cssTarget -Force
Write-Host "Criado: $cssTarget" -ForegroundColor Green

$globalsPath = "src/app/globals.css"
$globals = Read-Utf8 $globalsPath
$import = '@import "./v45-23-3-mobile-shell-standard.css";'

if (-not $globals.Contains($import)) {
  $globals = $globals.TrimEnd() + "`n" + $import + "`n"
  Write-Utf8 $globalsPath $globals
  Write-Host "Import V45.23.3 adicionado ao globals.css." -ForegroundColor Green
} else {
  Write-Host "Import V45.23.3 ja existe." -ForegroundColor DarkGray
}

if (Test-Path -LiteralPath ".next") {
  Remove-Item -LiteralPath ".next" -Recurse -Force
  Write-Host "Cache .next removido." -ForegroundColor DarkGray
}

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
  Fail "git diff --check encontrou erro. NAO faca commit."
}
Write-Host "git diff --check OK." -ForegroundColor Green

Write-Host ""
Write-Host "V45.23.3 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.23.3 - padroniza menu mobile e logo da Bank" -ForegroundColor White
Write-Host ""
