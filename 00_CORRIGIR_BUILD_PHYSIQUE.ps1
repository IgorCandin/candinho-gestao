Set-Location $PSScriptRoot

$oldRoute = "src/app/(app)/physique/page.tsx"
$newRoute = "src/app/physique/page.tsx"

Write-Host ""
Write-Host "Candinho V38 - Correcao definitiva da Physique"
Write-Host ""

if (-not (Test-Path $newRoute)) {
    Write-Error "A nova rota standalone nao foi encontrada: $newRoute. Nenhum arquivo foi removido."
    exit 1
}

if (Test-Path $oldRoute) {
    git rm -f -- $oldRoute
    if ($LASTEXITCODE -ne 0) {
        Write-Error "git rm falhou."
        exit 1
    }
    Write-Host "[OK] Rota antiga removida e exclusao registrada no Git."
}
else {
    Write-Host "[OK] A rota antiga ja nao existe localmente."
    git ls-files --error-unmatch $oldRoute *> $null
    if ($LASTEXITCODE -eq 0) {
        git rm -f --cached -- $oldRoute
        Write-Host "[OK] Registro antigo removido do indice do Git."
    }
}

if (Test-Path $oldRoute) {
    Write-Error "A rota antiga ainda existe."
    exit 1
}

if (-not (Test-Path $newRoute)) {
    Write-Error "A nova rota standalone sumiu."
    exit 1
}

Write-Host "[OK] Rota antiga removida."
Write-Host "[OK] Nova rota standalone preservada."
Write-Host ""
git status --short -- $oldRoute $newRoute
Write-Host ""
Write-Host "Agora faça o commit no GitHub Desktop. A exclusao precisa aparecer."
