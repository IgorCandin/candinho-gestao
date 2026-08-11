$ErrorActionPreference = "Stop"

function Fail([string]$message) { throw $message }
function Read-Utf8([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { Fail "Arquivo nao encontrado: $path" }
  $resolved = (Get-Item -LiteralPath $path).FullName
  return [System.IO.File]::ReadAllText($resolved,[System.Text.Encoding]::UTF8).Replace("`r`n","`n")
}
function Write-Utf8([string]$path,[string]$content) {
  $fullPath=[System.IO.Path]::GetFullPath($path)
  [System.IO.File]::WriteAllText($fullPath,$content.Replace("`r`n","`n"),(New-Object System.Text.UTF8Encoding($false)))
}
if (-not (Test-Path -LiteralPath "package.json")) { Fail "Execute este pacote na raiz do repositorio candinho-gestao." }

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.23.1 - Respiro do menu mobile (corrigido)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$gatewayPath="src/components/operation-entry-gateway-v45-22.tsx"
$gateway=Read-Utf8 $gatewayPath
if ($gateway.Contains('className="v4523-entry-back"')) {
  $pattern='(?s)\n\s*<Link\s+href="/dashboard"\s+className="v4523-entry-back"\s+aria-label="Voltar para as operações"\s*>\s*<ArrowLeft\s+size=\{16\}\s*/>\s*<span>Operações</span>\s*</Link>\s*\n'
  $updated=[regex]::Replace($gateway,$pattern,"`n",1)
  if ($updated -eq $gateway) { Fail "Encontrei o botao Operacoes, mas nao consegui remove-lo com seguranca." }
  $gateway=$updated
  $gateway=[regex]::Replace($gateway,'(?m)^\s*ArrowLeft,\s*\n','',1)
  Write-Utf8 $gatewayPath $gateway
  Write-Host "Botao Operacoes removido; a logo segue como retorno ao seletor." -ForegroundColor Green
} else {
  Write-Host "Botao Operacoes ja removido." -ForegroundColor DarkGray
}

$cssPath="src/app/v45-23-mobile-operation-and-overlays.css"
$css=Read-Utf8 $cssPath
$marker="V45.23.1 · Respiro visual do gateway mobile"
if (-not $css.Contains($marker)) {
$patch=@'

/* =========================================================
   V45.23.1 · Respiro visual do gateway mobile
   ========================================================= */

@media (max-width: 820px) {
  .v4522-operation-entry .v4521-entry-center {
    padding-top: clamp(42px, 6.5dvh, 62px);
    padding-bottom: 8px;
    gap: 9px;
  }
  .v4522-operation-entry .v4521-entry-logo-wrap {
    width: min(352px, 88vw);
    height: clamp(224px, 30dvh, 278px);
  }
  .v4522-operation-entry .v4521-entry-logo {
    width: min(238px, 58vw);
    max-height: 108px;
  }
  .v4522-operation-entry .v4521-entry-orbit {
    width: clamp(286px, 76vw, 326px);
    max-width: none;
  }
  .v4522-operation-entry .v4521-entry-orbit::after { inset: 28px; }
  .v4522-operation-entry .v4521-entry-center p { margin-top: 2px; }
  .v4522-operation-entry .v4521-entry-menu {
    flex: 0 1 auto;
    margin-top: clamp(20px, 3.3dvh, 34px);
    padding-top: 0;
    padding-bottom: max(8px, env(safe-area-inset-bottom));
    align-content: start;
  }
}

@media (max-width: 820px) and (max-height: 760px) {
  .v4522-operation-entry .v4521-entry-center {
    padding-top: 28px;
    padding-bottom: 4px;
    gap: 6px;
  }
  .v4522-operation-entry .v4521-entry-logo-wrap { height: 180px; }
  .v4522-operation-entry .v4521-entry-logo {
    width: min(218px, 55vw);
    max-height: 94px;
  }
  .v4522-operation-entry .v4521-entry-orbit {
    width: clamp(244px, 68vw, 286px);
  }
  .v4522-operation-entry .v4521-entry-menu {
    flex: 1 1 auto;
    margin-top: 12px;
  }
}
'@
  $css=$css.TrimEnd()+"`n"+$patch.TrimStart()+"`n"
  Write-Utf8 $cssPath $css
  Write-Host "Orbita ampliada e botoes deslocados para baixo." -ForegroundColor Green
} else {
  Write-Host "Ajuste visual V45.23.1 ja aplicado." -ForegroundColor DarkGray
}

if (Test-Path -LiteralPath ".next") { Remove-Item -LiteralPath ".next" -Recurse -Force }
Write-Host ""
Write-Host "Validando TypeScript..." -ForegroundColor Cyan
& npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Fail "TypeScript encontrou erro. NAO faca commit." }
Write-Host "TypeScript OK." -ForegroundColor Green
Write-Host "Validando diff..." -ForegroundColor Cyan
& git diff --check
if ($LASTEXITCODE -ne 0) { Fail "git diff --check encontrou erro. NAO faca commit." }
Write-Host "git diff --check OK." -ForegroundColor Green
Write-Host "V45.23.1 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido: V45.23.1 - ajusta respiro do menu mobile"
