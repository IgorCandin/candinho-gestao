# Observações de desenvolvimento

Use este arquivo como fila leve de correções, não como lista automática de mudanças.

## Formato

```text
ID:
Data:
Contexto:
Evidência:
Sugestão:
Status: observado | confirmado | adotado | transformado em teste | descartado
Referências:
```

## Observações atuais

### Entradas e 13º no Planejamento — 16/10/2026

- Contexto: responsável sentiu falta de visualizar/confirmar entradas e citou 13º Igor/Giulia sem valor ou data conhecidos.
- Evidência: Planejamento escondia entradas em disclosure sem formulário. RPC existente de recebimento mensal faz upsert por fonte/mês e não altera saldo de contas. Consulta somente leitura não encontrou fonte com nome 13/décimo.
- Mudança: seção visível, formulário de fonte mensal com valor acumulado e data reais; links para recebíveis/vendas na origem; nenhuma confirmação executada pelo agente. Lembrete do 13º é apenas pendência de planejamento, não lançamento financeiro e não entra nos totais.
- Status: implementação nesta rodada; testes de usuário continuam pendentes. Não inferir valores/datas, nem presumir que confirmação atualiza o saldo automaticamente.

### OBS-001 — Não anunciar publicação sem evidência

- Contexto: em conversas anteriores, funcionalidades foram descritas como publicadas sem que o comportamento em produção estivesse confirmado.
- Evidência: relatos posteriores de rota com erro ou função ausente.
- Sugestão: separar sempre “implementado no código”, “build aprovado”, “banco aplicado” e “produção testada”.
- Status: adotado em `AGENTS.md`.

### OBS-002 — Company não deve escapar para módulos antigos

- Contexto: rotas e atalhos criados dentro da Company levaram para Suplementos/Fitness antigos.
- Evidência: relatos recorrentes durante a migração.
- Sugestão: revisar destino de links e registrar exceções deliberadas.
- Status: adotado como regra; cobertura automatizada ainda pendente.

### OBS-003 — Correção visual não pode remover função

- Contexto: simplificações de UX anteriores ocultaram ou removeram capacidades necessárias.
- Evidência: necessidade de recuperar estoque, conclusão de vendas e ações existentes.
- Sugestão: antes de redesenhar, inventariar ações e testar os fluxos essenciais em desktop e mobile.
- Status: adotado como processo; testes de regressão ainda pendentes.

## Revisão

### OBS-004 — Pós-venda permanece após cancelamento

- Data: 03/10/2026.
- Contexto: calendário do ERP e fila de contatos de pós-venda.
- Evidência: consulta em produção confirmou 3 tarefas automáticas de reposição ainda planejadas para vendas canceladas, incluindo Edirlei. O pós-venda agrupado já estava cancelado; a reposição era a origem do contato ativo.
- Sugestão: conferir vínculo do compromisso com a venda e tratamento do cancelamento na geração, atualização e sincronização da agenda. Retirar da fila o contato originado exclusivamente pela venda cancelada, preservando histórico e contatos de outras vendas válidas do cliente.
- Status: corrigido no banco em 03/10/2026; consulta pós-correção confirmou zero tarefas automáticas ativas ligadas a vendas canceladas e tarefa de Edirlei cancelada. Histórico e vínculos preservados. Validação visual pendente.
- Teste esperado: criar venda com pós-venda, cancelar e verificar que o contato deixa a agenda/fila ativa; uma segunda venda válida do cliente deve manter seu contato.


### OBS-005 — Melhorias de DOM e carregamento da Nova venda

- Data: 03/10/2026.
- Contexto: Nova venda Suplementos na Company e hidratação de conteúdo transmitido pelo servidor.
- Evidência: React 418 reproduzido em produção nos commits ab4b121 e 859ca73. CommercialSaleRefinementUX alterava o DOM sem conferir se NewSaleForm já estava hidratado. O marcador de prontidão publicado impede essa corrida específica, mas o erro persistiu: a causa completa continua aberta.
- Sugestão: preservar melhorias e campos; investigar divergência restante sem esconder erros ou remover renderização do servidor em toda a página.
- Status: proteção parcial publicada; Doctor não encerrado. Tipos aprovados e lint direcionado com zero erros (aviso preexistente de dependência no NewSaleForm).

### OBS-006 — Marcações locais de migração entre operações

- Data: 03/10/2026.
- Contexto: mapa com duas instâncias do roteiro (Suplementos e Fitness).
- Evidência: saveLocal escrevia o mapa da instância inteira, possivelmente desatualizado, e uma sincronização bem-sucedida removia todo o cache compartilhado. Isso podia perder marcações de outras linhas/da outra operação.
- Sugestão: mesclar pelo check_key com o cache atual, remover apenas a linha sincronizada e notificar as duas instâncias. Falhas de conexão e de armazenamento não podem deixar o botão travado nem fingir persistência.
- Status: corrigido no código; verificação de tipos e lint direcionado aprovados. Não alterar marcações reais para testar em produção.

### OBS-007 — Mapa sem permissão de leitura/gravação

- Data: 06/10/2026.
- Evidência: log de produção de 16:07 UTC registrou permission denied for table migration_audit_checks. Consulta confirmou ausência de SELECT/INSERT/UPDATE para authenticated, apesar da migration histórica de grant; RLS estava ativa.
- Correção: restaurar somente leitura e upsert para authenticated, preservando políticas e dados. Remover TRUNCATE/REFERENCES/TRIGGER desnecessários de anon/authenticated; não conceder DELETE nem acesso anônimo.
- Status: migration 20261006162033 aplicada online. Teste com papel authenticated e administrador ativo leu, inseriu e atualizou dentro de transação com ROLLBACK; zero registros fictícios restantes. Advisors sem ERROR; alertas anteriores permanecem. CLI não disponível: arquivo usa a versão exata registrada pelo Supabase, não timestamp inventado.
- Próximo: confirmar janela do mapa e persistência visual quando houver navegação disponível. React 418 continua independente e aberto.

### OBS-008 — Previsão não é saldo confirmado

- Data: 16/10/2026.
- Contexto: planejamento do Bank aprovado pelo responsável.
- Evidência: /bank/mobile transportava a diferença projetada atual como abertura do próximo mês. Reconciliação audit_events 3373 registra reserva externa de novembro e salários já adiantados.
- Mudança: novo planejamento separa saldo, reserva por mês, recebimentos informativos e previsões a conferir. Reserva entra uma vez, sem transporte automático; simulação não grava dados. Usa compromissos existentes, sem reimportação.
- Status: implementação e nove testes aprovados na branch codex/bank-month-planner; PR #26 em rascunho, preview READY, produção não alterada. Validação visual e ações mutantes reais não homologadas. Ver BANK-PLANEJAMENTO-2026-10-16.md.

### OBS-009 — Normalizar a marca, não só a caixa

- Contexto: logos de bancos enviadas com margens internas diferentes; Nubank tinha marca pequena dentro de uma imagem grande.
- Evidência: mesma caixa de 64px deixou Nubank desproporcional às outras logos na prévia.
- Mudança: enquadramento óptico por marca, com escala uniforme e recorte de margem via CSS, preservando arquivos originais e proporções. Regra de antecipar esse acabamento registrada em AGENTS.md; não esperar apontamentos repetidos.
- Status: ajuste de apresentação, sem alteração financeira. Conferir conjunto antes de publicar.

Ao finalizar uma etapa, revisar observações confirmadas e promover as úteis para:

- regra em `AGENTS.md`;
- decisão em `CONTEXT.md`;
- regra verificada em `BUSINESS_RULES.md`;
- teste automatizado ou roteiro de regressão.

### OBS-010 — Compra cancelada não pode alimentar o pós-venda

- Data: 16/10/2026.
- Contexto: auditoria global após Adriana receber contexto com dois wheys, um deles de venda cancelada.
- Evidência: 16 vendas canceladas de Suplementos, em 12 clientes; 11 agrupamentos de pós-venda de 10 clientes continham vendas canceladas. A view agregadora e a seleção de compras atuais do Nexus não filtravam `general_status`. As fichas de cliente usavam o histórico geral sem esse filtro. A lista classificava `cancelled` pela data, fazendo-o aparecer como atraso.
- Correção: excluir canceladas dos totais/contexto de pós-venda e das compras efetivas das fichas (incluindo caminho paginado e legado); manter registros e vínculos para auditoria; tratar cancelados como estado terminal na fila. Rascunhos pendentes são arquivados no log e invalidados no próximo cancelamento. Compras válidas do mesmo agrupamento permanecem.
- Banco: migration `20261016124148` aplicada em produção. Comparação global de contagem/valor/contexto aprovada. Adriana: 1 compra / R$ 190; Gabriel: 2 / R$ 164,80. Hashes de vendas, itens, Fitness e movimentos de estoque iguais antes/depois, 130 vínculos preservados. Pós-venda Fitness e curva de giro já excluíam canceladas.
- Testes: três testes de classificação; regressão SQL em todos os agrupamentos; teste de cancelamento parcial/total com invalidação e auditoria do rascunho, integralmente desfeito com ROLLBACK. Advisors sem ERROR; alertas existentes fora do escopo permanecem.
- Status: banco e código publicados pelo PR #28, produção READY no commit `8b0e946`. Fichas de Adriana e Gabriel conferidas visualmente no domínio normal. Build remoto aprovado e 14 testes Node aprovados. Build local Turbopack limitado pelo junction de dependências.
- Extensão da auditoria: a ficha de parceiros também lia canceladas e mostrava somente pagamento/entrega; filtrar as compras efetivas nessa consulta, mantendo as operações canceladas disponíveis nos orçamentos/vendas para auditoria. Fitness já apresenta a situação correta e exclui canceladas dos totais e do pós-venda.
- Referências: `supabase/tests/cancelled_purchase_history.sql`, `supabase/tests/cancelled_post_sale_draft_rollback.sql`, `tests/post-sale-state.test.cjs`.

### OBS-011 — Contatos, conversão e falta de estoque devem atravessar as filas

- Data: 16/10/2026.
- Contexto: Gestão mostrava 0/12 apesar dos contatos registrados; Vender sugeria recompra de quem acabara de ser chamado. Conversões iniciadas pelo atalho da Company não preservavam o lead original. Venda sem estoque tinha reserva pendente, mas nenhum compromisso urgente de compra.
- Evidência: a meta consultava apenas commercial_contact_attempts. Gestão/Company registravam também feedbacks e customer_interactions. O atalho enviava `lead` na URL, porém NewSalePage ignorava o parâmetro. Elaine e Guilherme tinham um lead original pendente e outro gerado pelo orçamento confirmado.
- Correção: views com security_invoker consolidam contatos por cliente e dia de São Paulo, preservando datas explícitas de retorno; ambas as RPCs da fila usam a mesma meta e pausa. Vender filtra todas as recompras/retornos pela pausa consolidada e atualiza ao retornar à aba. Conversão usa a ação existente que prepara orçamento vinculado; URLs anteriores preservam o lead ao salvar. Confirmação encerra os retornos específicos do lead. Reparação de órfãos limitada a correspondência única no mesmo dia, com produtos/quantidades cobertos pela venda e auditoria.
- Estoque: triggers em reservas e situação da venda mantêm um card urgente por venda com a falta efetiva. Reposição/reserva cobre a pendência; cancelamento a cancela. Não alteram estoque, pagamento ou criam compra de fornecedor. Backfill criou cards das duas vendas atuais sem whey.
- Banco: migrations 20261016183046 e 20261016183328 aplicadas. Contagem consolidada de 55 pessoas em 16/10; Willians pausado até 22/10; somente os dois órfãos identificados reconciliados. CLI indisponível; arquivos usam as versões exatas registradas pelo Supabase.
- Testes: integração transacional com ROLLBACK verifica deduplicação de fontes, retorno explícito, conversão via RPC, encerramento do lead, criação/idempotência da urgência, cobertura e cancelamento. Advisors comparados antes/depois: nenhum ERROR final e mesmos alertas preexistentes; funções internas novas sem EXECUTE para anon/authenticated.
- Status: banco validado; publicação e verificação visual da interface pendentes nesta etapa.

### OBS-011 — Vitrine de descoberta e acesso direto às ações

- Data: 16/10/2026.
- Contexto: responsável autorizou uma segunda Vitrine, preservando a original, e melhorias diretas em Company, Bank e Atletas.
- Mudança: `/catalogo/descobrir` usa as mesmas fontes públicas de estoque, preços, promoções, imagens, tamanhos/cores e encomendas. Coleções por operação, oito disponíveis por vez, favoritos apenas durante a visita e detalhes em diálogo nativo. Indisponíveis ficam recolhidos ao final. O atendimento/compra continua nas páginas existentes; não há nova reserva ou baixa de estoque.
- Operação: filtro textual de ações na Company e nos portais Bank/Atletas; Bank inclui planejamento mensal. Links nativos nesses dois portais eliminam a espera artificial e permitem abrir em outra aba. As demais entradas preservam seu comportamento. Movimento reduzido é respeitado nos cartões da Company.
- Evidência: navegação local com produtos reais conferiu filtros, favorito, detalhes, tamanhos/cores de Fitness, expansão progressiva e layout de 390px sem overflow. Corrigido conflito de tamanho de botões imposto pelo CSS público antigo. Testes de ações usaram montagem local temporária removida antes de publicar, sem contornar autenticação ou alterar registros.
- Verificações gerais: lint completo revelou 92 erros/28 avisos em arquivos anteriores; lint dos arquivos desta alteração é conferido separadamente. Auditoria das dependências existentes apontou Next.js crítico, sharp e source-map-js altos; nenhuma dependência foi adicionada ou atualizada nesta mudança. Atualização de segurança merece trabalho próprio.
- Status: implementação concluída; verificação final de compilação e publicação em andamento. Validação do responsável ainda pendente.

