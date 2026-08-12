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
Write-Host " V45.24.1 R3 - Restaura Home definitivamente" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# 0. O R2 ja restaurou globals.css e V45.14.
#    O unico arquivo local restante do print foi o CSS V45.24.
#    Ele e justamente o arquivo que PRECISAMOS substituir.
# ---------------------------------------------------------------------------

$replaceableCss = "src/app/v45-24-company-home-final.css"
$protectedTargets = @(
  "src/app/(app)/dashboard/page.tsx",
  "src/components/app-shell.tsx"
)

$stagedAll = @(
  & git diff --cached --name-only -- ($protectedTargets + @($replaceableCss))
)

if ($stagedAll.Count -gt 0) {
  Write-Host "Ha arquivo staged que este hotfix precisaria editar:" -ForegroundColor Yellow
  $stagedAll | ForEach-Object {
    Write-Host " - $_" -ForegroundColor Yellow
  }
  Fail "Desmarque o stage no GitHub Desktop e rode novamente."
}

$dirtyProtected = @(& git diff --name-only -- $protectedTargets)

if ($dirtyProtected.Count -gt 0) {
  Write-Host "Ha trabalho local em Dashboard/AppShell:" -ForegroundColor Yellow
  $dirtyProtected | ForEach-Object {
    Write-Host " - $_" -ForegroundColor Yellow
  }
  Fail "Nao vou sobrescrever Dashboard/AppShell. Mande um print do GitHub Desktop."
}

$dirtyCss = @(& git diff --name-only -- $replaceableCss)

if ($dirtyCss.Count -gt 0) {
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $backupRoot = Join-Path (
    Split-Path -Parent (Get-Location)
  ) "BACKUP_V45_24_1_R3_$stamp"

  $destination = Join-Path $backupRoot $replaceableCss
  $destinationDir = Split-Path -Parent $destination

  New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
  Copy-Item -LiteralPath $replaceableCss -Destination $destination -Force

  Write-Host "Backup do CSS local criado em:" -ForegroundColor Yellow
  Write-Host " $backupRoot" -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 1. HOME: substitui o CSS V45.24 agressivo por placeholders puros.
# ---------------------------------------------------------------------------

$payloadCss = "_v45_24_1_r3_payload/v45-24-company-home-final.css"

if (-not (Test-Path -LiteralPath $payloadCss)) {
  Fail "Payload nao encontrado. Extraia o ZIP inteiro na raiz do repositorio."
}

Copy-Item -LiteralPath $payloadCss -Destination $replaceableCss -Force

Write-Host "Home: CSS que encolhia logo/carrossel substituido." -ForegroundColor Green
Write-Host "Home: geometria voltou para V45.14/V45.22." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 2. DASHBOARD: restaura cabecalho e deixa somente Sair.
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
'@ "cabecalho da Home"
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
  $dashboard = Replace-Once $dashboard $oldUtility $newUtility "rodape somente Sair"
} elseif (-not $dashboard.Contains('aria-label="Sessão"')) {
  Fail "Nao encontrei o bloco inferior esperado da Home."
}

$dashboard = $dashboard.Replace("    },    {", "    },`n    {")

Write-Utf8 $dashboardPath $dashboard
Write-Host "Dashboard: restaurado e com somente Sair." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 3. CENTRAL: Meu Dia fica la e Perfil entra no menu.
# ---------------------------------------------------------------------------

$appShellPath = "src/components/app-shell.tsx"
$appShell = Read-Utf8 $appShellPath

if (-not $appShell.Contains("  UserRound,")) {
  $appShell = $appShell.Replace(
    "  UsersRound,`n",
    "  UserRound,`n  UsersRound,`n"
  )
}

if (-not $appShell.Contains(
  '{ href: "/configuracoes", label: "Perfil", icon: UserRound }'
)) {
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
Write-Host "Central: Meu Dia preservado; Perfil adicionado." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 4. VALIDACOES
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
Write-Host "V45.24.1 R3 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.24.1 - restaura home de operacoes" -ForegroundColor White
Write-Host ""
