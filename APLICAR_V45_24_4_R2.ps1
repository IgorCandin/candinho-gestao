$ErrorActionPreference = "Stop"

function Fail([string]$message) {
  throw $message
}

function Normalize-Eof([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) {
    Fail "Arquivo nao encontrado: $path"
  }

  $full = (Get-Item -LiteralPath $path).FullName
  $content = [System.IO.File]::ReadAllText(
    $full,
    [System.Text.Encoding]::UTF8
  ).Replace("`r`n","`n")

  # Remove linhas vazias extras no final e deixa exatamente 1 LF.
  $content = $content.TrimEnd("`r","`n"," ","`t") + "`n"

  [System.IO.File]::WriteAllText(
    $full,
    $content,
    (New-Object System.Text.UTF8Encoding($false))
  )
}

if (-not (Test-Path -LiteralPath "package.json")) {
  Fail "Execute este pacote na raiz do repositorio candinho-gestao."
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V45.24.4 R2 - Corrige apenas git diff --check" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$files = @(
  "src/app/v45-24-company-home-final.css",
  "src/components/company-operation-carousel-v45-14.tsx"
)

foreach ($file in $files) {
  Normalize-Eof $file
  Write-Host "EOF normalizado: $file" -ForegroundColor Green
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
  Fail "git diff --check ainda encontrou erro. NAO faca commit. Mande um print desta janela."
}

Write-Host "git diff --check OK." -ForegroundColor Green

Write-Host ""
Write-Host "V45.24.4 R2 concluida com sucesso." -ForegroundColor Green
Write-Host ""
Write-Host "Agora atualize o localhost e teste a Vitrine." -ForegroundColor Cyan
Write-Host "NAO precisa reaplicar a V45.24.4 original." -ForegroundColor DarkGray
Write-Host ""
