$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Require-File([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Arquivo esperado nao encontrado: $Path"
    }
}

function Remove-LineContaining([string]$Path, [string]$Needle) {
    Require-File $Path
    $text = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $Path), [System.Text.Encoding]::UTF8)
    if (-not $text.Contains($Needle)) {
        Write-Host "Ja limpo ou trecho ausente: $Needle" -ForegroundColor DarkYellow
        return
    }

    $escaped = [regex]::Escape($Needle)
    $next = [regex]::Replace(
        $text,
        "(?m)^[ \t]*" + $escaped + "[ \t]*\r?\n",
        ""
    )

    [System.IO.File]::WriteAllText(
        (Resolve-Path -LiteralPath $Path),
        $next,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

Require-File "package.json"
Require-File "src/components/app-shell.tsx"
Require-File "src/app/globals.css"
Require-File "src/app/(app)/bank/organizar/page.tsx"

Write-Host "1/5 Removendo Bank Lab do menu..." -ForegroundColor Cyan
Remove-LineContaining "src/components/app-shell.tsx" "FlaskConical,"
Remove-LineContaining "src/components/app-shell.tsx" '{ href: "/bank-lab", label: "Bank 2.0 Lab", icon: FlaskConical },'

Write-Host "2/5 Removendo Bank Lab de Organizar Bank..." -ForegroundColor Cyan
Remove-LineContaining "src/app/(app)/bank/organizar/page.tsx" "FlaskConical,"

$organizePath = "src/app/(app)/bank/organizar/page.tsx"
$organize = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $organizePath), [System.Text.Encoding]::UTF8)

$pattern = '(?ms)\s*\{\s*href:\s*"/bank-lab",\s*title:\s*"Bank 2\.0 — laboratório",\s*description:\s*"Teste a conexão bancária sem alterar o Bank atual\.",\s*icon:\s*FlaskConical,\s*\},'
$cleanOrganize = [regex]::Replace($organize, $pattern, "", 1)

if ($cleanOrganize -eq $organize -and $organize.Contains('/bank-lab')) {
    throw "Nao consegui remover com seguranca o card Bank Lab de /bank/organizar."
}

[System.IO.File]::WriteAllText(
    (Resolve-Path -LiteralPath $organizePath),
    $cleanOrganize,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "3/5 Removendo CSS temporario..." -ForegroundColor Cyan
$globalsPath = "src/app/globals.css"
$globals = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $globalsPath), [System.Text.Encoding]::UTF8)
$globals = [regex]::Replace(
    $globals,
    '(?m)^@import "\./v45-16-remove-bank-lab\.css";\r?\n?',
    ""
)
[System.IO.File]::WriteAllText(
    (Resolve-Path -LiteralPath $globalsPath),
    $globals,
    (New-Object System.Text.UTF8Encoding($false))
)

if (Test-Path -LiteralPath "src/app/v45-16-remove-bank-lab.css") {
    Remove-Item -LiteralPath "src/app/v45-16-remove-bank-lab.css" -Force
}

Write-Host "4/5 Apagando rota e codigo morto..." -ForegroundColor Cyan
if (Test-Path -LiteralPath "src/app/(app)/bank-lab") {
    Remove-Item -LiteralPath "src/app/(app)/bank-lab" -Recurse -Force
}

if (Test-Path -LiteralPath "README_V45_16_REMOVE_BANK_2_LAB.md") {
    Remove-Item -LiteralPath "README_V45_16_REMOVE_BANK_2_LAB.md" -Force
}

Write-Host "5/5 Conferindo referencias restantes..." -ForegroundColor Cyan

$sourceMatches = Get-ChildItem -Path "src" -Recurse -File |
    Select-String -SimpleMatch "/bank-lab" -ErrorAction SilentlyContinue

if ($sourceMatches) {
    Write-Host ""
    Write-Host "Ainda encontrei referencia a /bank-lab em src:" -ForegroundColor Red
    $sourceMatches | ForEach-Object {
        Write-Host (" - " + $_.Path + ":" + $_.LineNumber) -ForegroundColor Red
    }
    throw "Limpeza incompleta. Nao faca commit."
}

Write-Host ""
Write-Host "OK - Bank 2.0 Lab removido do codigo ativo." -ForegroundColor Green
Write-Host "As migrations antigas foram preservadas como historico, como deve ser." -ForegroundColor Green
exit 0
