@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\00_APLICAR_PACOTE.ps1"
if errorlevel 1 (
  echo.
  echo ERRO: o pacote parou para evitar alterar uma base diferente da V38 auditada.
  pause
  exit /b 1
)
echo.
echo Pacote aplicado. Nenhum commit foi feito automaticamente.
pause
