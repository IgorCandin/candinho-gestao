$ErrorActionPreference = "Stop"

function Write-Section([string]$title) {
  Write-Host ""
  Write-Host "======================================================" -ForegroundColor Cyan
  Write-Host " $title" -ForegroundColor Cyan
  Write-Host "======================================================" -ForegroundColor Cyan
}

function Fail([string]$message) {
  throw $message
}

function Is-Tracked([string]$path) {
  & git ls-files --error-unmatch -- "$path" *> $null
  return ($LASTEXITCODE -eq 0)
}

function Backup-Path(
  [string]$path,
  [string]$backupRoot
) {
  if (-not (Test-Path -LiteralPath $path)) {
    return
  }

  $destination = Join-Path $backupRoot $path
  $destinationParent = Split-Path -Parent $destination

  if ($destinationParent) {
    New-Item `
      -ItemType Directory `
      -Path $destinationParent `
      -Force | Out-Null
  }

  if ((Get-Item -LiteralPath $path).PSIsContainer) {
    Copy-Item `
      -LiteralPath $path `
      -Destination $destination `
      -Recurse `
      -Force
  } else {
    Copy-Item `
      -LiteralPath $path `
      -Destination $destination `
      -Force
  }
}

function Remove-Safely(
  [string]$path,
  [string]$backupRoot
) {
  if (-not (Test-Path -LiteralPath $path)) {
    return
  }

  Backup-Path $path $backupRoot

  $item = Get-Item -LiteralPath $path

  if (Is-Tracked $path) {
    if ($item.PSIsContainer) {
      & git rm -r -f -- "$path"
    } else {
      & git rm -f -- "$path"
    }

    if ($LASTEXITCODE -ne 0) {
      Fail "Falha ao remover arquivo rastreado pelo Git: $path"
    }
  } else {
    if ($item.PSIsContainer) {
      Remove-Item `
        -LiteralPath $path `
        -Recurse `
        -Force
    } else {
      Remove-Item `
        -LiteralPath $path `
        -Force
    }
  }

  Write-Host "Removido: $path" -ForegroundColor Green
}

if (
  -not (Test-Path -LiteralPath "package.json") -or
  -not (Test-Path -LiteralPath ".git")
) {
  Fail "Execute este arquivo na raiz do repositorio candinho-gestao."
}

Write-Section "Candinho Gestao - Limpeza segura da raiz"

Write-Host "Este script remove SOMENTE artefatos temporarios de instalacao" -ForegroundColor White
Write-Host "que acumulamos nas V45.22-V45.24." -ForegroundColor White
Write-Host ""
Write-Host "Ele NAO remove:" -ForegroundColor Yellow
Write-Host " - src / public / supabase / docs" -ForegroundColor White
Write-Host " - package.json / package-lock.json" -ForegroundColor White
Write-Host " - .env.local" -ForegroundColor White
Write-Host " - node_modules" -ForegroundColor White
Write-Host " - migrations SQL" -ForegroundColor White
Write-Host " - arquivos de codigo fora dos padroes listados" -ForegroundColor White

# ---------------------------------------------------------------------------
# 1. Localiza SOMENTE lixo conhecido na RAIZ.
# ---------------------------------------------------------------------------

$filePatterns = @(
  "APLICAR_V*.bat",
  "APLICAR_V*.ps1",
  "LEIA_ME_V*.txt",
  "LEIA_ME_RETOMADA_V*.txt",
  "CONFIGURAR_LOCAL_*.bat",
  "CONFIGURAR_LOCAL_*.ps1",
  "CONFIGURAR_LOCAL_*.txt",
  "LEIA_ME_CONFIG_LOCAL.txt"
)

$directoryPatterns = @(
  "_v*_payload",
  "BACKUP_V*"
)

$targets = New-Object System.Collections.Generic.List[string]

foreach ($pattern in $filePatterns) {
  Get-ChildItem `
    -LiteralPath "." `
    -File `
    -Filter $pattern `
    -ErrorAction SilentlyContinue |
    ForEach-Object {
      $targets.Add($_.Name)
    }
}

foreach ($pattern in $directoryPatterns) {
  Get-ChildItem `
    -LiteralPath "." `
    -Directory `
    -Filter $pattern `
    -ErrorAction SilentlyContinue |
    ForEach-Object {
      $targets.Add($_.Name)
    }
}

$targets = @(
  $targets |
  Sort-Object -Unique
)

if ($targets.Count -eq 0) {
  Write-Host ""
  Write-Host "Nenhum artefato temporario encontrado na raiz." -ForegroundColor Green
} else {
  Write-Section "Preview - arquivos que serao removidos"

  foreach ($target in $targets) {
    $trackedLabel =
      if (Is-Tracked $target) {
        "TRACKED -> vira delecao no proximo commit"
      } else {
        "local/untracked"
      }

    Write-Host " - $target [$trackedLabel]" -ForegroundColor White
  }

  Write-Host ""
  Write-Host "Total: $($targets.Count) item(ns)." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Digite LIMPAR para confirmar." -ForegroundColor Yellow

  $confirmation = Read-Host "Confirmacao"

  if ($confirmation -cne "LIMPAR") {
    Write-Host "Cancelado. Nada foi removido." -ForegroundColor Yellow
    exit 0
  }

  # Backup FORA do repositorio, para nao sujar o Git.
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $parent = Split-Path -Parent (Get-Location)
  $backupRoot = Join-Path $parent "BACKUP_LIMPEZA_CANDINHO_$stamp"

  New-Item `
    -ItemType Directory `
    -Path $backupRoot `
    -Force | Out-Null

  Write-Host ""
  Write-Host "Backup de seguranca:" -ForegroundColor Yellow
  Write-Host " $backupRoot" -ForegroundColor Yellow
  Write-Host ""

  foreach ($target in $targets) {
    Remove-Safely $target $backupRoot
  }
}

# ---------------------------------------------------------------------------
# 2. Impede que os instaladores voltem a poluir a raiz.
# ---------------------------------------------------------------------------

$gitignorePath = ".gitignore"
$marker = "# Candinho - artefatos locais de pacotes/hotfixes"

$ignoreBlock = @'

# Candinho - artefatos locais de pacotes/hotfixes
/APLICAR_V*.bat
/APLICAR_V*.ps1
/LEIA_ME_V*.txt
/LEIA_ME_RETOMADA_V*.txt
/CONFIGURAR_LOCAL_*.bat
/CONFIGURAR_LOCAL_*.ps1
/CONFIGURAR_LOCAL_*.txt
/LEIA_ME_CONFIG_LOCAL.txt
/_v*_payload/
/BACKUP_V*/
'@

$gitignore = [System.IO.File]::ReadAllText(
  (Get-Item -LiteralPath $gitignorePath).FullName,
  [System.Text.Encoding]::UTF8
).Replace("`r`n","`n")

if (-not $gitignore.Contains($marker)) {
  $gitignore =
    $gitignore.TrimEnd("`r","`n") +
    "`n" +
    $ignoreBlock.TrimStart() +
    "`n"

  [System.IO.File]::WriteAllText(
    (Get-Item -LiteralPath $gitignorePath).FullName,
    $gitignore,
    (New-Object System.Text.UTF8Encoding($false))
  )

  Write-Host ""
  Write-Host ".gitignore atualizado para nao acumular novos pacotes." -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host ".gitignore ja possui as regras de limpeza." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 3. Mostra resultado. NAO faz commit automaticamente.
# ---------------------------------------------------------------------------

Write-Section "Resultado"

Write-Host "Git status:" -ForegroundColor Cyan
& git status --short

Write-Host ""
Write-Host "Validando diff..." -ForegroundColor Cyan
& git diff --check

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "git diff --check encontrou algo para revisar." -ForegroundColor Yellow
  Write-Host "Nao faca commit sem conferir o GitHub Desktop." -ForegroundColor Yellow
} else {
  Write-Host "git diff --check OK." -ForegroundColor Green
}

Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "1. Abra o GitHub Desktop." -ForegroundColor White
Write-Host "2. Confira que as delecoes sao apenas instaladores/LEIA_ME antigos." -ForegroundColor White
Write-Host "3. Confira a alteracao do .gitignore." -ForegroundColor White
Write-Host "4. Depois faca um commit separado de limpeza." -ForegroundColor White
Write-Host ""
Write-Host "Commit sugerido:" -ForegroundColor Cyan
Write-Host "chore: limpa artefatos antigos da raiz" -ForegroundColor White
Write-Host ""
