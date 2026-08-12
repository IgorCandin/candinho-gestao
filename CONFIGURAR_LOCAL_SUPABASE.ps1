$ErrorActionPreference = "Stop"

function Fail([string]$message) {
  throw $message
}

Set-Location -LiteralPath $PSScriptRoot

if (-not (Test-Path -LiteralPath "package.json")) {
  Fail "Extraia este helper na raiz do candinho-gestao antes de executar."
}

$envPath = Join-Path $PSScriptRoot ".env.local"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"

if (Test-Path -LiteralPath $envPath) {
  $backup = Join-Path $PSScriptRoot ".env.local.backup_$stamp"
  Copy-Item -LiteralPath $envPath -Destination $backup -Force
  Write-Host "Backup criado: $(Split-Path -Leaf $backup)" -ForegroundColor Yellow
}

$desired = [ordered]@{
  "NEXT_PUBLIC_SUPABASE_URL" = "https://ilboydbakpcfoaexpnhw.supabase.co"
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" = "sb_publishable_ZjbBUEICqBkVnfPcjdp7ow_yn791HjP"
}

$lines = @()
if (Test-Path -LiteralPath $envPath) {
  $lines = Get-Content -LiteralPath $envPath
}

foreach ($name in $desired.Keys) {
  $value = $desired[$name]
  $pattern = "^\s*" + [regex]::Escape($name) + "\s*="
  $found = $false

  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $pattern) {
      $lines[$i] = "$name=$value"
      $found = $true
    }
  }

  if (-not $found) {
    if ($lines.Count -gt 0 -and $lines[-1].Trim() -ne "") {
      $lines += ""
    }
    $lines += "$name=$value"
  }
}

$header = @(
  "# Candinho ERP - ambiente local"
  "# Gerado para desenvolvimento local; nao commitar .env.local."
)

if ($lines.Count -eq 0) {
  $lines = $header
} elseif (-not ($lines -contains "# Candinho ERP - ambiente local")) {
  $lines = $header + "" + $lines
}

Set-Content -LiteralPath $envPath -Value $lines -Encoding UTF8

Write-Host ""
Write-Host "Supabase local configurado." -ForegroundColor Green
Write-Host "Arquivo: .env.local" -ForegroundColor Green
Write-Host "Foram definidos apenas URL e publishable key." -ForegroundColor DarkGray

if (Test-Path -LiteralPath ".next") {
  Remove-Item -LiteralPath ".next" -Recurse -Force
  Write-Host "Cache .next removido." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Agora execute:" -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Depois abra:" -ForegroundColor Cyan
Write-Host "http://localhost:3000/dashboard" -ForegroundColor White
Write-Host ""
