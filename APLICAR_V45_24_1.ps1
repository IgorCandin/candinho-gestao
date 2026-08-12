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
  $full = [System.IO.Path]::GetFullPath($path)
  [System.IO.File]::WriteAllText(
    $full,
    $content.Replace("`r`n","`n"),
    (New-Object System.Text.UTF8Encoding($false))
  )
}

function Replace-Once(
  [string]$content,
  [string]$old,
  [string]$new,
  [string]$label
) {
  $contentN = $content.Replace("`r`n","`n")
  $oldN = $old.Replace("`r`n","`n")
  $newN = $new.Replace("`r`n","`n")

  $first = $contentN.IndexOf($oldN)
  if ($first -lt 0) {
    Fail "Nao encontrei o trecho esperado: $label"
  }

  $second = $contentN.IndexOf($oldN, $first + $oldN.Length)
  if ($second -ge 0) {
    Fail "Trecho duplicado; nao vou arriscar: $label"
  }

  return $contentN.Substring(0, $first) + $newN + $contentN.Substring($first + $oldN.Length)
}

if (-not (Test-Path -LiteralPath "package.json")) {
  Fail "Execute este pacote na raiz do repositorio candinho-gestao."
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.24.1 - Restaura Home + acabamento Comercial" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$targets = @(
  "src/app/(app)/dashboard/page.tsx",
  "src/components/app-shell.tsx",
  "src/app/globals.css",
  "src/app/v45-14-operation-streaming-home.css",
  "src/components/new-sale-form.tsx",
  "src/app/v45-15-commercial-flow.css"
)

$dirty = @(& git diff --name-only -- $targets)
$staged = @(& git diff --cached --name-only -- $targets)

if ($dirty.Count -gt 0 -or $staged.Count -gt 0) {
  Write-Host "Ha alteracoes locais nos arquivos que este hotfix precisa editar:" -ForegroundColor Yellow
  $dirty | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
  $staged | ForEach-Object { Write-Host " - $_ (staged)" -ForegroundColor Yellow }
  Fail "Nao vou sobrescrever trabalho local. Commit/push ou mande um print."
}

# ---------------------------------------------------------------------------
# 1. DESFAZ SOMENTE O CSS QUE ESTRAGOU A HOME NA V45.24
# ---------------------------------------------------------------------------

$globalsPath = "src/app/globals.css"
$globals = Read-Utf8 $globalsPath
$badImport = '@import "./v45-24-company-home-final.css";'

if ($globals.Contains($badImport)) {
  $globals = $globals.Replace("`n$badImport", "")
  $globals = $globals.Replace("$badImport`n", "")
  Write-Utf8 $globalsPath $globals
  Write-Host "CSS que encolheu a Home removido do carregamento." -ForegroundColor Green
} else {
  Write-Host "Import V45.24 ja nao esta ativo." -ForegroundColor DarkGray
}

$badCssPath = "src/app/v45-24-company-home-final.css"
if (Test-Path -LiteralPath $badCssPath) {
  Remove-Item -LiteralPath $badCssPath -Force
  Write-Host "Arquivo de layout V45.24 removido." -ForegroundColor DarkGray
}

$payloadDir = "_v45_24_payload"
if (Test-Path -LiteralPath $payloadDir) {
  Remove-Item -LiteralPath $payloadDir -Recurse -Force
  Write-Host "Payload antigo V45.24 removido." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 2. MANTEM APENAS O VISUAL DOS PLACEHOLDERS VITRINE/PHYSIQUE
#    sem alterar as proporcoes antigas do carrossel.
# ---------------------------------------------------------------------------

$homeCssPath = "src/app/v45-14-operation-streaming-home.css"
$homeCss = Read-Utf8 $homeCssPath
$placeholderMarker = "V45.24.1 · Placeholders sem mexer no carrossel"

if (-not $homeCss.Contains($placeholderMarker)) {
  $placeholderCss = @'

/* =========================================================
   V45.24.1 · Placeholders sem mexer no carrossel
   Mantem exatamente as proporcoes aprovadas da Home V45.14/V45.22.
   ========================================================= */

.company-operation-slide-v4514[data-placeholder="true"] {
  overflow: hidden;
  background:
    radial-gradient(
      circle at 76% 18%,
      rgba(var(--operation-rgb), .18),
      transparent 32%
    ),
    linear-gradient(
      145deg,
      rgba(var(--operation-rgb), .10),
      rgba(5,7,10,.98) 42%,
      #030407
    );
}

.company-operation-slide-v4514[data-placeholder="true"]::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: .48;
  background-image:
    linear-gradient(
      rgba(var(--operation-rgb), .055) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgba(var(--operation-rgb), .055) 1px,
      transparent 1px
    );
  background-size: 46px 46px;
  mask-image: linear-gradient(135deg, #000, transparent 72%);
}

.company-operation-placeholder-v4524 {
  position: absolute;
  z-index: 2;
  inset: 0;
  padding: clamp(26px, 4vw, 58px);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  color: #fff;
}

.company-operation-placeholder-icon-v4524 {
  width: clamp(54px, 5vw, 76px);
  height: clamp(54px, 5vw, 76px);
  margin-bottom: clamp(18px, 2vw, 28px);
  border: 1px solid rgba(var(--operation-rgb), .42);
  border-radius: 20px;
  display: grid;
  place-items: center;
  color: rgb(var(--operation-rgb));
  background: rgba(var(--operation-rgb), .08);
  box-shadow: 0 0 36px rgba(var(--operation-rgb), .07);
}

.company-operation-placeholder-icon-v4524 svg {
  width: 46%;
  height: 46%;
}

.company-operation-placeholder-v4524 > span {
  color: rgb(var(--operation-rgb));
  font-size: clamp(8px, .78vw, 11px);
  font-weight: 900;
  letter-spacing: .20em;
  text-transform: uppercase;
}

.company-operation-placeholder-v4524 strong {
  margin-top: 8px;
  font-size: clamp(38px, 5.2vw, 76px);
  line-height: .94;
  letter-spacing: -.055em;
  text-transform: uppercase;
}

.company-operation-placeholder-v4524 small {
  width: min(520px, 72%);
  margin-top: 14px;
  color: rgba(255,255,255,.58);
  font-size: clamp(10px, .92vw, 13px);
  line-height: 1.55;
}

@media (max-width: 820px) {
  .company-operation-placeholder-v4524 {
    padding: 28px 24px;
    justify-content: flex-end;
  }

  .company-operation-placeholder-icon-v4524 {
    width: 58px;
    height: 58px;
    margin-bottom: 18px;
    border-radius: 18px;
  }

  .company-operation-placeholder-v4524 strong {
    font-size: clamp(38px, 13vw, 58px);
  }

  .company-operation-placeholder-v4524 small {
    width: 100%;
    font-size: 10px;
  }
}
'@

  $homeCss = $homeCss.TrimEnd() + "`n" + $placeholderCss.TrimStart() + "`n"
  Write-Utf8 $homeCssPath $homeCss
  Write-Host "Vitrine/Physique mantidos sem alterar o layout aprovado." -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 3. DASHBOARD: volta ao cabecalho antigo e deixa SOMENTE SAIR embaixo
# ---------------------------------------------------------------------------

$dashboardPath = "src/app/(app)/dashboard/page.tsx"
$dashboard = Read-Utf8 $dashboardPath

$dashboard = $dashboard.Replace('import Link from "next/link";' + "`n", "")

$dashboard = $dashboard.Replace(
@'
import {
  Bot,
  LogOut,
  UserRound,
} from "lucide-react";
'@,
@'
import { LogOut } from "lucide-react";
'@
)

if (-not $dashboard.Contains("HOME · CANDINHO COMPANY")) {
  $dashboard = Replace-Once $dashboard @'
      <header className="company-home-heading-v4514">
        <h1>Olá, {access.name}.</h1>
        <p>Escolha a operação para continuar.</p>
      </header>
'@ @'
      <header className="company-home-heading-v4514">
        <span>HOME · CANDINHO COMPANY</span>
        <h1>Olá, {access.name}.</h1>
        <p>Escolha a operação para continuar.</p>
      </header>
'@ "restaurar cabecalho bonito"
}

$utilityStart = @'
      <div
        className="company-home-utility-row-v4514"
        aria-label="Acesso rápido"
      >
'@

$utilityEnd = @'
      </div>
    </section>
'@

$startIndex = $dashboard.IndexOf($utilityStart)
if ($startIndex -lt 0) {
  Fail "Nao encontrei o bloco inferior da Home."
}

$endIndex = $dashboard.IndexOf($utilityEnd, $startIndex)
if ($endIndex -lt 0) {
  Fail "Nao encontrei o fim do bloco inferior da Home."
}

$newUtility = @'
      <div
        className="company-home-utility-row-v4514"
        aria-label="Sessão"
      >
        <div className="company-home-utility-links-v4514">
          <form action="/auth/signout" method="post">
            <button
              className="company-home-utility-link-v4514"
              type="submit"
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </div>
'@

$dashboard =
  $dashboard.Substring(0, $startIndex) +
  $newUtility +
  $dashboard.Substring($endIndex + $utilityEnd.Length - "    </section>".Length)

$dashboard = $dashboard.Replace("    },    {", "    },`n    {")

Write-Utf8 $dashboardPath $dashboard
Write-Host "Home restaurada; Meu Dia/Perfil removidos; somente Sair ficou." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 4. CENTRAL: Meu Dia ja existe; adiciona Perfil la.
# ---------------------------------------------------------------------------

$appShellPath = "src/components/app-shell.tsx"
$appShell = Read-Utf8 $appShellPath

if (-not $appShell.Contains("  UserRound,")) {
  $appShell = $appShell.Replace("  UsersRound,`n", "  UserRound,`n  UsersRound,`n")
}

if (-not $appShell.Contains('{ href: "/configuracoes", label: "Perfil", icon: UserRound }')) {
  $appShell = Replace-Once $appShell @'
  { href: "/central/governanca", label: "Governança", icon: ShieldCheck },
];
'@ @'
  { href: "/central/governanca", label: "Governança", icon: ShieldCheck },
  { href: "/configuracoes", label: "Perfil", icon: UserRound },
];
'@ "Perfil dentro da Central"
}

Write-Utf8 $appShellPath $appShell
Write-Host "Central: Meu Dia preservado e Perfil adicionado ao menu." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 5. COMERCIAL: dois custos iguais + dropdown cortado
# ---------------------------------------------------------------------------

$salePath = "src/components/new-sale-form.tsx"
$sale = Read-Utf8 $salePath

if (-not $sale.Contains("lastPurchaseCostDiffers")) {
  $sale = Replace-Once $sale @'
              const row = rowFor(item.productId);
              const lastPurchaseCost = item.productId ? lastPurchaseCosts[item.productId] : undefined;
              const productFlavors = flavorsFor(
'@ @'
              const row = rowFor(item.productId);
              const lastPurchaseCost = item.productId
                ? lastPurchaseCosts[item.productId]
                : undefined;
              const lastPurchaseCostDiffers =
                Boolean(
                  row &&
                    lastPurchaseCost?.cost != null &&
                    Math.abs(
                      Number(lastPurchaseCost.cost) -
                        Number(row.cost_price),
                    ) >= 0.01,
                );
              const productFlavors = flavorsFor(
'@ "comparacao do ultimo custo"

  $sale = Replace-Once $sale @'
                      </span>                      <span className="v4521-last-cost-chip">
                        Último custo{" "}
                        <strong>
                          {lastPurchaseCost?.cost
                            ? formatCurrency(
                                lastPurchaseCost.cost,
                              )
                            : "Sem histórico"}
                        </strong>
                        {lastPurchaseCost?.purchasedOn && (
                          <small>
                            {new Intl.DateTimeFormat(
                              "pt-BR",
                            ).format(
                              new Date(
                                `${lastPurchaseCost.purchasedOn}T12:00:00`,
                              ),
                            )}
                          </small>
                        )}
                      </span>
                      <span>
                        Preço padrão{" "}
'@ @'
                      </span>
                      {lastPurchaseCostDiffers && (
                        <span className="v4521-last-cost-chip">
                          Última compra{" "}
                          <strong>
                            {formatCurrency(
                              Number(lastPurchaseCost?.cost ?? 0),
                            )}
                          </strong>
                          {lastPurchaseCost?.purchasedOn && (
                            <small>
                              {new Intl.DateTimeFormat(
                                "pt-BR",
                              ).format(
                                new Date(
                                  `${lastPurchaseCost.purchasedOn}T12:00:00`,
                                ),
                              )}
                            </small>
                          )}
                        </span>
                      )}
                      <span>
                        Preço padrão{" "}
'@ "tirar custo duplicado"
}

Write-Utf8 $salePath $sale

$commercialCssPath = "src/app/v45-15-commercial-flow.css"
$commercialCss = Read-Utf8 $commercialCssPath
$commercialMarker = "V45.24.1 · Dropdown produto sem recorte"

if (-not $commercialCss.Contains($commercialMarker)) {
  $commercialPatch = @'

/* =========================================================
   V45.24.1 · Dropdown produto sem recorte
   ========================================================= */

.v4515-budget-flow .new-sale-main,
.v4515-budget-flow .new-sale-main > article.panel,
.v4515-budget-flow .new-sale-main > article.panel > .panel-body,
.v4515-budget-flow .sale-form-items,
.v4515-budget-flow .sale-form-item,
.v4515-budget-flow .sale-form-item-grid,
.v4515-budget-flow .sale-product-field {
  overflow: visible !important;
}

.v4515-budget-flow .sale-form-item {
  position: relative;
}

.v4515-budget-flow .sale-product-combobox-v45234 {
  position: relative;
  z-index: 140;
}

.v4515-budget-flow .sale-product-combobox-menu-v45234 {
  z-index: 2600 !important;
  max-height: min(420px, 58dvh);
  overscroll-behavior: contain;
}
'@

  $commercialCss =
    $commercialCss.TrimEnd() +
    "`n" +
    $commercialPatch.TrimStart() +
    "`n"

  Write-Utf8 $commercialCssPath $commercialCss
}

Write-Host "Comercial: custo sem duplicidade e busca sem recorte." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 6. VALIDACOES
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
Write-Host "V45.24.1 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.24.1 - restaura home e fecha pente fino" -ForegroundColor White
Write-Host ""
