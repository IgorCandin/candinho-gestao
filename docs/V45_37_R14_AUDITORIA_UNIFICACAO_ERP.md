# V45.37.R14 · Auditoria de unificação do ERP

## Resultado

O `main` já centraliza as mutações críticas de venda, pagamento, entrega,
pós-venda, Agenda, compras, estoque, parceiros e Fitness em RPCs de domínio.
A falha transversal encontrada estava na camada Nexus: sinais calculados a partir
dessas entidades ofereciam uma ação chamada **Concluir**, mas ela alterava apenas
`nexus_signals.status`. A pendência empresarial continuava aberta na fonte.

R14 remove essa falsa conclusão dos dois componentes compartilhados que alimentam
Hoje, Meu Dia, fila do Nexus e central de comando. Além disso, a migration impede
que qualquer consumidor antigo resolva manualmente um sinal gerado pelo engine.
O sinal automático só fecha quando a origem deixa de satisfazer a regra e o
pipeline do Nexus o reconcilia.

## Matriz canônica

| Ação real | Fonte de verdade / ação canônica | Telas consumidoras | Automação segura |
|---|---|---|---|
| Converter lead/orçamento em venda | `sales`, `sales_quotes` e fluxo de criação/conversão de venda | Lead, orçamento, nova venda, cliente, Nexus | A fila apenas abre a origem; a conversão atualiza a entidade real |
| Registrar pagamento | `sale_payments` / `sale_payment_installments` via `register_sale_payment` ou `mark_sale_received` | Venda, Agenda, Bank, Hoje/Nexus | Agenda chama a mesma ação canônica; Nexus fecha após reconciliação |
| Finalizar entrega de Suplementos | venda + reservas/movimentos de estoque via fluxo de embalagem/finalização | Venda, Agenda, Hoje/Nexus, sacolas/cartões | Agenda direciona à venda; confirmação de sacola/cartão é obrigatória |
| Concluir pós-venda | `post_sale_batches`, `sales.post_sale_status` e `customer_interactions` via `complete_operational_event` | Pós-venda, Agenda, cliente, Hoje/Nexus | Uma conclusão atualiza lote, vendas e interação |
| Concluir tarefa operacional | `operational_tasks` | Agenda operacional, Agenda global, Central | Componentes compartilhados chamam RPCs de tarefa |
| Receber compra | itens/recebimentos do pedido e movimentos de estoque | Compras, recebimento, estoque, Nexus | Pedido só termina pelo recebimento dos itens; disponibilidade recalcula oportunidades de leads |
| Atribuir parceria/recompensa | `sales.partner_id`, vínculos e funções de parceria | Venda, cliente, parceiro, portal/recompensas | Nexus apenas sugere revisão; não inventa vínculo |
| Finalizar venda/entrega Fitness | RPCs e tabelas `fitness_*` | Venda Fitness, consignação, estoque Fitness | Mantém o domínio Fitness separado; não reutiliza regras de embalagem de Suplementos |
| Encerrar sinal automático | condição derivada da entidade real + refresh do Nexus | Hoje, Meu Dia, fila e comando Nexus | Não existe mais conclusão manual; resolver a origem fecha o sinal |

## Consumidores compartilhados revisados

- `NexusSignalCard`: usado pela central de comando, fila de leads e resumo de Hoje.
- `NexusUnifiedQueue`: usado pela fila Nexus e Meu Dia; o dock também consome o
  mesmo snapshot, sem expor mutação concorrente.
- `OperationalCalendar`: diferencia tarefa, pagamento, entrega, pós-venda e compra
  e chama `complete_operational_event`.
- `CentralGlobalCalendar`: só torna editáveis tarefas operacionais; entidades de
  outros módulos são abertas na origem.
- Ponte Agenda → entrega e `SaleStatusActions`: preservam a confirmação já aprovada
  de sacola/cartão do R13.2.

## Supabase de produção (somente leitura)

- Projeto verificado: `candinho-suplementos`, PostgreSQL 17, saudável.
- A RPC atual de status do Nexus ainda permitia `resolve` para sinais do engine,
  confirmando a divergência entre interface e fonte de verdade.
- A migration R14 foi aplicada em produção após aprovação, sem alterar linhas de
  sinais ou outras entidades empresariais.

## Migration

`20260815123000_v45_37_r14_guard_nexus_entity_completion.sql`

- Bloqueia `resolve` para `generated_by = 'engine'`.
- Preserva adiar, ignorar e reabrir, além de sinais não gerados pelo engine.
- Valida explicitamente as ações aceitas.
- Revoga execução de `PUBLIC` e mantém `authenticated`/`service_role`.

## Riscos remanescentes

- Sinais já resolvidos manualmente no passado não foram reabertos para evitar
  alterações em dados reais; o refresh volta a abrir a condição quando aplicável.
- A migration foi registrada em produção como `20260815140344` e fecha também
  clientes antigos ou chamadas diretas à RPC.
- Não há suíte automatizada de banco no repositório; a validação SQL recomendada é
  executar a migration em branch/local, tentar resolver um sinal `engine` (deve
  falhar) e um sinal não-engine de teste (deve manter o comportamento).
- Mudanças mais amplas em regras de negócio não foram feitas sem evidência concreta,
  preservando os fluxos aprovados de Suplementos e Fitness.

## Validações executadas

- `git diff --check`: aprovado.
- Busca de consumidores compartilhados: aprovado; todos os usos de
  `NexusSignalCard` e `NexusUnifiedQueue` recebem a correção central.
- Inspeção read-only da RPC e dos sinais em produção: confirmou a causa raiz.
- Typecheck: tentado, mas inconclusivo porque o download de `next` e do binário SWC
  expirou duas vezes. A execução parcial do TypeScript falhou por dependências não
  vinculadas, não por diagnóstico dos quatro arquivos R14.
- Build e lint: não executados pelo mesmo bloqueio de instalação.
- Verificação SQL em produção: migration registrada, trava presente na definição,
  `anon` sem execução e `authenticated`/`service_role` com acesso esperado.
- Advisors de segurança e performance executados; não surgiu alerta novo causado
  pela R14. Permanecem alertas preexistentes de views, policies e índices legados.

## Commit sugerido

`V45.37.R14 - unifica Nexus com fontes reais do ERP`
