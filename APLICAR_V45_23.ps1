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

function Replace-Exact(
  [string]$path,
  [string]$old,
  [string]$new,
  [string]$alreadyMarker = ""
) {
  $content = Read-Utf8 $path
  $oldN = $old.Replace("`r`n","`n")
  $newN = $new.Replace("`r`n","`n")

  if ($alreadyMarker -and $content.Contains($alreadyMarker)) {
    Write-Host "Ja aplicado: $path" -ForegroundColor DarkGray
    return
  }

  if (-not $content.Contains($oldN)) {
    Fail "Nao encontrei o bloco esperado em $path"
  }

  Write-Utf8 $path ($content.Replace($oldN, $newN))
  Write-Host "Atualizado: $path" -ForegroundColor Green
}

if (-not (Test-Path -LiteralPath "package.json")) {
  Fail "Execute este pacote na raiz do repositorio candinho-gestao."
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.23 - Mobile de operacoes + menus modais" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# 1. Arquivos novos
# ---------------------------------------------------------------------------

Copy-Item `
  -LiteralPath "$PSScriptRoot\dismissible-menu-guard.tsx" `
  -Destination "src/components/dismissible-menu-guard.tsx" `
  -Force

Copy-Item `
  -LiteralPath "$PSScriptRoot\v45-23-mobile-operation-and-overlays.css" `
  -Destination "src/app/v45-23-mobile-operation-and-overlays.css" `
  -Force

Write-Host "Arquivos V45.23 copiados." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 2. Gateway: botao mobile de voltar + primeiro modulo em destaque
# ---------------------------------------------------------------------------

$gateway = "src/components/operation-entry-gateway-v45-22.tsx"

Replace-Exact $gateway @'
import {
  BarChart3,
'@ @'
import {
  ArrowLeft,
  BarChart3,
'@ '  ArrowLeft,'

Replace-Exact $gateway @'
      <div className="v4521-entry-ambient" />

      <div className="v4521-entry-center">
'@ @'
      <div className="v4521-entry-ambient" />

      <Link
        href="/dashboard"
        className="v4523-entry-back"
        aria-label="Voltar para as operações"
      >
        <ArrowLeft size={16} />
        <span>Operações</span>
      </Link>

      <div className="v4521-entry-center">
'@ 'className="v4523-entry-back"'

Replace-Exact $gateway @'
            className={target === href ? "is-target" : ""}
'@ @'
            className={[
              target === href ? "is-target" : "",
              index === 0 ? "is-primary" : "",
            ]
              .filter(Boolean)
              .join(" ")}
'@ 'index === 0 ? "is-primary"'

# ---------------------------------------------------------------------------
# 3. Mobile deixa de pular o gateway
# ---------------------------------------------------------------------------

$suplementos = "src/app/(app)/suplementos/page.tsx"
$suplementosNew = @'
import { SupplementsEntryGatewayV4521 } from "@/components/supplements-entry-gateway-v45-21";

export default function SupplementsEntryPage() {
  return <SupplementsEntryGatewayV4521 />;
}
'@
Write-Utf8 $suplementos $suplementosNew
Write-Host "Suplementos mobile passa pelo gateway." -ForegroundColor Green

$fitness = "src/app/(app)/fitness/inicio/page.tsx"
$fitnessContent = Read-Utf8 $fitness
$fitnessContent = $fitnessContent.Replace(
  'import { isMobileOperationEntry } from "@/lib/operation-entry-device";' + "`n",
  ""
)
$fitnessContent = $fitnessContent.Replace(
@'
  if (await isMobileOperationEntry()) {
    redirect("/fitness");
  }

'@,
""
)
Write-Utf8 $fitness $fitnessContent
Write-Host "Fitness mobile passa pelo gateway." -ForegroundColor Green

$bank = "src/app/(app)/bank/inicio/page.tsx"
$bankContent = Read-Utf8 $bank
$bankContent = $bankContent.Replace(
  'import { isMobileOperationEntry } from "@/lib/operation-entry-device";' + "`n",
  ""
)
$bankContent = $bankContent.Replace(
@'
  if (await isMobileOperationEntry()) {
    redirect("/bank");
  }

'@,
""
)
Write-Utf8 $bank $bankContent
Write-Host "Bank mobile passa pelo gateway." -ForegroundColor Green

$central = "src/app/(app)/central/inicio/page.tsx"
$centralContent = Read-Utf8 $central
$centralContent = $centralContent.Replace(
  'import { isMobileOperationEntry } from "@/lib/operation-entry-device";' + "`n",
  ""
)
$centralContent = $centralContent.Replace(
@'
  if (await isMobileOperationEntry()) {
    redirect("/central");
  }

'@,
""
)
Write-Utf8 $central $centralContent
Write-Host "Central mobile passa pelo gateway." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 4. AppShell: backdrop que bloqueia click-through
# ---------------------------------------------------------------------------

$appShell = "src/components/app-shell.tsx"

Replace-Exact $appShell @'
        <details className="mobile-menu" ref={mobileMenuRef}>
'@ @'
        <details
          className="mobile-menu"
          ref={mobileMenuRef}
          data-dismissible-menu="true"
        >
'@ 'data-dismissible-menu="true"'

Replace-Exact $appShell @'
          </summary>

          <div className="mobile-menu-panel">
'@ @'
          </summary>

          <button
            className="mobile-menu-backdrop"
            type="button"
            aria-label="Fechar menu"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeMobileMenu();
            }}
          />

          <div className="mobile-menu-panel">
'@ 'className="mobile-menu-backdrop"'

# ---------------------------------------------------------------------------
# 5. Ferramentas desktop entra no mesmo contrato de dismiss
# ---------------------------------------------------------------------------

$nexusTools = "src/components/nexus-utility-bar.tsx"

Replace-Exact $nexusTools @'
      <details className="v4511-tools-details">
'@ @'
      <details
        className="v4511-tools-details"
        data-dismissible-menu="true"
      >
'@ 'className="v4511-tools-details"' + "`n" + '        data-dismissible-menu="true"'

# ---------------------------------------------------------------------------
# 6. Guard global no layout protegido
# ---------------------------------------------------------------------------

$layout = "src/app/(app)/layout.tsx"

Replace-Exact $layout @'
import { DesktopEscapeBack } from "@/components/desktop-escape-back";
'@ @'
import { DesktopEscapeBack } from "@/components/desktop-escape-back";
import { DismissibleMenuGuard } from "@/components/dismissible-menu-guard";
'@ 'DismissibleMenuGuard'

Replace-Exact $layout @'
      <V459UiFoundationMarker />
      <DesktopEscapeBack />
'@ @'
      <V459UiFoundationMarker />
      <DismissibleMenuGuard />
      <DesktopEscapeBack />
'@ '<DismissibleMenuGuard />'

# ---------------------------------------------------------------------------
# 7. CSS por ultimo para vencer os hotfixes historicos
# ---------------------------------------------------------------------------

$globals = "src/app/globals.css"
$globalsContent = Read-Utf8 $globals
$import = '@import "./v45-23-mobile-operation-and-overlays.css";'

if (-not $globalsContent.Contains($import)) {
  $globalsContent =
    $globalsContent.TrimEnd() +
    "`n" +
    $import +
    "`n"

  Write-Utf8 $globals $globalsContent
  Write-Host "CSS V45.23 importado por ultimo." -ForegroundColor Green
} else {
  Write-Host "CSS V45.23 ja importado." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 8. Cache + validacoes
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
Write-Host "V45.23 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.23 - mobile de operacoes e menus modais" -ForegroundColor White
Write-Host ""
