@echo off
setlocal
cd /d "%~dp0"

echo.
echo ======================================================
echo Candinho V45.24.1 R2 - Restaura Home
echo ======================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0APLICAR_V45_24_1_R2.ps1"

if errorlevel 1 (
  echo.
  echo ERRO: a V45.24.1 R2 nao foi concluida.
  echo NAO faca commit. Mande um print desta janela.
  pause
  exit /b 1
)

echo.
echo V45.24.1 R2 concluida.
echo Abra o GitHub Desktop, confira e faca o commit sugerido.
echo.
pause
