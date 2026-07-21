@echo off
setlocal

echo.
echo Candinho Company - V38 Polimento Final
echo.

if exist "src\app\(app)\physique\page.tsx" (
  del /f /q "src\app\(app)\physique\page.tsx"
  echo [OK] Rota antiga da Physique removida.
) else (
  echo [OK] A rota antiga da Physique ja nao existe.
)

echo.
echo Correcao aplicada. Agora pode commitar normalmente.
echo.
pause
