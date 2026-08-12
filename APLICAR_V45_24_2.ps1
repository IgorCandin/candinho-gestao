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
  $dir = Split-Path -Parent $full

  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }

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
Write-Host " V45.24.2 - Home final + Vitrine + Physique" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# 0. RETOMADA ROBUSTA
#    Faz backup de qualquer alteracao UNSTAGED nos arquivos-alvo,
#    restaura o HEAD e aplica esta versao limpa.
#    Arquivo ausente NAO gera mais Copy-Item error.
# ---------------------------------------------------------------------------

$trackedTargets = @(
  "src/app/(app)/dashboard/page.tsx",
  "src/components/company-operation-carousel-v45-14.tsx",
  "src/components/app-shell.tsx",
  "src/app/v45-24-company-home-final.css"
)

$staged = @(& git diff --cached --name-only -- $trackedTargets)

if ($staged.Count -gt 0) {
  Write-Host "Ha arquivo STAGED que este pacote precisa editar:" -ForegroundColor Yellow
  $staged | ForEach-Object {
    Write-Host " - $_" -ForegroundColor Yellow
  }
  Fail "Desmarque o stage no GitHub Desktop e rode novamente."
}

$dirty = @(& git diff --name-only -- $trackedTargets)

if ($dirty.Count -gt 0) {
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $backupRoot = Join-Path (
    Split-Path -Parent (Get-Location)
  ) "BACKUP_V45_24_2_$stamp"

  foreach ($path in $dirty) {
    if (Test-Path -LiteralPath $path) {
      $destination = Join-Path $backupRoot $path
      $destinationDir = Split-Path -Parent $destination

      New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
      Copy-Item -LiteralPath $path -Destination $destination -Force
    } else {
      $missingLog = Join-Path $backupRoot "ARQUIVOS_AUSENTES.txt"
      $missingDir = Split-Path -Parent $missingLog

      New-Item -ItemType Directory -Path $missingDir -Force | Out-Null
      Add-Content -LiteralPath $missingLog -Value $path
    }
  }

  Write-Host "Backup das alteracoes locais criado em:" -ForegroundColor Yellow
  Write-Host " $backupRoot" -ForegroundColor Yellow

  & git restore --worktree -- $trackedTargets

  if ($LASTEXITCODE -ne 0) {
    Fail "Nao consegui restaurar os arquivos rastreados para o ultimo commit."
  }

  Write-Host "Arquivos-alvo normalizados para o ultimo commit." -ForegroundColor Green
}

# Se o CSS estiver ausente sem aparecer no diff por qualquer motivo,
# apenas seguimos: ele sera criado pelo payload abaixo.
Write-Host "Estado local preparado." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 1. BANNERS OFICIAIS enviados pelo usuario
# ---------------------------------------------------------------------------

$assetSource = "_v45_24_2_payload/operation-banners"
$assetTarget = "public/operation-banners"

if (-not (Test-Path -LiteralPath $assetSource)) {
  Fail "Payload de imagens nao encontrado. Extraia o ZIP inteiro."
}

New-Item -ItemType Directory -Path $assetTarget -Force | Out-Null

$assets = @(
  "vitrine-desktop.webp",
  "vitrine-mobile.webp",
  "physique-desktop.webp",
  "physique-mobile.webp"
)

foreach ($asset in $assets) {
  Copy-Item `
    -LiteralPath (Join-Path $assetSource $asset) `
    -Destination (Join-Path $assetTarget $asset) `
    -Force

  Write-Host "Banner instalado: $asset" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 2. HOME: restaura layout antigo e usa os novos banners
# ---------------------------------------------------------------------------

$dashboardPayload = "_v45_24_2_payload/dashboard-page.tsx"
$dashboardTarget = "src/app/(app)/dashboard/page.tsx"

if (-not (Test-Path -LiteralPath $dashboardPayload)) {
  Fail "Payload do Dashboard nao encontrado."
}

Copy-Item `
  -LiteralPath $dashboardPayload `
  -Destination $dashboardTarget `
  -Force

Write-Host "Dashboard restaurado com carrossel grande." -ForegroundColor Green
Write-Host "Home inferior: somente Sair." -ForegroundColor Green
Write-Host "Vitrine e Physique ligados aos banners oficiais." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 3. CSS V45.24: arquivo pode existir OU estar ausente.
#    Copiamos diretamente, sem tentar fazer backup de caminho inexistente.
# ---------------------------------------------------------------------------

$homeCssPayload = "_v45_24_2_payload/v45-24-company-home-final.css"
$homeCssTarget = "src/app/v45-24-company-home-final.css"

if (-not (Test-Path -LiteralPath $homeCssPayload)) {
  Fail "Payload CSS da Home nao encontrado."
}

Copy-Item `
  -LiteralPath $homeCssPayload `
  -Destination $homeCssTarget `
  -Force

Write-Host "CSS agressivo da V45.24 removido." -ForegroundColor Green
Write-Host "Vitrine: moeda Suplementos/Fitness ativada." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 4. CARROSSEL: moeda animada apenas na Vitrine
# ---------------------------------------------------------------------------

$carouselPath = "src/components/company-operation-carousel-v45-14.tsx"
$carousel = Read-Utf8 $carouselPath

$coinMarker = "company-vitrine-coin-v45242"

if (-not $carousel.Contains($coinMarker)) {
  $carousel = Replace-Once $carousel @'
                )}

                {operation.badge ? (
'@ @'
                )}

                {operation.key === "vitrine" && (
                  <div
                    className="company-vitrine-coin-v45242"
                    aria-hidden="true"
                  >
                    <div className="company-vitrine-coin-inner-v45242">
                      <span className="company-vitrine-coin-face-v45242 front">
                        <span className="company-vitrine-coin-label-v45242">
                          Suplementos
                        </span>
                      </span>
                      <span className="company-vitrine-coin-face-v45242 back">
                        <span className="company-vitrine-coin-label-v45242">
                          Fitness
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {operation.badge ? (
'@ "moeda animada da Vitrine"

  Write-Utf8 $carouselPath $carousel
  Write-Host "Carrossel: animacao 3D da Vitrine adicionada." -ForegroundColor Green
} else {
  Write-Host "Carrossel: moeda da Vitrine ja presente." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 5. CENTRAL: Meu Dia permanece e Perfil entra la
# ---------------------------------------------------------------------------

$appShellPath = "src/components/app-shell.tsx"
$appShell = Read-Utf8 $appShellPath

if (-not $appShell.Contains("  UserRound,")) {
  $appShell = $appShell.Replace(
    "  UsersRound,`n",
    "  UserRound,`n  UsersRound,`n"
  )
}

$profileItem =
  '{ href: "/configuracoes", label: "Perfil", icon: UserRound }'

if (-not $appShell.Contains($profileItem)) {
  $appShell = Replace-Once $appShell @'
  { href: "/central/governanca", label: "Governança", icon: ShieldCheck },
];
'@ @'
  { href: "/central/governanca", label: "Governança", icon: ShieldCheck },
  { href: "/configuracoes", label: "Perfil", icon: UserRound },
];
'@ "Perfil no menu da Central"
}

Write-Utf8 $appShellPath $appShell
Write-Host "Central: Meu Dia preservado e Perfil adicionado." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 6. CACHE + VALIDACOES
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
Write-Host "Resumo de arquivos alterados:" -ForegroundColor Cyan
& git status --short

Write-Host ""
Write-Host "V45.24.2 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.24.2 - finaliza home Vitrine e Physique" -ForegroundColor White
Write-Host ""
