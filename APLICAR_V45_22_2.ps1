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
Write-Host " V45.22.2 - Menus 100% na viewport" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# 1. Central: a barra de conhecimento nao pode consumir altura do gateway.
# ---------------------------------------------------------------------------

$centralNavPath = "src/components/central-knowledge-nav.tsx"
$centralNav = Read-Utf8 $centralNavPath

$oldGuard = '  if (!pathname.startsWith("/central")) return null;'
$newGuard = @'
  if (
    !pathname.startsWith("/central") ||
    pathname === "/central/inicio"
  ) {
    return null;
  }
'@

if ($centralNav.Contains('pathname === "/central/inicio"')) {
  Write-Host "Central /inicio ja esta sem barra superior." -ForegroundColor DarkGray
} elseif ($centralNav.Contains($oldGuard)) {
  $centralNav = $centralNav.Replace($oldGuard, $newGuard.TrimEnd())
  Write-Utf8 $centralNavPath $centralNav
  Write-Host "Central /inicio: barra superior removida do gateway." -ForegroundColor Green
} else {
  Fail "Nao encontrei a trava esperada em central-knowledge-nav.tsx."
}

# ---------------------------------------------------------------------------
# 2. Gateway: reforco de encaixe por altura real, sem cortar os cards.
# ---------------------------------------------------------------------------

$gatewayCssPath = "src/app/v45-22-central-global.css"
$gatewayCss = Read-Utf8 $gatewayCssPath
$gatewayMarker = "V45.22.2 · Gateway inteiro dentro da viewport"

if (-not $gatewayCss.Contains($gatewayMarker)) {
  $patch = @'

/* =========================================================
   V45.22.2 · Gateway inteiro dentro da viewport
   ========================================================= */

@media (min-width: 821px) {
  .supplements-entry-standalone {
    height: 100dvh;
    min-height: 100dvh;
    max-height: 100dvh;
    overflow: hidden;
  }

  .v4522-operation-entry {
    height: 100%;
    min-height: 0;
    max-height: 100%;
    grid-template-rows: minmax(0, 1fr) auto;
    overflow: hidden;
  }

  .v4522-operation-entry .v4521-entry-center {
    align-self: center;
    max-height: 100%;
  }

  .v4522-operation-entry .v4521-entry-menu {
    align-self: end;
    box-sizing: border-box;
    margin: 0 auto;
  }
}

@media (min-width: 821px) and (max-height: 720px) {
  .v4522-operation-entry .v4521-entry-center {
    gap: 5px;
    transform: translateY(0);
  }

  .v4522-operation-entry .v4521-entry-logo-wrap {
    width: min(330px, 31vw);
    height: 138px;
  }

  .v4522-operation-entry .v4521-entry-logo {
    width: min(245px, 24vw);
  }

  .v4522-operation-entry .v4521-entry-orbit {
    width: min(292px, 47dvh);
  }

  .v4522-operation-entry .v4521-entry-menu {
    width: min(1180px, calc(100vw - 44px));
    gap: 7px;
    padding-bottom: 9px;
  }

  .v4522-operation-entry .v4521-entry-menu button {
    min-height: 56px;
    padding: 7px 9px;
  }

  .v4522-operation-entry .v4521-entry-line {
    bottom: 3px;
  }
}

@media (min-width: 821px) and (max-height: 620px) {
  .v4522-operation-entry .v4521-entry-kicker,
  .v4522-operation-entry .v4521-entry-center p {
    display: none;
  }

  .v4522-operation-entry .v4521-entry-logo-wrap {
    height: 120px;
  }

  .v4522-operation-entry .v4521-entry-orbit {
    width: min(250px, 43dvh);
  }

  .v4522-operation-entry .v4521-entry-menu button {
    min-height: 52px;
  }
}
'@

  $gatewayCss = $gatewayCss.TrimEnd() + "`n" + $patch.TrimStart() + "`n"
  Write-Utf8 $gatewayCssPath $gatewayCss
  Write-Host "Gateway ajustado para ocupar somente a viewport real." -ForegroundColor Green
} else {
  Write-Host "Gateway V45.22.2 ja aplicado." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 3. Dashboard: card principal e acesso rapido precisam caber sem scroll.
# ---------------------------------------------------------------------------

$homeCssPath = "src/app/v45-14-operation-streaming-home.css"
$homeCss = Read-Utf8 $homeCssPath
$homeMarker = "V45.22.2 · Home de operacoes sem corte vertical"

if (-not $homeCss.Contains($homeMarker)) {
  $homePatch = @'

/* =========================================================
   V45.22.2 · Home de operacoes sem corte vertical
   ========================================================= */

@media (min-width: 821px) and (max-height: 860px) {
  .company-home-streaming-v4514 {
    height: 100dvh;
    min-height: 100dvh;
    max-height: 100dvh;
    box-sizing: border-box;
    padding: 8px 0 10px;
    overflow: hidden;
  }

  .company-home-brand-v4514 img {
    width: min(250px, 52vw);
    max-height: 54px;
  }

  .company-home-heading-v4514 {
    margin: 5px auto 7px;
  }

  .company-home-heading-v4514 > span {
    font-size: 7px;
  }

  .company-home-heading-v4514 h1 {
    margin-top: 4px;
    font-size: 19px;
  }

  .company-home-heading-v4514 p {
    margin-top: 3px;
    font-size: 9px;
  }

  .company-operation-track-v4514 {
    --slide-width: min(
      980px,
      72vw,
      calc(177.7dvh - 500px)
    );
    padding-top: 4px;
    padding-bottom: 7px;
  }

  .company-operation-pager-v4514 {
    width: var(--slide-width);
    min-height: 18px;
    margin-top: -3px;
  }

  .company-operation-progress-v4514 {
    width: var(--slide-width);
    margin-top: 2px;
  }

  .company-home-utility-row-v4514 {
    margin-top: 5px;
    gap: 4px;
  }

  .company-home-utility-title-v4514 {
    font-size: 7px;
  }

  .company-home-utility-link-v4514 {
    min-height: 32px;
    padding-inline: 11px;
    font-size: 9px;
  }
}

@media (min-width: 821px) and (max-height: 680px) {
  .company-home-streaming-v4514 {
    padding-top: 5px;
    padding-bottom: 6px;
  }

  .company-home-brand-v4514 img {
    width: min(220px, 48vw);
    max-height: 46px;
  }

  .company-home-heading-v4514 {
    margin: 3px auto 5px;
  }

  .company-home-heading-v4514 h1 {
    font-size: 17px;
  }

  .company-home-heading-v4514 p {
    font-size: 8px;
  }

  .company-operation-track-v4514 {
    --slide-width: min(
      820px,
      70vw,
      calc(177.7dvh - 475px)
    );
    padding-top: 2px;
    padding-bottom: 5px;
  }

  .company-home-utility-row-v4514 {
    margin-top: 3px;
  }

  .company-home-utility-link-v4514 {
    min-height: 29px;
    font-size: 8px;
  }
}
'@

  $homeCss = $homeCss.TrimEnd() + "`n" + $homePatch.TrimStart() + "`n"
  Write-Utf8 $homeCssPath $homeCss
  Write-Host "Dashboard ajustado para caber inteiro na altura disponivel." -ForegroundColor Green
} else {
  Write-Host "Dashboard V45.22.2 ja aplicado." -ForegroundColor DarkGray
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
Write-Host "V45.22.2 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.22.2 - corrige menus cortados na viewport" -ForegroundColor White
Write-Host ""
