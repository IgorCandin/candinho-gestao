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

function Remove-Mobile-Redirect([string]$path) {
  $content = Read-Utf8 $path

  # Remove o import, caso ainda exista.
  $content = [regex]::Replace(
    $content,
    '(?m)^import \{ isMobileOperationEntry \} from "@/lib/operation-entry-device";\n?',
    ''
  )

  # Remove de forma robusta o bloco que sobrou da versao anterior.
  $pattern = '(?ms)^\s*if\s*\(\s*await\s+isMobileOperationEntry\(\)\s*\)\s*\{\s*redirect\("[^"]+"\);\s*\}\s*'
  $content = [regex]::Replace($content, $pattern, '')

  if ($content -match 'isMobileOperationEntry') {
    Fail "Ainda existe referencia a isMobileOperationEntry em $path"
  }

  Write-Utf8 $path $content
  Write-Host "Corrigido: $path" -ForegroundColor Green
}

if (-not (Test-Path -LiteralPath "package.json")) {
  Fail "Execute este pacote na raiz do repositorio candinho-gestao."
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.23 - Correcao de retomada" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Confirma que o pacote principal V45.23 realmente foi aplicado antes do erro.
$requiredMarkers = @(
  @{ Path = "src/components/app-shell.tsx"; Marker = 'className="mobile-menu-backdrop"' },
  @{ Path = "src/components/operation-entry-gateway-v45-22.tsx"; Marker = 'className="v4523-entry-back"' },
  @{ Path = "src/app/globals.css"; Marker = '@import "./v45-23-mobile-operation-and-overlays.css";' },
  @{ Path = "src/components/dismissible-menu-guard.tsx"; Marker = 'export function DismissibleMenuGuard()' }
)

foreach ($item in $requiredMarkers) {
  $content = Read-Utf8 $item.Path
  if (-not $content.Contains($item.Marker)) {
    Fail "A V45.23 principal parece nao ter sido aplicada por completo. Faltou: $($item.Path)"
  }
}

Write-Host "V45.23 principal detectada. Retomando..." -ForegroundColor DarkGray

Remove-Mobile-Redirect "src/app/(app)/fitness/inicio/page.tsx"
Remove-Mobile-Redirect "src/app/(app)/bank/inicio/page.tsx"
Remove-Mobile-Redirect "src/app/(app)/central/inicio/page.tsx"

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
Write-Host "V45.23 corrigida e concluida com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.23 - mobile de operacoes e menus modais" -ForegroundColor White
Write-Host ""
