@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0APLICAR_V45_23_1.ps1"
if errorlevel 1 (
  echo.
  echo ERRO: a V45.23.1 nao foi concluida.
  echo NAO faca commit. Mande um print desta janela.
  pause
  exit /b 1
)
echo.
echo V45.23.1 concluida.
pause
