# Lote mobile — janelas operacionais, 18/10/2026

## Escopo e causa

Continuidade do mapa após Bank PR #48, sobre main `ae247d9` (preservando os filtros do PR #49). Nenhuma função financeira, RPC, loader, autenticação, migration ou dado real modificado.

Revisão das pendências com systematic-debugging, React best practices, Web Interface Guidelines, webapp-testing e verification-before-completion. A referência Supabase foi consultada para manter as fronteiras dos componentes: testes simulam clientes e não executam consultas ou ações reais. Não foi alterada sua integração.

A reprodução do código anterior com os componentes reais mostrou foco fora da janela ao abrir nos quatro casos: conclusão Company, recebimento conjunto, fotos do produto e janela do painel Bank. `role=dialog` sozinho não move ou contém foco. O Bank possuía Escape e trava de rolagem próprios, mas não controle de foco; as outras janelas não tinham um padrão completo. Os registros dessa rodada ficam em `../mobile-modal-review/baseline.json`.

## Mudança

- Hook local `useModalFocus`: primeiro controle visível focado sem abrir teclado; Tab/Shift+Tab contidos na janela; Escape chama a mesma ação de fechar; foco retorna ao acionador. Callback atualizado sem reiniciar o ciclo a cada render.
- Trava de rolagem restaurável e contagem para janelas sobrepostas do mesmo hook. Eventos não interceptam uma janela interna que já possui o foco. Não cria ações nem impede fechar por botão/backdrop.
- Aplicação somente às quatro janelas citadas. Payloads, regras, tratamento de erros, edição, pagamento e upload/download preservados.
- CSS delimitado por essas classes: área interna rolável com min-height zero; cabeçalho/rodapé não encolhem; títulos longos quebram linha; margens seguras e limite dinâmico de altura; fechar com alvo de toque de 44 px; campos de 16 px nas larguras pequenas para reduzir zoom automático.

## Evidência local

- Dois testes de ciclo do hook falharam antes de existir a implementação e passaram depois: abertura/Tab/restauração de foco e rolagem; Escape e janela fechada sem lock. A falha inicial era ausência do hook, não reprodução de um erro do ERP; a reprodução anterior independente está no navegador.
- Suíte Node: 72 aprovados antes de integrar o PR #50; **75 aprovados após integrar a nova versão de Acompanhar**, zero falhas. Lint direcionado e diff-check aprovados. Isso não zera lint/advisories anteriores. A integração preservou os dois registros de observações e repetiu o ensaio das janelas com as folhas CSS atualizadas.
- Chromium isolado: **20 verificações**, quatro janelas em 1366×768, 390×844, 320×740, 844×390 e 390×430. Foco inicial dentro da janela, sem focar input automaticamente; Tab circular nos dois sentidos; último controle alcançável por rolagem; Escape, restauração de foco/overflow; caixas dentro da viewport e sem overflow horizontal interno. Último input do corpo rolável de conclusão também conferido.
- Screenshots inspecionadas: conclusão em área reduzida, pagamento conjunto em 320 px, fotos em paisagem e Bank com formulário longo. Inputs e ícones sintéticos não permitem avaliar o acabamento desses controles reais.
- Ensaio em `../mobile-modal-review`: `node build.cjs --baseline` + `../browser-tests-venv/Scripts/python.exe check.py --baseline`; depois `node build.cjs` + `../browser-tests-venv/Scripts/python.exe check.py`. Fontes reais dos quatro componentes, React e CSS globais. Next Link/router e ícones substituídos; corpos de pagamento/entrega são campos fictícios compridos. O recebimento conjunto e a galeria mantêm o corpo real, com dados fictícios. Import Supabase é simulado e lança erro caso usado; tráfego bloqueado/interceptado. Zero gravações.

## Ainda falta para fechar mobile

1. Safari/iPhone físico: teclado aberto/fechado, rolagem até o fim, orientação, toque, fechar/voltar e reabertura. Área pequena de Chromium não simula o teclado nem os gestos do Safari.
2. Integração autenticada completa de pagamento, entrega, acerto, transferência, lotes/sabores e parceiros, em dados de teste isolados ou ação real desejada pelo responsável. Não testar essas gravações no banco real para gerar evidência.
3. Revisão das outras janelas e menus/cabeçalhos/zoom, preservando a ordem do mapa. Este hook não foi aplicado indiscriminadamente ao ERP inteiro.
4. Doctor: confirmar novas ocorrências antes de encerrar sinais; não apagar histórico. Segurança/lint preexistentes continuam pendentes.

Build/TypeScript remoto e publicação devem ter evidência própria no PR/deployment, antes de declarar online. Não rodar builds pesados simultâneos no computador compartilhado.
