$ErrorActionPreference = "Stop"

function Fail([string]$message) {
  throw $message
}

if (-not (Test-Path -LiteralPath "package.json")) {
  Fail "Execute este pacote na raiz do repositorio candinho-gestao."
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.24.4 - Refino final da Vitrine viva" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$payload = "_v45_24_4_payload"

$files = @(
  @{
    source = "$payload/company-operation-carousel-v45-14.tsx"
    target = "src/components/company-operation-carousel-v45-14.tsx"
  },
  @{
    source = "$payload/v45-24-company-home-final.css"
    target = "src/app/v45-24-company-home-final.css"
  }
)

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = Join-Path (
  Split-Path -Parent (Get-Location)
) "BACKUP_V45_24_4_$stamp"

$backedUp = $false

foreach ($file in $files) {
  if (-not (Test-Path -LiteralPath $file.source)) {
    Fail "Payload ausente: $($file.source)"
  }

  if (Test-Path -LiteralPath $file.target) {
    $destination = Join-Path $backupRoot $file.target
    $destinationDir = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
    Copy-Item -LiteralPath $file.target -Destination $destination -Force
    $backedUp = $true
  }
}

if ($backedUp) {
  Write-Host "Backup dos dois arquivos atuais criado em:" -ForegroundColor Yellow
  Write-Host " $backupRoot" -ForegroundColor Yellow
}

foreach ($file in $files) {
  Copy-Item `
    -LiteralPath $file.source `
    -Destination $file.target `
    -Force

  Write-Host "Atualizado: $($file.target)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Vitrine refinada:" -ForegroundColor Cyan
Write-Host " - moeda maior" -ForegroundColor White
Write-Host " - moeda mais alta no desktop e no mobile" -ForegroundColor White
Write-Host " - fundo interno claro, sem disco preto" -ForegroundColor White
Write-Host " - rotacao 3D continua garantida" -ForegroundColor White
Write-Host " - flutuacao vertical mantida" -ForegroundColor White
Write-Host " - troca de produtos continua aleatoria" -ForegroundColor White

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
Write-Host "V45.24.4 aplicada com sucesso." -ForegroundColor Green
Write-Host "Commit sugerido:"
Write-Host "V45.24.4 - refina Vitrine viva" -ForegroundColor White
Write-Host ""
Write-Host "Se npm run dev estiver aberto, o Next deve atualizar sozinho." -ForegroundColor DarkGray
Write-Host "Teste: http://localhost:3000/dashboard" -ForegroundColor Cyan
Write-Host ""
