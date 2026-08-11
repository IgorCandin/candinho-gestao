$ErrorActionPreference = "Stop"

function Fail([string]$message) { throw $message }
function Read-Utf8([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { Fail "Arquivo nao encontrado: $path" }
  $resolved=(Get-Item -LiteralPath $path).FullName
  return [System.IO.File]::ReadAllText($resolved,[System.Text.Encoding]::UTF8).Replace("`r`n","`n")
}
function Write-Utf8([string]$path,[string]$content) {
  $fullPath=[System.IO.Path]::GetFullPath($path)
  [System.IO.File]::WriteAllText($fullPath,$content.Replace("`r`n","`n"),(New-Object System.Text.UTF8Encoding($false)))
}

if (-not (Test-Path -LiteralPath "package.json")) {
  Fail "Execute este pacote na raiz do repositorio candinho-gestao."
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.23.2 - Logo limpa e maior no gateway" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$cssPath="src/app/v45-23-mobile-operation-and-overlays.css"
$css=Read-Utf8 $cssPath
$marker="V45.23.2 · Logo limpa e escala desktop"

if (-not $css.Contains($marker)) {
$patch=@'

/* =========================================================
   V45.23.2 · Logo limpa e escala desktop
   ========================================================= */

/*
 * Mobile: escondemos visualmente o kicker e o slogan sem alterar
 * a caixa ocupada por eles. Assim o layout que ficou aprovado no
 * telefone preserva exatamente o mesmo ritmo e posição.
 */
@media (max-width: 820px) {
  .v4522-operation-entry .v4521-entry-kicker,
  .v4522-operation-entry .v4521-entry-center > p {
    visibility: hidden !important;
    pointer-events: none !important;
    user-select: none !important;
  }
}

/*
 * Desktop: as frases saem do fluxo e a marca/círculo ganham presença.
 * A escala usa também a altura da viewport para não voltar a cortar
 * em monitores mais baixos.
 */
@media (min-width: 821px) {
  .v4522-operation-entry .v4521-entry-kicker,
  .v4522-operation-entry .v4521-entry-center > p {
    display: none !important;
  }

  .v4522-operation-entry .v4521-entry-center {
    gap: 0 !important;
    transform: none !important;
  }

  .v4522-operation-entry .v4521-entry-logo-wrap {
    width: min(560px, 46vw) !important;
    height: clamp(280px, 50dvh, 400px) !important;
  }

  .v4522-operation-entry .v4521-entry-logo {
    width: clamp(285px, 42dvh, 360px) !important;
    max-width: 72vw !important;
    max-height: 170px !important;
  }

  .v4522-operation-entry .v4521-entry-orbit {
    width: clamp(360px, 58dvh, 455px) !important;
    max-width: 46vw !important;
  }
}

@media (min-width: 821px) and (max-height: 580px) {
  .v4522-operation-entry .v4521-entry-logo-wrap {
    height: 250px !important;
  }

  .v4522-operation-entry .v4521-entry-logo {
    width: 260px !important;
  }

  .v4522-operation-entry .v4521-entry-orbit {
    width: 325px !important;
  }
}
'@
  $css=$css.TrimEnd()+"`n"+$patch.TrimStart()+"`n"
  Write-Utf8 $cssPath $css
  Write-Host "Frases removidas visualmente e escala desktop ampliada." -ForegroundColor Green
} else {
  Write-Host "Ajuste V45.23.2 ja aplicado." -ForegroundColor DarkGray
}

if (Test-Path -LiteralPath ".next") {
  Remove-Item -LiteralPath ".next" -Recurse -Force
  Write-Host "Cache .next removido." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Validando TypeScript..." -ForegroundColor Cyan
& npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Fail "TypeScript encontrou erro. NAO faca commit." }
Write-Host "TypeScript OK." -ForegroundColor Green

Write-Host "Validando diff..." -ForegroundColor Cyan
& git diff --check
if ($LASTEXITCODE -ne 0) { Fail "git diff --check encontrou erro. NAO faca commit." }
Write-Host "git diff --check OK." -ForegroundColor Green

Write-Host ""
Write-Host "V45.23.2 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.23.2 - limpa e amplia logo dos gateways" -ForegroundColor White
Write-Host ""
