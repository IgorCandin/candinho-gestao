# Rotina de conferência do ERP

## Ferramentas disponíveis

A skill pessoal `webapp-testing` já cobre Playwright, inspeção de tela e console. Ela ajuda a executar testes, mas não conhece as regras comerciais do ERP. Não foi instalada integração externa nem contratado serviço de teste.

## Camadas de evidência

1. `node --test tests/*.test.cjs`: navegação, permissões, payloads, filtros e cálculos com dados sintéticos.
2. `npx tsc --noEmit`, lint dos arquivos alterados e build remoto do mesmo commit: integridade técnica.
3. `python tests/browser/readonly_smoke.py --base-url https://candinho.duckdns.org`: fronteira de acesso em desktop/mobile, sem sessão ou POST. Não prova fluxo autenticado.
4. Navegador autenticado: abrir filas, conferir filtro, ações disponíveis, rolagem e console. Não confirmar operações reais só para testar.
5. SQL em `supabase/tests/fitness_consignment_flow_rollback.sql`: fixture sintética, venda vinculada, baixa única, devolução e ROLLBACK. Executar somente no ambiente autorizado; conferir zero resíduos.
6. Homologação do responsável: registrar no mapa OK/Falta com exemplo concreto. Teste automatizado aprovado não marca a conferência humana como OK.

## Cobertura desta rodada — 17/10/2026

- Consignação: venda parcial, devolução total, cancelamento, quantidades vazias/zero e erro da RPC. Teste SQL transacional executado com sucesso; zero produtos/clientes de teste restantes.
- Bank: confirmação usa a RPC mensal existente; correção substitui total recebido, sem duplicar valor; leitura sem permissão de escrita não oferece formulário.
- Mapa: aprovados ocultos com histórico; agrupamento só herda OK se todos os itens relacionados foram aprovados; regressão explícita prevalece.
- Estoque: demanda sem disponível vem antes de reservas e reposição; mercadoria a caminho não é tratada como entregue.
- Navegador: 418 reproduzido na venda Suplementos em produção anterior à mudança. Guard adicionada ao auxiliar de orçamento para aguardar hidratação. Exige reconferência após publicação.
- Bank abriu autenticado sem novo erro nesta checagem. 441/Load failed antigos não foram declarados resolvidos apenas pela ausência em uma visita.

## Ainda no mapa

Ampliar cenários autenticados por perfil e operação, compras completas dentro da fila, investigação dos sinais Doctor e revisão da consignação histórica registrada como devolução. Não criar venda retroativa sem confirmar as peças que realmente ficaram com a cliente.
