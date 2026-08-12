$ErrorActionPreference = "Stop"

function Fail([string]$message) {
  throw $message
}

if (-not (Test-Path -LiteralPath "package.json")) {
  Fail "Execute este pacote na raiz do repositorio candinho-gestao."
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.24.3 - Home final, autoplay e Vitrine viva" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# 0. NORMALIZA SOMENTE OS ARQUIVOS DESTE PACOTE
#    Faz backup inclusive de staged/unstaged para evitar outro ciclo de bloqueio.
# ---------------------------------------------------------------------------

$trackedTargets = @(
  "src/app/(app)/dashboard/page.tsx",
  "src/components/company-operation-carousel-v45-14.tsx",
  "src/app/v45-24-company-home-final.css",
  "src/app/(app)/fitness/loading.tsx"
)

$assetTargets = @(
  "public/operation-banners/vitrine-desktop.webp",
  "public/operation-banners/vitrine-mobile.webp",
  "public/operation-banners/physique-desktop.webp",
  "public/operation-banners/physique-mobile.webp"
)

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = Join-Path (
  Split-Path -Parent (Get-Location)
) "BACKUP_V45_24_3_$stamp"

$needsBackup = $false

foreach ($path in ($trackedTargets + $assetTargets)) {
  $isDirty =
    (& git diff --name-only -- "$path") -contains $path

  $isStaged =
    (& git diff --cached --name-only -- "$path") -contains $path

  $isUntracked =
    (& git ls-files --others --exclude-standard -- "$path") -contains $path

  if ($isDirty -or $isStaged -or $isUntracked) {
    $needsBackup = $true

    if (Test-Path -LiteralPath $path) {
      $destination = Join-Path $backupRoot $path
      $destinationDir = Split-Path -Parent $destination

      New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
      Copy-Item -LiteralPath $path -Destination $destination -Force
    } else {
      New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
      Add-Content `
        -LiteralPath (Join-Path $backupRoot "ARQUIVOS_AUSENTES.txt") `
        -Value $path
    }
  }
}

if ($needsBackup) {
  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

  & git diff -- $trackedTargets |
    Out-File `
      -LiteralPath (Join-Path $backupRoot "worktree.patch") `
      -Encoding utf8

  & git diff --cached -- $trackedTargets |
    Out-File `
      -LiteralPath (Join-Path $backupRoot "staged.patch") `
      -Encoding utf8

  Write-Host "Backup das versoes locais criado em:" -ForegroundColor Yellow
  Write-Host " $backupRoot" -ForegroundColor Yellow
}

# Desfaz stage/worktree APENAS dos arquivos rastreados deste pacote.
foreach ($path in $trackedTargets) {
  & git ls-files --error-unmatch -- "$path" *> $null

  if ($LASTEXITCODE -eq 0) {
    & git restore --staged --worktree --source=HEAD -- "$path"

    if ($LASTEXITCODE -ne 0) {
      Fail "Nao consegui normalizar $path."
    }
  }
}

# Remove assets untracked antigos, porque o payload vai instalar os oficiais.
foreach ($path in $assetTargets) {
  & git ls-files --error-unmatch -- "$path" *> $null

  if ($LASTEXITCODE -ne 0 -and (Test-Path -LiteralPath $path)) {
    Remove-Item -LiteralPath $path -Force
  }
}

Write-Host "Estado local dos arquivos-alvo normalizado." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 1. INSTALA PAYLOAD COMPLETO DA HOME
# ---------------------------------------------------------------------------

$payload = "_v45_24_3_payload"

$files = @(
  @{
    source = "$payload/dashboard-page.tsx"
    target = "src/app/(app)/dashboard/page.tsx"
  },
  @{
    source = "$payload/company-operation-carousel-v45-14.tsx"
    target = "src/components/company-operation-carousel-v45-14.tsx"
  },
  @{
    source = "$payload/v45-24-company-home-final.css"
    target = "src/app/v45-24-company-home-final.css"
  }
)

foreach ($file in $files) {
  if (-not (Test-Path -LiteralPath $file.source)) {
    Fail "Payload ausente: $($file.source)"
  }

  Copy-Item `
    -LiteralPath $file.source `
    -Destination $file.target `
    -Force

  Write-Host "Atualizado: $($file.target)" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 2. BANNERS VITRINE + PHYSIQUE
# ---------------------------------------------------------------------------

$assetSource = "$payload/operation-banners"
$assetTarget = "public/operation-banners"

New-Item -ItemType Directory -Path $assetTarget -Force | Out-Null

foreach ($asset in @(
  "vitrine-desktop.webp",
  "vitrine-mobile.webp",
  "physique-desktop.webp",
  "physique-mobile.webp"
)) {
  $source = Join-Path $assetSource $asset
  $target = Join-Path $assetTarget $asset

  if (-not (Test-Path -LiteralPath $source)) {
    Fail "Banner ausente no payload: $asset"
  }

  Copy-Item -LiteralPath $source -Destination $target -Force
  Write-Host "Banner instalado: $asset" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 3. FITNESS: REMOVE A TELA DE LOADING EXCLUSIVA
# ---------------------------------------------------------------------------

$fitnessLoading = "src/app/(app)/fitness/loading.tsx"

if (Test-Path -LiteralPath $fitnessLoading) {
  Remove-Item -LiteralPath $fitnessLoading -Force
  Write-Host "Fitness: loading exclusivo removido." -ForegroundColor Green
}

Write-Host ""
Write-Host "Motivo do Fitness encontrado:" -ForegroundColor Cyan
Write-Host "Somente Fitness tinha loading.tsx com 'Carregando Fitness...'." -ForegroundColor White
Write-Host "As outras operacoes nao usam essa tela intermediaria." -ForegroundColor White

# ---------------------------------------------------------------------------
# 4. LIMPA CACHE E VALIDA
# ---------------------------------------------------------------------------

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
Write-Host "Arquivos alterados:" -ForegroundColor Cyan
& git status --short

Write-Host ""
Write-Host "V45.24.3 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.24.3 - finaliza home e navegacao das operacoes" -ForegroundColor White
Write-Host ""
Write-Host "Teste local: npm run dev -> http://localhost:3000/dashboard" -ForegroundColor Cyan
Write-Host ""
