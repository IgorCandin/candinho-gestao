# V45.19 · Hotfix menu mobile cortado

## Evidência
O UX Doctor registrou o mesmo problema em Suplementos, Fitness e Bank:

`div.mobile-menu-panel ultrapassou a área visível em 54–61 px`

Exemplo registrado em `/vendas/nova`:
- viewport: 414×848;
- topo real do painel: 116 px;
- altura do painel: 786 px;
- bottom: 901 px;
- overflow: 54 px.

Isso prova que não eram bugs separados por tela, e sim um problema do shell móvel.

## Correção
O novo `MobileMenuViewportGuard` mede o topo real da gaveta quando o menu abre
e calcula:

`altura máxima = fundo do visual viewport - topo real - margem de segurança`

A regra CSS carregada por último substitui os antigos `height: 100dvh` e
`height: calc(100dvh - 62px)` por essa altura real.

## Escopo
Corrige o menu móvel globalmente em:
- Suplementos;
- Fitness;
- Bank;
- Central;
- Marketing;
- Physique e demais telas que usem o AppShell.

Nenhuma migration e nenhuma alteração de dados.

## Ticket CTS + Creatina
O ticket de `/vendas/nova` foi criado em 07/08/2026 e não possui screenshot.
O fluxo comercial foi alterado posteriormente nas V45.15+.
Ele deve ser revalidado no fluxo atual antes de ser marcado como resolvido.

## Commit sugerido
`V45.19 - corrige menu mobile cortado globalmente`
