@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo Candinho V45.16.1 - Limpeza final Bank Lab
echo ============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0APLICAR_V45_16_1.ps1"

if errorlevel 1 (
  echo.
  echo ERRO: a limpeza nao foi concluida.
  echo Nao faca commit. Mande um print desta janela.
  pause
  exit /b 1
)

echo.
echo Limpeza concluida.
echo Abra o GitHub Desktop e confira os arquivos alterados/removidos.
echo.
pause
