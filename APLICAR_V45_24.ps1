$ErrorActionPreference = "Stop"

function Fail([string]$message) { throw $message }

function Read-Utf8([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) {
    Fail "Arquivo nao encontrado: $path"
  }
  $resolved = (Get-Item -LiteralPath $path).FullName
  return [System.IO.File]::ReadAllText(
    $resolved,
    [System.Text.Encoding]::UTF8
  ).Replace("`r`n", "`n")
}

function Write-Utf8([string]$path, [string]$content) {
  $full = [System.IO.Path]::GetFullPath($path)
  $parent = Split-Path -Parent $full
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  [System.IO.File]::WriteAllText(
    $full,
    $content.Replace("`r`n", "`n"),
    (New-Object System.Text.UTF8Encoding($false))
  )
}

function Replace-Once(
  [string]$content,
  [string]$old,
  [string]$new,
  [string]$label
) {
  $contentN = $content.Replace("`r`n", "`n")
  $oldN = $old.Replace("`r`n", "`n")
  $newN = $new.Replace("`r`n", "`n")
  $first = $contentN.IndexOf($oldN)
  if ($first -lt 0) { Fail "Nao encontrei o trecho esperado: $label" }
  $second = $contentN.IndexOf($oldN, $first + $oldN.Length)
  if ($second -ge 0) { Fail "Trecho duplicado; nao vou arriscar: $label" }
  return $contentN.Substring(0, $first) + $newN + $contentN.Substring($first + $oldN.Length)
}

if (-not (Test-Path -LiteralPath "package.json")) {
  Fail "Execute este pacote na raiz do repositorio candinho-gestao."
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.24 R2 - Home final + Comercial polido" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$targets = @(
  "src/app/(app)/dashboard/page.tsx",
  "src/components/company-operation-carousel-v45-14.tsx",
  "src/app/globals.css",
  "src/components/new-sale-form.tsx",
  "src/app/v45-15-commercial-flow.css"
)

$dirty = @(& git diff --name-only -- $targets)
$staged = @(& git diff --cached --name-only -- $targets)
if ($dirty.Count -gt 0 -or $staged.Count -gt 0) {
  Write-Host "Ha alteracoes locais nos arquivos da Home de Operacoes:" -ForegroundColor Yellow
  $dirty | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
  $staged | ForEach-Object { Write-Host " - $_ (staged)" -ForegroundColor Yellow }
  Fail "Nao vou sobrescrever trabalho local. Commit/push primeiro ou mande um print."
}

# ---------------------------------------------------------------------------
# 1. Carousel aceita cards sem imagem para Vitrine e Physique
# ---------------------------------------------------------------------------
$carouselPath = "src/components/company-operation-carousel-v45-14.tsx"
$carousel = Read-Utf8 $carouselPath

if (-not $carousel.Contains("placeholderTitle?: string")) {
  $carousel = Replace-Once $carousel @'
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
'@ @'
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Store,
} from "lucide-react";
'@ "imports do carousel"

  $carousel = Replace-Once $carousel @'
  desktopImage: string;
  mobileImage: string;
  tone: string;
  rgb: string;
'@ @'
  desktopImage?: string;
  mobileImage?: string;
  tone: string;
  rgb: string;
  placeholderTitle?: string;
  placeholderSubtitle?: string;
'@ "tipo de card sem imagem"

  $carousel = Replace-Once $carousel @'
            const style = {
              "--operation-rgb": operation.rgb,
              "--operation-image": `url("${operation.desktopImage}")`,
            } as CSSProperties;
'@ @'
            const style = {
              "--operation-rgb": operation.rgb,
              ...(operation.desktopImage
                ? {
                    "--operation-image": `url("${operation.desktopImage}")`,
                  }
                : {}),
            } as CSSProperties;

            const placeholder = !operation.desktopImage;
            const PlaceholderIcon =
              operation.key === "physique" ? Activity : Store;
'@ "style do placeholder"

  $carousel = Replace-Once $carousel @'
                data-desktop-fit={operation.desktopFit ?? "cover"}
                aria-label={`Abrir Candinho ${operation.label}`}
                style={style}
              >
                <picture>
                  <source
                    media="(max-width: 820px)"
                    srcSet={operation.mobileImage}
                  />
                  <img
                    src={operation.desktopImage}
                    alt={`Candinho ${operation.label}`}
                    loading={
                      operation.loopGroup === 1 ? "eager" : "lazy"
                    }
                    draggable={false}
                  />
                </picture>
'@ @'
                data-desktop-fit={operation.desktopFit ?? "cover"}
                data-placeholder={placeholder ? "true" : "false"}
                aria-label={`Abrir Candinho ${operation.label}`}
                style={style}
              >
                {placeholder ? (
                  <div className="company-operation-placeholder-v4524">
                    <div className="company-operation-placeholder-icon-v4524">
                      <PlaceholderIcon />
                    </div>
                    <span>Candinho Company</span>
                    <strong>
                      {operation.placeholderTitle ?? operation.label}
                    </strong>
                    <small>
                      {operation.placeholderSubtitle ??
                        "Acesso integrado à operação."}
                    </small>
                  </div>
                ) : (
                  <picture>
                    <source
                      media="(max-width: 820px)"
                      srcSet={operation.mobileImage ?? operation.desktopImage}
                    />
                    <img
                      src={operation.desktopImage}
                      alt={`Candinho ${operation.label}`}
                      loading={
                        operation.loopGroup === 1 ? "eager" : "lazy"
                      }
                      draggable={false}
                    />
                  </picture>
                )}
'@ "render do placeholder"

  Write-Utf8 $carouselPath $carousel
  Write-Host "Carousel preparado para cards sem imagem." -ForegroundColor Green
} else {
  Write-Host "Carousel ja aceita cards sem imagem." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 2. Dashboard: 6 destinos; Vitrine e Physique viram cards do seletor
# ---------------------------------------------------------------------------
$dashboardPath = "src/app/(app)/dashboard/page.tsx"
$dashboard = Read-Utf8 $dashboardPath

if (-not $dashboard.Contains('key: "vitrine"')) {
  $dashboard = $dashboard.Replace("  Activity,`n", "")
  $dashboard = $dashboard.Replace("  Store,`n", "")

  $centralBlock = @'
    {
      key: "central",
      label: "Central",
      href: "/central/inicio",
      desktopImage:
        "/operation-banners/central-desktop.webp",
      mobileImage:
        "/operation-banners/central-mobile.webp",
      tone: "central",
      rgb: "54, 161, 255",
      visible: centralVisible,
    },
'@

  $placeholderBlocks = @'
    {
      key: "vitrine",
      label: "Vitrine",
      href: "/catalogo",
      tone: "vitrine",
      rgb: "224, 174, 74",
      placeholderTitle: "Vitrine",
      placeholderSubtitle:
        "Catálogo e consulta rápida enquanto o banner oficial é preparado.",
      visible: access.canAccessSupplements,
    },
    {
      key: "physique",
      label: "Physique",
      href: "/physique",
      tone: "physique",
      rgb: "174, 112, 255",
      placeholderTitle: "Physique",
      placeholderSubtitle:
        "Atletas, evolução e gestão esportiva em um único espaço.",
      visible: access.canManageUsers,
    },
'@
  $newBlocks = $placeholderBlocks + $centralBlock

  $dashboard = Replace-Once $dashboard $centralBlock $newBlocks "Vitrine e Physique no seletor"

  $dashboard = Replace-Once $dashboard @'
      <header className="company-home-heading-v4514">
        <span>HOME · CANDINHO COMPANY</span>
        <h1>Olá, {access.name}.</h1>
        <p>Escolha a operação para continuar.</p>
      </header>
'@ @'
      <header className="company-home-heading-v4514">
        <h1>Olá, {access.name}.</h1>
        <p>Escolha a operação para continuar.</p>
      </header>
'@ "cabecalho compacto"

  $dashboard = Replace-Once $dashboard @'
          <Link
            className="company-home-utility-link-v4514"
            href="/catalogo"
          >
            <Store size={16} />
            <span>Vitrine</span>
          </Link>

          {access.canManageUsers && (
            <Link
              className="company-home-utility-link-v4514 physique"
              href="/physique"
            >
              <Activity size={16} />
              <span>Physique</span>
            </Link>
          )}

'@ "" "retirar Vitrine/Physique do acesso rapido"

  Write-Utf8 $dashboardPath $dashboard
  Write-Host "Vitrine e Physique adicionados como cards do seletor." -ForegroundColor Green
} else {
  Write-Host "Dashboard ja possui Vitrine e Physique no seletor." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 3. Comercial: custo sem duplicidade + busca de produto sem recorte
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
'@ "regra inteligente do ultimo custo"

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
'@ "remover custo duplicado"

  Write-Utf8 $salePath $sale
  Write-Host "Comercial: custo duplicado corrigido." -ForegroundColor Green
} else {
  Write-Host "Comercial: regra de custo ja corrigida." -ForegroundColor DarkGray
}

$commercialCssPath = "src/app/v45-15-commercial-flow.css"
$commercialCss = Read-Utf8 $commercialCssPath
$commercialMarker = "V45.24 R2 · Dropdown de produto livre de recorte"

if (-not $commercialCss.Contains($commercialMarker)) {
  $commercialPatch = @'

/* =========================================================
   V45.24 R2 · Dropdown de produto livre de recorte
   ========================================================= */

/*
 * O combobox da V45.23.4 era absoluto dentro do card do item.
 * Alguns containers antigos do Comercial recortavam o conteúdo
 * que ultrapassava a borda do item. Aqui só a tela de orçamento
 * recebe overflow visível; o restante do ERP não muda.
 */
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
  z-index: 1;
}

.v4515-budget-flow
  .sale-form-item:has(.sale-product-combobox-menu-v45234) {
  z-index: 120;
}

.v4515-budget-flow .sale-product-combobox-v45234 {
  z-index: 140;
}

.v4515-budget-flow .sale-product-combobox-menu-v45234 {
  z-index: 2600 !important;
  max-height: min(420px, 58dvh);
  overscroll-behavior: contain;
}

.v4515-budget-flow
  .sale-product-combobox-menu-v45234
  button {
  position: relative;
  z-index: 1;
}

/*
 * Quando custo cadastrado e última compra são iguais, mostramos
 * apenas Custo. "Última compra" só aparece quando existe uma
 * diferença real, evitando dois chips com o mesmo valor.
 */
.v4515-budget-flow .v4521-last-cost-chip {
  border-color: rgba(217, 166, 61, .20);
}

@media (max-width: 720px) {
  .v4515-budget-flow .sale-product-combobox-menu-v45234 {
    max-height: 58dvh;
  }
}
'@

  $commercialCss = $commercialCss.TrimEnd() + "`n" + $commercialPatch.TrimStart() + "`n"
  Write-Utf8 $commercialCssPath $commercialCss
  Write-Host "Comercial: dropdown de produtos sem recorte." -ForegroundColor Green
} else {
  Write-Host "Comercial: dropdown ja corrigido." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 4. CSS final e import
# ---------------------------------------------------------------------------
$payloadCss = "_v45_24_payload/v45-24-company-home-final.css"
$targetCss = "src/app/v45-24-company-home-final.css"
if (-not (Test-Path -LiteralPath $payloadCss)) {
  Fail "Payload CSS nao encontrado. Extraia o ZIP inteiro na raiz."
}
Copy-Item -LiteralPath $payloadCss -Destination $targetCss -Force
Write-Host "CSS final da Home de Operacoes instalado." -ForegroundColor Green

$globalsPath = "src/app/globals.css"
$globals = Read-Utf8 $globalsPath
if (-not $globals.Contains('@import "./v45-24-company-home-final.css";')) {
  $globals = $globals.TrimEnd() + "`n@import `"./v45-24-company-home-final.css`";`n"
  Write-Utf8 $globalsPath $globals
  Write-Host "CSS V45.24 importado." -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 5. Validacao
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
Write-Host "V45.24 R2 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.24 - finaliza home e corrige comercial" -ForegroundColor White
Write-Host ""
