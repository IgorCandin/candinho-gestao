@echo off
setlocal
cd /d "%~dp0"

echo.
echo ======================================================
echo Candinho V45.23 - Mobile de operacoes + menus modais
echo ======================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0APLICAR_V45_23.ps1"

if errorlevel 1 (
  echo.
  echo ERRO: a V45.23 nao foi concluida.
  echo NAO faca commit. Mande um print desta janela.
  pause
  exit /b 1
)

echo.
echo V45.23 concluida.
echo Abra o GitHub Desktop e faca o commit sugerido.
echo.
pause
