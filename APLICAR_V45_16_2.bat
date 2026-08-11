@echo off
setlocal
cd /d "%~dp0"

echo.
echo ================================================
echo Candinho V45.16.2 - Reparo limpeza Bank 2.0 Lab
echo ================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0APLICAR_V45_16_2.ps1"

if errorlevel 1 (
  echo.
  echo ERRO: o reparo nao terminou.
  echo NAO FACA COMMIT. Mande um print desta janela.
  pause
  exit /b 1
)

echo.
echo REPARO CONCLUIDO COM SUCESSO.
echo Volte ao GitHub Desktop e mande um print da aba Changes.
echo.
pause
