# Auditoria de espaçamento — dashboards

## O que ainda estava errado

O primeiro hotfix corrigiu `.stats-grid`, mas havia outro agrupador usado em:

- Candinho Fitness → Painel Gerencial
- Área de Teste → Visão geral

A classe `.dashboard-two-column` existia nas páginas, porém não tinha regra CSS de layout.
Por isso os painéis, como **Vendas pendentes** e **Pedidos recentes**, ficavam colados.

## Correção

- `.dashboard-two-column`
  - display grid
  - duas colunas em telas largas
  - 18 px de gap
  - uma coluna abaixo de 1100 px
  - 12 px de gap no celular

- `.dashboard-grid`
  - recebe display grid + gap como proteção para telas legadas que possam usar essa classe sem `.grid`

- Mantém todas as correções anteriores:
  - números/textos separados dentro dos cards
  - `.stats-grid` funcionando como grade
  - espaçamento entre KPIs e atalhos da Fitness

## Páginas diretamente identificadas

- `/fitness/painel`
- `/teste/[operation]`

O ajuste de `.dashboard-grid` também protege páginas antigas que reutilizam o layout base.

## Aplicação

Extrair na raiz do projeto, substituir e:

GitHub Desktop → Commit → Push origin

Commit sugerido:

`fix: corrige espaçamento restante dos dashboards`

Sem migration e sem banco.
