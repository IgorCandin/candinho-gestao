# Planejamento Bank — revisão local de interface

## Escopo aprovado

18/10/2026: melhorar `/bank/planejamento` em computador e celular, preservando funções e sem movimentar dados reais. A rota `/bank/mobile` compõe o mesmo componente e recebe o mesmo acabamento. Responsável autorizou publicação somente após tipos/build aprovados. A entrega foi isolada sobre main `6339081`, sem incluir o setup de skills ainda local nem o pnpm-lock.yaml não rastreado do checkout original.

Skills utilizadas: brainstorming (escopo aprovado em conversa), frontend-design, React/Next.js best practices, composição React, Web Interface Guidelines, webapp-testing, Ponytail full e verification-before-completion. A revisão de React orientou reutilizar os componentes existentes, manter a fronteira servidor/cliente e evitar novos effects, bibliotecas ou consultas. As orientações visuais influenciaram hierarquia, foco, contraste, alvos de toque e enquadramento.

## Direção e mudanças

- Manter a identidade Bank: carvão #080b10, superfícies #0e171f, texto #edf3f7, secundário #aebbc8, acento #63d2c7. Vermelho/verde continuam significando falta/sobra; cor não é o único indicador. Sem fonte ou dependência nova.
- Resumo em quatro colunas no computador e duas no celular; explicitar “Falta para cobrir o mês” ou “Sobra após os compromissos”. Cálculo original preservado; magnitude apresentada junto da descrição explícita.
- Atalhos nativos para resumo, entradas, simulador e contas. Links de edição existentes mantidos.
- Entradas com valor e estado textual separado; recebimento e acesso por permissão preservados. Previsões e 13º desconhecido continuam sem virar saldo.
- Simulador com campos/resultado mais legíveis e parcelas preservadas; sem criar despesa/fatura.
- Cartões mantêm logos locais, titular, fechamento/vencimento, toque, mouse, setas e teclado. Filtro ganha resumo de quantidade/valor e ação “Mostrar todas as contas”. Totais do mês não mudam ao filtrar.
- Melhores espaçamentos, foco, toque e encaixe do contêiner. Sem ocultar funções, valores ou mensagens de erro para fazer caber.

## Validação executada

- `node --test --test-concurrency=1 tests/*.test.cjs`: 60 aprovados, zero falhas, cerca de 9,7 s. Dois testes novos de interface: descrição de falta/sobra/atalhos e ausência de confirmação de entrada para leitura apenas.
- ESLint dos três TSX alterados e teste novo: exit 0. `git diff --check`: exit 0 (avisos locais de normalização CRLF não são falhas).
- Chromium/Playwright, fixtures fictícias em 1366×768, 390×844, 320×740 e 844×390: resumo; filtros e restauração; lista vazia; troca de mês; detalhes e Escape; abertura do formulário sem enviar; 1.000 em 10 parcelas; mês sugerido por fechamento/vencimento e ajuste manual; meses futuros a conferir; setas; arrastar com mouse; teclado. Sem overflow horizontal de página ou erro JS na rodada final.
- Screenshots do resumo, simulador, detalhes e cartões inspecionadas. Movimento reduzido ativado nessa rodada. Cores/status textuais, nomes/titulares, botões e campos mantidos legíveis nas amostras.
- Ensaio isolado fora do checkout em `../bank-planner-review`: `node build.cjs` e `../browser-tests-venv/Scripts/python.exe check.py`. Builder usa componentes React reais e CSS globais referenciados pelo layout, mas substitui Next Link/router, ícones e server actions. Todas as requisições são interceptadas localmente; imports de banco são proibidos e ações de escrita lançam erro. Saídas `results.json` e screenshots nessa pasta. Não é nova rota pública nem bypass de autenticação.

## Integração com os trabalhos mais recentes

- Preservados `initialQueue`, filtros Todos/Vencidos/Hoje/Próximos e o atalho `#compromissos` presentes em main; a soma do filtro passa a refletir a combinação das filas, sem alterar o resumo mensal.
- Preservadas a correção de valor/data de entradas já recebidas, a data preenchida e a possibilidade de salvar outra correção. Nenhum formulário/ação foi substituído pelo código antigo.
- Suíte da cópia de entrega: 67 aprovados antes da atualização de main; **70 testes aprovados após integrar o PR #47**, incluindo quatro desta interface (filas por data e correção de recebidos também cobertas). É conjunto diferente dos 60 da cópia antiga com setup local. Não somar esses números. Lint direcionado e diff-check aprovados.
- Tipos locais executados com heap limitado a 1 GB e prioridade BelowNormal, em checkout separado: exit 134 por heap esgotado, sem diagnóstico de código. Aumentar o heap local foi evitado para não disputar memória com os outros trabalhos.
- Vercel, commit `0ea8023`, deployment `dpl_NhJNSPvGdLeo5tt4UNLGUb35fpux` READY: compilação em 3,0 s, TypeScript concluído em 5,4 s, 36/36 páginas estáticas geradas. Este resultado supera a limitação local para esse commit; exigir também estado READY do commit final antes de produção. PR #48 mantém a trilha de integração.

## Homologação ainda necessária

Não foram executados pagamento, adiar, edição ou confirmação real de entrada. Códigos dessas ações, cálculos, loaders, autenticação e migrations não foram alterados. Seus links/controles permanecem, mas isso não comprova integração autenticada em produção.

A tentativa anterior de TypeScript no checkout original foi interrompida por contenção; a nova tentativa isolada esgotou o heap de 1 GB. Não foram encerrados processos de outra tarefa. Resultado local não aprovado; a validação de tipos/build é feita também no pipeline remoto existente, sem relaxar configuração ou ignorar tipos. Lint global e alertas de dependências anteriores não foram zerados nesta revisão visual.

Faltam: layout autenticado completo (cabeçalho/bridges/Next real), navegação real para edição/adiamento, Safari/iPhone com teclado e toque físico, mais cenários financeiros e nomes longos reais. Validar antes de homologar mobile ou publicar. Zero dados reais lidos ou modificados pelo ensaio.

Regras visuais consultadas: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md (18/10/2026).
