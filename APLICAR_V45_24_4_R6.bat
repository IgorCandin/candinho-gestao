@echo off
setlocal
cd /d "%~dp0"

echo.
echo ======================================================
echo Candinho V45.24.4 R6 - Moeda da Vitrine sobe mais no PC
echo ======================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0APLICAR_V45_24_4_R6.ps1"

if errorlevel 1 (
  echo.
  echo ERRO: a V45.24.4 R6 nao foi concluida.
  echo NAO faca commit. Mande um print desta janela.
  pause
  exit /b 1
)

echo.
echo V45.24.4 R6 concluida.
echo Atualize http://localhost:3000/dashboard
echo.
pause
