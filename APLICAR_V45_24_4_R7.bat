@echo off
setlocal
cd /d "%~dp0"

echo.
echo ======================================================
echo Candinho V45.24.4 R7 - Moeda da Vitrine centraliza e sobe no PC
echo ======================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0APLICAR_V45_24_4_R7.ps1"

if errorlevel 1 (
  echo.
  echo ERRO: a V45.24.4 R7 nao foi concluida.
  echo NAO faca commit. Mande um print desta janela.
  pause
  exit /b 1
)

echo.
echo V45.24.4 R7 concluida.
echo Atualize http://localhost:3000/dashboard
echo.
pause
