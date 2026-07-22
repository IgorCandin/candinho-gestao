$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $MyInvocation.MyCommand.Path

function Read-Normalized([string]$path) {
  if (-not (Test-Path $path)) { throw "Arquivo não encontrado: $path" }
  return [IO.File]::ReadAllText($path).Replace("`r`n", "`n")
}
function Write-Utf8([string]$path, [string]$text) {
  [IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}
function Replace-Exact([string]$path, [string]$old, [string]$new, [string]$label) {
  $text = Read-Normalized $path
  if (-not $text.Contains($old)) { throw "Não encontrei o trecho esperado para: $label. O pacote não alterou este arquivo." }
  $text = $text.Replace($old, $new)
  Write-Utf8 $path $text
  Write-Host "OK  $label"
}

Write-Host "Candinho Company - aplicando ajustes pós-V38 (sem commit automático)" -ForegroundColor Cyan

# 1) Navegação principal: menos módulos no menu, sem apagar rotas/funções.
$appShell = Join-Path $repo "src/components/app-shell.tsx"
$oldNav = @'
const supplementNav = [
  { href: "/suplementos", label: "Início", icon: Home },
  { href: "/suplementos/painel", label: "Painel Gerencial", icon: BarChart3 },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/vendas", label: "Comercial", icon: ShoppingBag },
  { href: "/produtos", label: "Produtos", icon: PackageSearch },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/clientes", label: "CRM", icon: ContactRound },
  { href: "/clientes/radar", label: "Radar", icon: Radar },
  { href: "/parceiros", label: "Parceiros", icon: Handshake },
  { href: "/movimentacoes", label: "Movimentações", icon: History },
];
'@
$newNav = @'
const supplementNav = [
  { href: "/suplementos", label: "Hoje", icon: Home },
  { href: "/vendas", label: "Comercial", icon: ShoppingBag },
  { href: "/clientes", label: "CRM e relacionamento", icon: ContactRound },
  { href: "/estoque", label: "Estoque e compras", icon: Boxes },
  { href: "/produtos", label: "Produtos", icon: PackageSearch },
  { href: "/parceiros", label: "Parceiros", icon: Handshake },
  { href: "/suplementos/painel", label: "Gestão", icon: BarChart3 },
];
'@
Replace-Exact $appShell $oldNav $newNav "navegação de Suplementos"
$appText = Read-Normalized $appShell
$appText = $appText.Replace("  Radar,`n", "")
Write-Utf8 $appShell $appText

# 2) Nexus de produto: usa a rota interna com fallback em vez da Edge Function direta que estava retornando 429.
$productForm = Join-Path $repo "src/components/product-form.tsx"
$oldHelper = @'
async function edgeErrorMessage(error: unknown) {
  const fallback =
    error instanceof Error
      ? error.message
      : "Não foi possível pesquisar o produto.";

  const context =
    error &&
    typeof error === "object" &&
    "context" in error
      ? (error as { context?: unknown }).context
      : null;

  if (context instanceof Response) {
    try {
      const payload = await context.clone().json();

      if (
        payload &&
        typeof payload.error === "string"
      ) {
        return payload.error;
      }
    } catch {
      // Mantém a mensagem padrão.
    }
  }

  return fallback;
}

'@
Replace-Exact $productForm $oldHelper "" "remoção do tratamento antigo da Edge Function"

$oldEnrich = @'
  async function enrichProduct() {
    setEnrichmentFeedback(null);
    setEnrichment(null);

    if (draft.name.trim().length < 3) {
      setEnrichmentFeedback(
        "Digite primeiro um nome de produto mais completo para o Nexus pesquisar.",
      );
      return;
    }

    setEnrichmentLoading(true);

    try {
      const { data, error } = await createClient().functions.invoke(
        "product-nexus-enrich",
        {
          body: {
            name: draft.name.trim(),
            existing: {
              brand: nullableText(draft.brand),
              category: nullableText(draft.category),
              description: nullableText(draft.description),
              objective: nullableText(draft.objective),
              ideal_profile: nullableText(draft.idealProfile),
              duration_days: draft.durationDays.trim()
                ? Number(draft.durationDays)
                : null,
              information: nullableText(draft.information),
              quick_message: nullableText(draft.quickMessage),
              keywords: nullableText(draft.keywords),
              level: nullableText(draft.level),
            },
            categories: categoryOptions,
          },
        },
      );

      if (error) {
        throw new Error(
          await edgeErrorMessage(error),
        );
      }

      if (data?.error) {
        throw new Error(String(data.error));
      }

      setEnrichment({
        suggestions: {
          brand: data?.suggestions?.brand ?? null,
          category: data?.suggestions?.category ?? null,
          description: data?.suggestions?.description ?? null,
          objective: data?.suggestions?.objective ?? null,
          ideal_profile: data?.suggestions?.ideal_profile ?? null,
          duration_days:
            Number(data?.suggestions?.duration_days) > 0
              ? Number(data.suggestions.duration_days)
              : null,
          information: data?.suggestions?.information ?? null,
          quick_message: data?.suggestions?.quick_message ?? null,
          keywords: data?.suggestions?.keywords ?? null,
          level: data?.suggestions?.level ?? null,
        },
        confidence:
          data?.confidence === "alta" ||
          data?.confidence === "media"
            ? data.confidence
            : "baixa",
        research_note:
          typeof data?.research_note === "string"
            ? data.research_note
            : null,
        sources: Array.isArray(data?.sources)
          ? data.sources.filter(
              (value: unknown): value is string =>
                typeof value === "string",
            )
          : [],
        saved: false,
      });

      setEnrichmentFeedback(
        "Pesquisa concluída. Revise o que o Nexus encontrou antes de aplicar.",
      );
    } catch (error) {
      setEnrichmentFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível pesquisar o produto.",
      );
    } finally {
      setEnrichmentLoading(false);
    }
  }
'@
$newEnrich = @'
  async function enrichProduct() {
    setEnrichmentFeedback(null);
    setEnrichment(null);

    if (draft.name.trim().length < 3) {
      setEnrichmentFeedback(
        "Digite primeiro um nome de produto mais completo para o Nexus pesquisar.",
      );
      return;
    }

    setEnrichmentLoading(true);

    try {
      const response = await fetch("/api/produtos/completar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          existing: {
            brand: nullableText(draft.brand),
            category: nullableText(draft.category),
            description: nullableText(draft.description),
            objective: nullableText(draft.objective),
            ideal_profile: nullableText(draft.idealProfile),
            duration_days: draft.durationDays.trim()
              ? Number(draft.durationDays)
              : null,
            information: nullableText(draft.information),
            quick_message: nullableText(draft.quickMessage),
            keywords: nullableText(draft.keywords),
            level: nullableText(draft.level),
          },
          categories: categoryOptions,
        }),
      });
      const data = await response.json();

      if (!response.ok || data?.error) {
        throw new Error(String(data?.error ?? `Pesquisa falhou (${response.status})`));
      }

      setEnrichment({
        suggestions: {
          brand: data?.suggestions?.brand ?? null,
          category: data?.suggestions?.category ?? null,
          description: data?.suggestions?.description ?? null,
          objective: data?.suggestions?.objective ?? null,
          ideal_profile: data?.suggestions?.ideal_profile ?? null,
          duration_days:
            Number(data?.suggestions?.duration_days) > 0
              ? Number(data.suggestions.duration_days)
              : null,
          information: data?.suggestions?.information ?? null,
          quick_message: data?.suggestions?.quick_message ?? null,
          keywords: data?.suggestions?.keywords ?? null,
          level: data?.suggestions?.level ?? null,
        },
        confidence:
          data?.confidence === "alta" || data?.confidence === "media"
            ? data.confidence
            : "baixa",
        research_note:
          typeof data?.research_note === "string" ? data.research_note : null,
        sources: Array.isArray(data?.sources)
          ? data.sources.filter((value: unknown): value is string => typeof value === "string")
          : [],
        saved: false,
      });

      setEnrichmentFeedback(
        data?.fallback_used
          ? "A pesquisa online ficou limitada, então o Nexus completou a análise sem web. Revise com atenção antes de aplicar."
          : "Pesquisa concluída. Revise o que o Nexus encontrou antes de aplicar.",
      );
    } catch (error) {
      setEnrichmentFeedback(
        error instanceof Error ? error.message : "Não foi possível pesquisar o produto.",
      );
    } finally {
      setEnrichmentLoading(false);
    }
  }
'@
Replace-Exact $productForm $oldEnrich $newEnrich "Nexus Completar informações com fallback"

$productText = Read-Normalized $productForm
$productText = $productText.Replace(
  "Pesquisa online para agilizar o cadastro. Preços, estoque, SKU, fornecedor e categoria ABC nunca são preenchidos.",
  "O Nexus pesquisa dados públicos do produto. Preços, estoque, fornecedor, SKU e ABC continuam sendo dados internos da Candinho e não são inventados pela pesquisa."
)
$productText = $productText.Replace(
  '<div className="sale-form-items">',
  '<div className="form-help"><strong>1. Cadastre os sabores.</strong> Informe somente os sabores reais do produto. A ativação só acontece quando você salvar o cadastro.</div>' + "`n" + '                <div className="sale-form-items">'
)
$productText = $productText.Replace(
  '<h3>Distribuição do estoque atual</h3>',
  '<h3>2. Distribuição do estoque atual</h3>'
)
$productText = $productText.Replace(
  '<td><strong className={valid ? "positive" : "warning-text"}>{allocated}</strong></td>',
  '<td><strong className={valid ? "positive" : "warning-text"}>{allocated}</strong><small>{valid ? "OK" : allocated < location.physicalQuantity ? `Faltam ${location.physicalQuantity - allocated}` : `Sobram ${allocated - location.physicalQuantity}`}</small></td>'
)
Write-Utf8 $productForm $productText
Write-Host "OK  clareza do fluxo de sabores"

# 3) Physique standalone: remove as rotas antigas que herdavam o menu do ERP.
$legacyPhysique = Join-Path $repo "src/app/(app)/physique"
if (Test-Path $legacyPhysique) {
  Remove-Item $legacyPhysique -Recurse -Force
  Write-Host "OK  rotas antigas da Physique removidas do grupo (app)"
}

# 4) Estilos aditivos do Physique operacional.
$cssPath = Join-Path $repo "src/app/physique.css"
$css = Read-Normalized $cssPath
$marker = "/* POS-V38 · Physique operacional */"
if (-not $css.Contains($marker)) {
  $extra = @'

/* POS-V38 · Physique operacional */
.physique-subpage-header { position: relative; }
.physique-subpage-header > .physique-action-button { width: fit-content; }
.physique-form { display: grid; gap: 16px; }
.physique-form-heading { display: flex; gap: 10px; align-items: flex-start; }
.physique-form-heading > svg { color: #8fe9cd; flex: 0 0 auto; }
.physique-form-heading strong { display: block; font-size: 13px; }
.physique-form-heading span { margin-top: 3px; display: block; color: rgba(232,239,247,.66); font-size: 10px; }
.physique-form-grid { display: grid; gap: 12px; }
.physique-form-grid.two { grid-template-columns: repeat(2,minmax(0,1fr)); }
.physique-form-grid.three { grid-template-columns: repeat(3,minmax(0,1fr)); }
.physique-form .field span { color: rgba(232,239,247,.72); }
.physique-form-message { margin: 0; padding: 10px 12px; border: 1px solid rgba(214,193,93,.22); border-radius: 10px; color: rgba(232,239,247,.78); font-size: 10px; }
.physique-nexus-preview { display: grid; gap: 14px; padding: 16px; border: 1px solid rgba(87,216,184,.20); border-radius: 14px; background: rgba(87,216,184,.04); }
.physique-nexus-preview-head { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border: 1px solid rgba(87,216,184,.18); border-radius: 12px; background: rgba(87,216,184,.04); }
.physique-nexus-preview-head > svg { color: #8fe9cd; flex: 0 0 auto; }
.physique-nexus-preview-head strong { display: block; font-size: 11px; }
.physique-nexus-preview-head span { margin-top: 3px; display: block; color: rgba(232,239,247,.68); font-size: 9px; line-height: 1.5; }
.physique-import-day-list { display: grid; gap: 7px; }
.physique-import-day-list article { padding: 10px 12px; border: 1px solid rgba(255,255,255,.07); border-radius: 10px; background: rgba(255,255,255,.015); }
.physique-import-day-list strong,.physique-import-day-list span,.physique-import-day-list small { display: block; }
.physique-import-day-list strong { font-size: 10px; }
.physique-import-day-list span,.physique-import-day-list small { margin-top: 3px; color: rgba(232,239,247,.62); font-size: 8px; }
.physique-photo-upload-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; }
.physique-assessment-list { display: grid; gap: 12px; }
.physique-assessment-card { padding: 16px; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; background: rgba(255,255,255,.012); }
.physique-assessment-card > header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.physique-assessment-card > header small,.physique-assessment-card > header strong { display: block; }
.physique-assessment-card > header small { color: #dcc46c; font-size: 8px; text-transform: uppercase; }
.physique-assessment-card > header strong { margin-top: 4px; font-size: 12px; }
.physique-measure-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 7px; }
.physique-measure-grid span { padding: 8px 10px; border-radius: 9px; background: rgba(255,255,255,.025); color: rgba(232,239,247,.58); font-size: 8px; }
.physique-measure-grid b { margin-top: 2px; display: block; color: #eef4fb; font-size: 9px; }
.physique-evolution-photos { margin-top: 12px; display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; }
.physique-evolution-photos a { overflow: hidden; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; color: inherit; background: rgba(255,255,255,.02); }
.physique-evolution-photos img { width: 100%; aspect-ratio: 3/4; object-fit: cover; display: block; }
.physique-evolution-photos span { padding: 7px; display: block; color: rgba(232,239,247,.68); font-size: 8px; text-align: center; }
.physique-file-link { margin-top: 10px; width: fit-content; display: inline-flex; align-items: center; gap: 6px; color: #9ff1d8; font-size: 9px; }
.physique-inline-upload { margin-bottom: 14px; display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 8px; align-items: center; }
.physique-inline-upload small { grid-column: 1/-1; color: rgba(232,239,247,.65); font-size: 9px; }
@media(max-width:760px){.physique-form-grid.two,.physique-form-grid.three,.physique-photo-upload-grid,.physique-measure-grid{grid-template-columns:1fr}.physique-evolution-photos{grid-template-columns:repeat(3,minmax(0,1fr))}.physique-inline-upload{grid-template-columns:1fr}.physique-inline-upload .physique-action-button{width:100%}}
'@
  $css = $css + $extra
  Write-Utf8 $cssPath $css
  Write-Host "OK  estilos da Physique operacional"
}

Write-Host ""
Write-Host "Pacote aplicado nos arquivos locais. Nenhum commit foi criado." -ForegroundColor Green
Write-Host "Agora use o GitHub Desktop para revisar as mudanças, rodar os testes e só então fazer o commit manualmente." -ForegroundColor Yellow
