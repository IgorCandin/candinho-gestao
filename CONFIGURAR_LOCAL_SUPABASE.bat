@echo off
setlocal
cd /d "%~dp0"

echo.
echo ======================================================
echo Candinho ERP - Configurar Supabase local
echo ======================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CONFIGURAR_LOCAL_SUPABASE.ps1"

if errorlevel 1 (
  echo.
  echo ERRO: configuracao local nao concluida.
  echo Mande um print desta janela.
  pause
  exit /b 1
)

echo.
echo Configuracao local concluida.
pause
