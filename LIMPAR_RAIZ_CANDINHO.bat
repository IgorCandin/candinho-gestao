@echo off
setlocal
cd /d "%~dp0"

echo.
echo ======================================================
echo Candinho Gestao - Limpeza segura da raiz
echo ======================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0LIMPAR_RAIZ_CANDINHO.ps1"

if errorlevel 1 (
  echo.
  echo ERRO: limpeza nao concluida.
  echo Nada deve ser commitado sem conferir o GitHub Desktop.
  pause
  exit /b 1
)

echo.
echo Limpeza concluida.
echo Confira o GitHub Desktop antes de commitar.
echo.
pause
