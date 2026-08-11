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
Write-Host " V45.22.1 - Viewport + ficha de produto (corrigido)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# 1. Gateways das operacoes: caber 100% na altura util do navegador
# ---------------------------------------------------------------------------

$cssPath = "src/app/v45-22-central-global.css"
$css = Read-Utf8 $cssPath
$viewportMarker = "V45.22.1 · Menu de operacoes 100% na viewport"

if (-not $css.Contains($viewportMarker)) {
  $viewportPatch = @'

/* =========================================================
   V45.22.1 · Menu de operacoes 100% na viewport
   ========================================================= */

.supplements-entry-standalone {
  height: 100dvh;
  min-height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
}

.v4522-operation-entry {
  height: 100dvh;
  min-height: 100dvh;
  max-height: 100dvh;
  box-sizing: border-box;
  overflow: hidden;
}

.v4522-operation-entry .v4521-entry-center,
.v4522-operation-entry .v4521-entry-menu {
  min-height: 0;
}

@media (min-width: 821px) and (max-height: 760px) {
  .v4522-operation-entry .v4521-entry-center {
    gap: 9px;
    transform: translateY(1.5dvh);
  }

  .v4522-operation-entry .v4521-entry-logo-wrap {
    width: min(400px, 36vw);
    height: 180px;
  }

  .v4522-operation-entry .v4521-entry-logo {
    width: min(295px, 28vw);
  }

  .v4522-operation-entry .v4521-entry-orbit {
    width: min(345px, 57dvh);
  }

  .v4522-operation-entry .v4521-entry-center p {
    font-size: 9px;
    letter-spacing: .12em;
  }

  .v4522-operation-entry .v4521-entry-menu {
    padding-bottom: 17px;
  }

  .v4522-operation-entry .v4521-entry-menu button {
    min-height: 68px;
    padding: 9px 11px;
  }

  .v4522-operation-entry .v4521-entry-line {
    bottom: 7px;
  }
}

@media (min-width: 821px) and (max-height: 660px) {
  .v4522-operation-entry .v4521-entry-center {
    gap: 5px;
    transform: translateY(1dvh);
  }

  .v4522-operation-entry .v4521-entry-kicker {
    font-size: 8px;
  }

  .v4522-operation-entry .v4521-entry-logo-wrap {
    width: min(350px, 33vw);
    height: 148px;
  }

  .v4522-operation-entry .v4521-entry-logo {
    width: min(255px, 25vw);
  }

  .v4522-operation-entry .v4521-entry-orbit {
    width: min(310px, 52dvh);
  }

  .v4522-operation-entry .v4521-entry-center p {
    font-size: 8px;
  }

  .v4522-operation-entry .v4521-entry-menu {
    padding-bottom: 10px;
  }

  .v4522-operation-entry .v4521-entry-menu button {
    min-height: 58px;
    gap: 7px;
    padding: 7px 9px;
  }

  .v4522-operation-entry .v4521-entry-menu button > svg {
    width: 17px;
    height: 17px;
  }

  .v4522-operation-entry .v4521-entry-menu strong {
    font-size: 9px;
  }

  .v4522-operation-entry .v4521-entry-menu small {
    font-size: 7px;
  }

  .v4522-operation-entry .v4521-entry-line {
    bottom: 4px;
  }
}
'@
  $css = $css.TrimEnd() + "`n" + $viewportPatch.TrimStart() + "`n"
  Write-Utf8 $cssPath $css
  Write-Host "Viewport dos menus ajustado." -ForegroundColor Green
} else {
  Write-Host "Viewport dos menus ja ajustado; retomando da etapa seguinte." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 2. Ficha de produto: foto no topo e blocos empilhados
# ---------------------------------------------------------------------------

$productPath = "src/app/(app)/produtos/[id]/page.tsx"
$product = Read-Utf8 $productPath
$productMarker = "product-detail-stack-v45221"

if (-not $product.Contains($productMarker)) {
  $oldStart = '      <section className="product-details-layout">'
  $nextHistory = '      <article className="panel product-history-panel">'

  $startIndex = $product.IndexOf($oldStart)
  if ($startIndex -lt 0) {
    Fail "Nao encontrei o layout antigo de duas colunas na ficha de produto."
  }

  $historyIndex = $product.IndexOf($nextHistory, $startIndex)
  if ($historyIndex -lt 0) {
    Fail "Nao encontrei o inicio do historico depois do layout da ficha."
  }

  $product = $product.Substring(0, $startIndex) + $product.Substring($historyIndex)

  $swipeAnchor = '      <EntitySwipeNavigator previous={swipe.previous} next={swipe.next} />'
  $swipeIndex = $product.IndexOf($swipeAnchor)
  if ($swipeIndex -lt 0) {
    Fail "Nao encontrei o ponto de insercao depois do navegador de produtos."
  }

  $insertIndex = $swipeIndex + $swipeAnchor.Length

  $overview = @'

      <section className="product-detail-stack-v45221">
        <article className="panel product-photo-top-v45221">
          <div className="panel-head">
            <div>
              <h2>Foto do produto</h2>
              <p>
                Imagem principal em destaque. As informações seguem abaixo
                em blocos de largura total.
              </p>
            </div>
          </div>

          <div className="panel-body product-photo-body-v45221">
            <ProductImageUploader
              productId={product.id}
              initialImageUrl={product.image_url}
              initialThumbnailUrl={product.thumbnail_url}
            />
          </div>
        </article>

        <article className="panel product-summary-full-v45221">
          <div className="panel-head">
            <div>
              <h2>Resumo comercial</h2>
              <p>Informações rápidas para consulta durante o atendimento.</p>
            </div>
            <span className={`badge ${product.active ? "green" : "gray"}`}>
              <span className="dot" />
              {product.active ? "Ativo" : "Inativo"}
            </span>
          </div>

          <div className="panel-body">
            <div className="product-price-grid">
              <div className="product-price-card">
                <CircleDollarSign size={18} />
                <span>
                  {activePromotion ? "Preço promocional" : "Preço à vista"}
                </span>
                <strong>
                  {formatCurrency(
                    activePromotion?.effective_promotional_price ??
                      product.sale_price,
                  )}
                </strong>
                {activePromotion && (
                  <small>De {formatCurrency(product.sale_price)}</small>
                )}
              </div>

              <div className="product-price-card">
                <CalendarDays size={18} />
                <span>Preço a prazo</span>
                <strong>{formatCurrency(product.installment_price)}</strong>
              </div>
            </div>

            <div className="product-detail-grid">
              <DetailItem label="Categoria" value={product.category} />
              <DetailItem label="Marca" value={product.brand} />
              <DetailItem label="Nível" value={product.level} />
              <DetailItem
                label="Categoria de vendas"
                value={product.sales_category}
              />
              <DetailItem
                label="Duração"
                value={
                  product.duration_days
                    ? `${product.duration_days} dias/doses`
                    : null
                }
              />
              {flavorEnabled && (
                <DetailItem
                  label="Sabores ativos"
                  value={flavorRows.length}
                />
              )}
            </div>
          </div>
        </article>

        {(product.description ||
          product.objective ||
          product.ideal_profile ||
          product.information ||
          product.quick_message) && (
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Características</h2>
                <p>Argumentos e orientações para apresentar o produto.</p>
              </div>
              <BadgeInfo size={19} />
            </div>

            <div className="panel-body product-copy-list">
              <CopyItem label="Descrição" value={product.description} />
              <CopyItem label="Objetivo" value={product.objective} />
              <CopyItem label="Perfil ideal" value={product.ideal_profile} />
              <CopyItem label="Informativo" value={product.information} />
              <CopyItem
                label="Mensagem rápida"
                value={product.quick_message}
              />
            </div>
          </article>
        )}

        {product.keywords && (
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Palavras-chave</h2>
                <p>Facilitam a consulta e o atendimento.</p>
              </div>
              <Tags size={19} />
            </div>

            <div className="panel-body">
              <div className="keyword-list">
                {product.keywords.split(",").map((keyword) => (
                  <span key={keyword.trim()}>
                    <CheckCircle2 size={14} />
                    {keyword.trim()}
                  </span>
                ))}
              </div>
            </div>
          </article>
        )}
      </section>
'@

  $product = $product.Substring(0, $insertIndex) + $overview + $product.Substring($insertIndex)
  Write-Utf8 $productPath $product
  Write-Host "Ficha de produto reorganizada em blocos empilhados." -ForegroundColor Green
} else {
  Write-Host "Ficha de produto ja reorganizada." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 3. CSS da ficha
# ---------------------------------------------------------------------------

$css = Read-Utf8 $cssPath
$productCssMarker = "V45.22.1 · Ficha de produto empilhada"

if (-not $css.Contains($productCssMarker)) {
  $productCss = @'

/* =========================================================
   V45.22.1 · Ficha de produto empilhada
   ========================================================= */

.product-detail-stack-v45221 {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  margin-top: 18px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.product-detail-stack-v45221 > * {
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.product-photo-top-v45221 {
  overflow: hidden;
}

.product-photo-body-v45221 {
  display: grid;
  place-items: center;
}

.product-photo-body-v45221 .product-image-grid {
  width: min(560px, 100%);
  max-width: 100%;
  grid-template-columns: minmax(0, 1fr) !important;
  margin-inline: auto;
}

.product-photo-body-v45221 .product-image-slot {
  width: 100%;
  max-width: 560px;
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(217, 164, 65, .12);
  border-radius: 22px;
  background:
    radial-gradient(circle at 50% 42%, rgba(217,164,65,.07), transparent 58%),
    rgba(255,255,255,.014);
}

.product-photo-body-v45221 .product-image-frame {
  width: min(430px, 100%);
  max-width: 100%;
  margin-inline: auto;
  aspect-ratio: 1;
  max-height: 430px;
  border-radius: 18px;
}

.product-photo-body-v45221 .product-image-frame img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.product-photo-body-v45221 .product-image-slot-footer {
  width: 100%;
  min-width: 0;
}

.product-summary-full-v45221 .product-price-grid,
.product-summary-full-v45221 .product-detail-grid {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

@media (max-width: 900px) {
  .product-photo-body-v45221 .product-image-slot {
    padding: 10px;
  }

  .product-photo-body-v45221 .product-image-frame {
    max-height: 360px;
  }
}
'@

  $css = $css.TrimEnd() + "`n" + $productCss.TrimStart() + "`n"
  Write-Utf8 $cssPath $css
  Write-Host "CSS da ficha de produto ajustado." -ForegroundColor Green
} else {
  Write-Host "CSS da ficha de produto ja ajustado." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 4. Cache e validacoes
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
Write-Host "V45.22.1 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.22.1 - ajusta viewport e ficha de produto" -ForegroundColor White
Write-Host ""
