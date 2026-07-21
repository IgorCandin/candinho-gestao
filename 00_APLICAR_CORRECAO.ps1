$oldRoute = "src/app/(app)/physique/page.tsx"

Write-Host ""
Write-Host "Candinho Company - V38 Polimento Final"
Write-Host ""

if (Test-Path $oldRoute) {
    Remove-Item -Force $oldRoute
    Write-Host "[OK] Rota antiga da Physique removida."
} else {
    Write-Host "[OK] A rota antiga da Physique ja nao existe."
}

Write-Host ""
Write-Host "Correcao aplicada. Agora pode commitar normalmente."
