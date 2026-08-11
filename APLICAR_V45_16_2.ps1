$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Save-Utf8NoBom([string]$Path, [string[]]$Lines) {
    [System.IO.File]::WriteAllLines(
        (Resolve-Path -LiteralPath $Path),
        $Lines,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

function Remove-LineMatches([string]$Path, [string[]]$Patterns) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Arquivo esperado nao encontrado: $Path"
    }

    $lines = [System.Collections.Generic.List[string]]::new()
    Get-Content -LiteralPath $Path | ForEach-Object { [void]$lines.Add($_) }

    $changed = $false
    for ($i = $lines.Count - 1; $i -ge 0; $i--) {
        foreach ($pattern in $Patterns) {
            if ($lines[$i] -match $pattern) {
                $lines.RemoveAt($i)
                $changed = $true
                break
            }
        }
    }

    if ($changed) {
        Save-Utf8NoBom $Path $lines.ToArray()
    }
}

function Remove-ObjectContainingLine([string]$Path, [string]$Needle) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Arquivo esperado nao encontrado: $Path"
    }

    $lines = [System.Collections.Generic.List[string]]::new()
    Get-Content -LiteralPath $Path | ForEach-Object { [void]$lines.Add($_) }

    $matchIndex = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i].Contains($Needle)) {
            $matchIndex = $i
            break
        }
    }

    if ($matchIndex -lt 0) {
        Write-Host "Ja removido: $Needle" -ForegroundColor DarkYellow
        return
    }

    # Procura o inicio do objeto imediatamente acima.
    $start = $matchIndex
    while ($start -ge 0 -and $lines[$start].Trim() -ne "{") {
        $start--
    }

    # Procura o final do objeto imediatamente abaixo.
    $end = $matchIndex
    while ($end -lt $lines.Count -and $lines[$end].Trim() -ne "},") {
        $end++
    }

    if ($start -lt 0 -or $end -ge $lines.Count) {
        throw "Nao consegui delimitar com seguranca o bloco que contem: $Needle"
    }

    for ($i = $end; $i -ge $start; $i--) {
        $lines.RemoveAt($i)
    }

    Save-Utf8NoBom $Path $lines.ToArray()
    Write-Host "Removido bloco: $Needle" -ForegroundColor Green
}

Write-Host "1/6 Corrigindo AppShell..." -ForegroundColor Cyan

$appShell = "src/components/app-shell.tsx"
Remove-LineMatches $appShell @(
    '^\s*FlaskConical,\s*$',
    '^\s*\{\s*href:\s*"/bank-lab".*Bank 2\.0 Lab.*\},\s*$'
)

Write-Host "2/6 Corrigindo Organizar Bank..." -ForegroundColor Cyan

$organizar = "src/app/(app)/bank/organizar/page.tsx"

# Primeiro remove o card inteiro. Funciona mesmo se o import ja tiver sido removido
# pela tentativa anterior.
Remove-ObjectContainingLine $organizar 'href: "/bank-lab"'

# Depois remove import residual, se ainda existir.
Remove-LineMatches $organizar @(
    '^\s*FlaskConical,\s*$'
)

Write-Host "3/6 Removendo CSS temporario..." -ForegroundColor Cyan

$globals = "src/app/globals.css"
if (-not (Test-Path -LiteralPath $globals)) {
    throw "Arquivo esperado nao encontrado: $globals"
}

$globalLines = [System.Collections.Generic.List[string]]::new()
Get-Content -LiteralPath $globals | ForEach-Object { [void]$globalLines.Add($_) }

for ($i = $globalLines.Count - 1; $i -ge 0; $i--) {
    if ($globalLines[$i] -match 'v45-16-remove-bank-lab\.css') {
        $globalLines.RemoveAt($i)
    }
}
Save-Utf8NoBom $globals $globalLines.ToArray()

if (Test-Path -LiteralPath "src/app/v45-16-remove-bank-lab.css") {
    Remove-Item -LiteralPath "src/app/v45-16-remove-bank-lab.css" -Force
}

Write-Host "4/6 Removendo rota Bank Lab..." -ForegroundColor Cyan

if (Test-Path -LiteralPath "src/app/(app)/bank-lab") {
    Remove-Item -LiteralPath "src/app/(app)/bank-lab" -Recurse -Force
}

Write-Host "5/6 Removendo README temporario antigo..." -ForegroundColor Cyan

if (Test-Path -LiteralPath "README_V45_16_REMOVE_BANK_2_LAB.md") {
    Remove-Item -LiteralPath "README_V45_16_REMOVE_BANK_2_LAB.md" -Force
}

Write-Host "6/6 Validando referencias..." -ForegroundColor Cyan

$bankLabRefs = Get-ChildItem -Path "src" -Recurse -File |
    Select-String -SimpleMatch "/bank-lab" -ErrorAction SilentlyContinue

if ($bankLabRefs) {
    Write-Host ""
    Write-Host "Ainda ha referencia ativa a /bank-lab:" -ForegroundColor Red
    $bankLabRefs | ForEach-Object {
        Write-Host (" - " + $_.Path + ":" + $_.LineNumber + " -> " + $_.Line.Trim()) -ForegroundColor Red
    }
    throw "Limpeza incompleta."
}

$flaskRefs = Get-ChildItem -Path "src" -Recurse -File |
    Select-String -SimpleMatch "FlaskConical" -ErrorAction SilentlyContinue

if ($flaskRefs) {
    Write-Host ""
    Write-Host "Aviso: ainda existe FlaskConical em outro ponto do projeto:" -ForegroundColor Yellow
    $flaskRefs | ForEach-Object {
        Write-Host (" - " + $_.Path + ":" + $_.LineNumber) -ForegroundColor Yellow
    }
    Write-Host "Isso nao bloqueia a limpeza se nao estiver ligado ao Bank Lab." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "OK - Bank 2.0 Lab removido do codigo ativo." -ForegroundColor Green
Write-Host "Bank oficial preservado." -ForegroundColor Green
Write-Host "Migrations antigas preservadas como historico." -ForegroundColor Green
exit 0
