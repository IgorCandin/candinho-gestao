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

  return (
    $contentN.Substring(0, $first) +
    $newN +
    $contentN.Substring($first + $oldN.Length)
  )
}

if (-not (Test-Path -LiteralPath "package.json")) {
  Fail "Execute este pacote na raiz do repositorio candinho-gestao."
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.24.1 R2 - Restaura Home sem atropelar arquivos" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# 0. Limpeza segura das DUAS alteracoes locais que bloquearam o pacote antigo
# ---------------------------------------------------------------------------

$unexpectedLocal = @(
  "src/app/globals.css",
  "src/app/v45-14-operation-streaming-home.css"
)

$stagedUnexpected = @(
  & git diff --cached --name-only -- $unexpectedLocal
)

if ($stagedUnexpected.Count -gt 0) {
  Write-Host "Existem alteracoes STAGED nestes arquivos:" -ForegroundColor Yellow
  $stagedUnexpected | ForEach-Object {
    Write-Host " - $_" -ForegroundColor Yellow
  }
  Fail "Nao vou mexer em arquivo staged. Desmarque o stage e rode novamente."
}

$dirtyUnexpected = @(
  & git diff --name-only -- $unexpectedLocal
)

if ($dirtyUnexpected.Count -gt 0) {
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $backupRoot = Join-Path (Split-Path -Parent (Get-Location)) "BACKUP_V45_24_1_$stamp"
  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

  foreach ($path in $dirtyUnexpected) {
    $destination = Join-Path $backupRoot $path
    $destinationDir = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
    Copy-Item -LiteralPath $path -Destination $destination -Force
  }

  Write-Host "Backup das alteracoes locais criado em:" -ForegroundColor Yellow
  Write-Host " $backupRoot" -ForegroundColor Yellow

  & git restore --worktree -- $unexpectedLocal

  if ($LASTEXITCODE -ne 0) {
    Fail "Nao consegui restaurar os dois arquivos locais para o ultimo commit."
  }

  Write-Host "globals.css e V45.14 voltaram ao ultimo commit com backup preservado." -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 1. Trava apenas nos arquivos que ESTA versao realmente vai editar
# ---------------------------------------------------------------------------

$targets = @(
  "src/app/(app)/dashboard/page.tsx",
  "src/components/app-shell.tsx",
  "src/app/v45-24-company-home-final.css"
)

$dirty = @(& git diff --name-only -- $targets)
$staged = @(& git diff --cached --name-only -- $targets)

if ($dirty.Count -gt 0 -or $staged.Count -gt 0) {
  Write-Host "Ainda existem alteracoes locais nos arquivos que a R2 precisa editar:" -ForegroundColor Yellow
  $dirty | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
  $staged | ForEach-Object { Write-Host " - $_ (staged)" -ForegroundColor Yellow }
  Fail "Nao vou sobrescrever esses arquivos. Mande um print do GitHub Desktop."
}

# ---------------------------------------------------------------------------
# 2. HOME: mantem o import existente, mas troca o CSS agressivo
#    por um CSS APENAS dos placeholders Vitrine / Physique.
# ---------------------------------------------------------------------------

$payloadCss = "_v45_24_1_r2_payload/v45-24-company-home-final.css"
$targetCss = "src/app/v45-24-company-home-final.css"

if (-not (Test-Path -LiteralPath $payloadCss)) {
  Fail "Payload CSS nao encontrado. Extraia o ZIP inteiro na raiz."
}

Copy-Item -LiteralPath $payloadCss -Destination $targetCss -Force
Write-Host "Home: CSS que encolhia o carrossel foi removido." -ForegroundColor Green
Write-Host "Home: Vitrine e Physique continuam como cards temporarios." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 3. DASHBOARD: cabecalho antigo + somente Sair embaixo
# ---------------------------------------------------------------------------

$dashboardPath = "src/app/(app)/dashboard/page.tsx"
$dashboard = Read-Utf8 $dashboardPath

$dashboard = $dashboard.Replace(
  'import Link from "next/link";' + "`n",
  ""
)

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
'@ "restaurar cabecalho antigo"
}

$oldUtility = @'
      <div
        className="company-home-utility-row-v4514"
        aria-label="Acesso rápido"
      >
        <span className="company-home-utility-title-v4514">
          Acesso rápido
        </span>

        <div className="company-home-utility-links-v4514">
          <Link
            className="company-home-utility-link-v4514"
            href="/central/meu-dia"
          >
            <Bot size={16} />
            <span>Meu Dia</span>
          </Link>


          {access.canManageUsers && (
            <Link
              className="company-home-utility-link-v4514"
              href="/configuracoes"
            >
              <UserRound size={16} />
              <span>Perfil</span>
            </Link>
          )}

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

if ($dashboard.Contains($oldUtility.Replace("`r`n","`n"))) {
  $dashboard = Replace-Once $dashboard $oldUtility $newUtility "somente Sair"
} elseif (-not $dashboard.Contains('aria-label="Sessão"')) {
  Fail "Nao encontrei o bloco Meu Dia / Perfil / Sair esperado."
}

$dashboard = $dashboard.Replace("    },    {", "    },`n    {")

Write-Utf8 $dashboardPath $dashboard
Write-Host "Dashboard: Meu Dia e Perfil sairam da Home; ficou somente Sair." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 4. CENTRAL: Meu Dia ja existe; Perfil vai para o menu da Central.
# ---------------------------------------------------------------------------

$appShellPath = "src/components/app-shell.tsx"
$appShell = Read-Utf8 $appShellPath

if (-not $appShell.Contains("  UserRound,")) {
  $appShell = $appShell.Replace(
    "  UsersRound,`n",
    "  UserRound,`n  UsersRound,`n"
  )
}

if (-not $appShell.Contains('{ href: "/configuracoes", label: "Perfil", icon: UserRound }')) {
  $appShell = Replace-Once $appShell @'
  { href: "/central/governanca", label: "Governança", icon: ShieldCheck },
];
'@ @'
  { href: "/central/governanca", label: "Governança", icon: ShieldCheck },
  { href: "/configuracoes", label: "Perfil", icon: UserRound },
];
'@ "Perfil no menu Central"
}

Write-Utf8 $appShellPath $appShell
Write-Host "Central: Meu Dia preservado e Perfil adicionado." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 5. VALIDACOES
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
Write-Host "V45.24.1 R2 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.24.1 - restaura home de operacoes" -ForegroundColor White
Write-Host ""
