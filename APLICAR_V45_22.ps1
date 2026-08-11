$ErrorActionPreference = "Stop"

function Fail([string]$message) {
  throw $message
}

function Read-Utf8([string]$path) {
  if (-not (Test-Path $path)) { Fail "Arquivo nao encontrado: $path" }
  return [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8).Replace("`r`n","`n")
}

function Write-Utf8([string]$path, [string]$content) {
  $parent = Split-Path -Parent $path
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  $normalized = $content.Replace("`r`n","`n")
  [System.IO.File]::WriteAllText(
    $path,
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

  $content = $content.Replace($oldN, $newN)
  Write-Utf8 $path $content
  Write-Host "Atualizado: $path" -ForegroundColor Green
}

if (-not (Test-Path "package.json")) {
  Fail "Execute este pacote na raiz do repositorio candinho-gestao."
}

if (-not (Test-Path "_v45_22_payload")) {
  Fail "A pasta _v45_22_payload precisa estar ao lado deste instalador."
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.22 - Central Global e menus por operacao" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Arquivos novos / substituicoes completas.
Get-ChildItem "_v45_22_payload" -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring((Resolve-Path "_v45_22_payload").Path.Length).TrimStart("\")
  $target = Join-Path (Get-Location) $rel
  $parent = Split-Path -Parent $target
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  Copy-Item $_.FullName $target -Force
  Write-Host "Payload: $rel" -ForegroundColor Green
}

# 2. Dashboard: quatro operacoes principais + Meu Dia na Central.
$dashboard = "src/app/(app)/dashboard/page.tsx"

Replace-Exact $dashboard '      href: "/fitness",' '      href: "/fitness/inicio",' 'href: "/fitness/inicio"'
Replace-Exact $dashboard '      href: "/bank",' '      href: "/bank/inicio",' 'href: "/bank/inicio"'
Replace-Exact $dashboard '      href: "/central",' '      href: "/central/inicio",' 'href: "/central/inicio"'
Replace-Exact $dashboard '            href="/nexus/foco"' '            href="/central/meu-dia"' 'href="/central/meu-dia"'

$marketingBlock = @'
    {
      key: "marketing",
      label: "Marketing",
      href: "/marketing",
      desktopImage:
        "/operation-banners/marketing-desktop.webp",
      mobileImage:
        "/operation-banners/marketing-mobile.webp",
      tone: "marketing",
      rgb: "239, 70, 70",
      visible: access.canAccessMarketing,
    },
'@

Replace-Exact $dashboard $marketingBlock '' 'key: "marketing"'

# O Replace-Exact acima usa marker de "ja aplicado"; se o bloco ainda existe por ter marker,
# removemos de forma controlada.
$dashContent = Read-Utf8 $dashboard
if ($dashContent.Contains('      key: "marketing",')) {
  $blockN = $marketingBlock.Replace("`r`n","`n")
  if (-not $dashContent.Contains($blockN)) {
    Fail "Nao consegui remover o card isolado de Marketing do dashboard."
  }
  Write-Utf8 $dashboard ($dashContent.Replace($blockN, ""))
  Write-Host "Removido card principal de Marketing." -ForegroundColor Green
}

# 3. AppShell: menu por operacao, Agenda Fitness, Meu Dia e Marketing dentro da Central.
$appShell = "src/components/app-shell.tsx"

Replace-Exact $appShell @'
const supplementNav = [
  { href: "/suplementos/hoje", label: "Hoje", icon: Home },
  { href: "/vendas", label: "Comercial", icon: ShoppingBag },
  { href: "/clientes", label: "CRM e relacionamento", icon: ContactRound },
  { href: "/estoque", label: "Estoque e compras", icon: Boxes },
'@ @'
const supplementNav = [
  { href: "/suplementos", label: "Menu", icon: Home },
  { href: "/suplementos/hoje", label: "Hoje", icon: Home },
  { href: "/vendas", label: "Comercial", icon: ShoppingBag },
  { href: "/clientes", label: "CRM e relacionamento", icon: ContactRound },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/estoque", label: "Estoque e compras", icon: Boxes },
'@ 'label: "Menu", icon: Home'

Replace-Exact $appShell @'
const fitnessNav = [
  { href: "/fitness", label: "Início", icon: Home },
  { href: "/fitness/painel", label: "Painel Gerencial", icon: BarChart3 },
  { href: "/fitness/vendas", label: "Comercial", icon: ShoppingBag },
'@ @'
const fitnessNav = [
  { href: "/fitness/inicio", label: "Menu", icon: Home },
  { href: "/fitness", label: "Visão geral", icon: BarChart3 },
  { href: "/fitness/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/fitness/painel", label: "Painel Gerencial", icon: BarChart3 },
  { href: "/fitness/vendas", label: "Comercial", icon: ShoppingBag },
'@ 'href: "/fitness/inicio"'

Replace-Exact $appShell @'
const bankNav = [
  { href: "/bank", label: "Este mês", icon: ChartNoAxesCombined },
'@ @'
const bankNav = [
  { href: "/bank/inicio", label: "Menu", icon: Home },
  { href: "/bank", label: "Este mês", icon: ChartNoAxesCombined },
'@ 'href: "/bank/inicio"'

Replace-Exact $appShell @'
const centralNav = [
  { href: "/central", label: "Visão Geral", icon: HeartPulse },
  { href: "/central/prioridades", label: "Prioridades", icon: ListChecks },
'@ @'
const centralNav = [
  { href: "/central/inicio", label: "Menu", icon: Home },
  { href: "/central/meu-dia", label: "Meu Dia", icon: ListChecks },
  { href: "/central", label: "Visão Geral", icon: HeartPulse },
  { href: "/central/prioridades", label: "Prioridades", icon: ListChecks },
'@ 'href: "/central/meu-dia"'

Replace-Exact $appShell @'
  { href: "/central/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/central/agenda-estrategica", label: "Agenda Estratégica", icon: ListTodo },
  { href: "/central/pendencias", label: "Pendências", icon: ListTodo },
'@ @'
  { href: "/central/agenda", label: "Agenda Global", icon: CalendarDays },
  { href: "/central/marketing", label: "Marketing", icon: Megaphone },
  { href: "/central/pendencias", label: "Pendências", icon: ListTodo },
'@ 'href: "/central/marketing"'

Replace-Exact $appShell @'
        : isCentral
          ? "/central"
          : isPartner
'@ @'
        : isCentral
          ? "/central/inicio"
          : isPartner
'@ '? "/central/inicio"'

Replace-Exact $appShell @'
            : isMarketing
              ? "/marketing"
              : isFitness
                ? "/fitness"
                : isBank
                  ? "/bank"
                  : "/suplementos",
'@ @'
            : isMarketing
              ? "/central/marketing"
              : isFitness
                ? "/fitness/inicio"
                : isBank
                  ? "/bank/inicio"
                  : "/suplementos",
'@ '? "/fitness/inicio"'

Replace-Exact $appShell @'
  if (pathname === "/suplementos") {
    return (
      <main className="supplements-entry-standalone">
        {children}
      </main>
    );
  }
'@ @'
  if (
    pathname === "/suplementos" ||
    pathname === "/fitness/inicio" ||
    pathname === "/bank/inicio" ||
    pathname === "/central/inicio"
  ) {
    return (
      <main className="supplements-entry-standalone">
        {children}
      </main>
    );
  }
'@ 'pathname === "/fitness/inicio"'

# 4. Estoque: mantem a tabela essencial, tira o atalho redundante e deixa titulo claro.
$stockPage = "src/app/(app)/estoque/page.tsx"

Replace-Exact $stockPage @'
      <article className="panel inventory-main-panel inventory-v2-products-panel">
        <div className="panel-head">
          <div>
            <h2>Produtos e quantidades</h2>
            <p>
              Consulte o saldo agregado e identifique rapidamente quais
              produtos usam controle por sabor.
            </p>
          </div>

          <Link
            className="button ghost compact-button"
            href="/produtos"
          >
            Abrir Produtos
          </Link>
        </div>
'@ @'
      <article className="panel inventory-main-panel inventory-v2-products-panel">
        <div className="panel-head">
          <div>
            <h2>Saldo por produto</h2>
            <p>
              Esta é a visão operacional das quantidades: físico, reservado,
              disponível, a caminho e controle por sabor. Cadastro e ficha
              comercial continuam em Produtos.
            </p>
          </div>
        </div>
'@ '<h2>Saldo por produto</h2>'

# Metadata defensiva para a aba do navegador em Estoque.
$stockContent = Read-Utf8 $stockPage
if (-not $stockContent.Contains('title: "Estoque e compras - Suplementos"')) {
  $anchor = "type FlavorHealthItem = {"
  if (-not $stockContent.Contains($anchor)) {
    Fail "Nao encontrei o ponto para metadata em Estoque."
  }
  $meta = @'
export const metadata = {
  title: "Estoque e compras - Suplementos",
};

'@
  $stockContent = $stockContent.Replace($anchor, $meta + $anchor)
  Write-Utf8 $stockPage $stockContent
  Write-Host "Corrigida identidade da aba de Estoque." -ForegroundColor Green
}

# 5. Google Calendar Edge Function: novo source_type operational_task.
$edge = "supabase/functions/google-calendar-sync/index.ts"
$edgeContent = Read-Utf8 $edge

if (-not $edgeContent.Contains('job.source_type === "operational_task"')) {
  $anchor = '  if (job.source_type === "marketing_task") {'
  if (-not $edgeContent.Contains($anchor)) {
    Fail "Nao encontrei o bloco marketing_task na Edge Function."
  }

  $insert = @'
  if (job.source_type === "operational_task") {
    const { data, error } = await admin
      .from("operational_tasks")
      .select("id,title,category,due_at,status,priority,operation_scope,notes")
      .eq("id", job.source_id)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const allowedScopes = ["company", "supplements", "fitness"];
    if (
      !data ||
      !allowedScopes.includes(String(data.operation_scope)) ||
      data.status !== "planned" ||
      !data.due_at
    ) {
      return { action: "delete" as const };
    }

    const when = brazilDateTime(String(data.due_at));
    const scope = String(data.operation_scope);
    const scopeLabel =
      scope === "supplements"
        ? "Suplementos"
        : scope === "fitness"
          ? "Fitness"
          : "Central";
    const href =
      scope === "supplements"
        ? "/suplementos/agenda"
        : scope === "fitness"
          ? "/fitness/agenda"
          : "/central/agenda";

    const description = [
      `Operação: ${scopeLabel}`,
      `Horário na Candinho: ${when.time}`,
      data.category ? `Categoria: ${data.category}` : null,
      data.priority ? `Prioridade: ${data.priority}` : null,
      data.notes ? `Observações:\n${data.notes}` : null,
      `Abrir na Candinho: ${APP_URL}${href}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      action: "upsert" as const,
      title: `${scopeLabel} · ${data.title}`,
      date: when.date,
      description,
    };
  }

'@

  $edgeContent = $edgeContent.Replace($anchor, $insert + $anchor)
  Write-Utf8 $edge $edgeContent
  Write-Host "Google Calendar: operational_task suportado." -ForegroundColor Green
}

$edgeContent = Read-Utf8 $edge
$edgeContent = $edgeContent.Replace(
  '      `Abrir no Marketing: ${APP_URL}/marketing/planejamento`,',
  '      `Abrir no Marketing: ${APP_URL}/central/marketing/planejamento`,'
)
Write-Utf8 $edge $edgeContent

# 6. CSS import.
$globals = "src/app/globals.css"
$globalsContent = Read-Utf8 $globals
if (-not $globalsContent.Contains('@import "./v45-22-central-global.css";')) {
  $globalsContent = $globalsContent.TrimEnd() + "`n@import `"./v45-22-central-global.css`";`n"
  Write-Utf8 $globals $globalsContent
  Write-Host "CSS V45.22 importado." -ForegroundColor Green
}

# 7. Limpamos cache gerado para o TypeScript nao ler rotas antigas.
if (Test-Path ".next") {
  Remove-Item ".next" -Recurse -Force
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
Write-Host "V45.22 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:" -ForegroundColor Cyan
Write-Host "V45.22 - central global, agendas e menus por operacao" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE: a migration e a Edge Function vao junto no commit." -ForegroundColor Yellow
Write-Host "Depois do Push eu valido Vercel, aplico a migration e redeployo o google-calendar-sync." -ForegroundColor Yellow
Write-Host ""
