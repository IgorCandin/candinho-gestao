@echo off
setlocal
cd /d "%~dp0"

echo.
echo ======================================================
echo Candinho V45.22.1 - Viewport + ficha de produto
echo ======================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0APLICAR_V45_22_1.ps1"

if errorlevel 1 (
  echo.
  echo ERRO: a V45.22.1 nao foi concluida.
  echo NAO faca commit. Mande um print desta janela.
  pause
  exit /b 1
)

echo.
echo V45.22.1 concluida.
echo Abra o GitHub Desktop, confira as alteracoes e faca o commit sugerido.
echo.
pause
