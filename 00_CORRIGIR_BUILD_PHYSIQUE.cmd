@echo off
setlocal
cd /d "%~dp0"

echo.
echo ===============================================
echo CANDINHO V38 - CORRECAO DEFINITIVA DA PHYSIQUE
echo ===============================================
echo.

set "OLD_ROUTE=src\app\(app)\physique\page.tsx"
set "NEW_ROUTE=src\app\physique\page.tsx"

if not exist "%NEW_ROUTE%" (
  echo [ERRO] A nova rota standalone nao foi encontrada:
  echo %NEW_ROUTE%
  echo.
  echo Nenhum arquivo foi removido.
  pause
  exit /b 1
)

if exist "%OLD_ROUTE%" (
  echo Removendo rota antiga do Git...
  git rm -f -- "%OLD_ROUTE%"
  if errorlevel 1 (
    echo.
    echo [ERRO] O git rm falhou.
    echo Tente abrir o terminal na raiz do projeto e executar:
    echo git rm -f -- "src/app/(app)/physique/page.tsx"
    pause
    exit /b 1
  )
  echo.
  echo [OK] Rota antiga removida e exclusao registrada no Git.
) else (
  echo [OK] A rota antiga ja nao existe localmente.
  echo Verificando se o Git ainda a rastreia...
  git ls-files --error-unmatch "%OLD_ROUTE%" >nul 2>nul
  if not errorlevel 1 (
    git rm -f --cached -- "%OLD_ROUTE%"
    echo [OK] Registro antigo removido do indice do Git.
  ) else (
    echo [OK] O Git tambem nao rastreia mais a rota antiga.
  )
)

echo.
echo Verificacao:
if exist "%OLD_ROUTE%" (
  echo [ERRO] A rota antiga AINDA existe.
  pause
  exit /b 1
) else (
  echo [OK] src/app/(app)/physique/page.tsx removido.
)

if exist "%NEW_ROUTE%" (
  echo [OK] src/app/physique/page.tsx preservado.
) else (
  echo [ERRO] A nova rota standalone sumiu. Pare aqui.
  pause
  exit /b 1
)

echo.
echo Alteracoes que devem aparecer no Git:
git status --short -- "%OLD_ROUTE%" "%NEW_ROUTE%"

echo.
echo ===============================================
echo AGORA ABRA O GITHUB DESKTOP E FACA O COMMIT.
echo A EXCLUSAO DO ARQUIVO ANTIGO PRECISA APARECER.
echo ===============================================
echo.
pause
