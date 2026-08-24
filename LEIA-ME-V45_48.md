# PACOTÃO ERP V45.48 — Backend Comercial + V45.47

Este ZIP já inclui o pacote que você ainda não extraiu:

`V45.47 corrige favicon oficial e entrega com custo real`

e acrescenta o backend comercial V45.48.

## Escopo V45.48

- higienização histórica idempotente sem apagar dados;
- fila comercial única por cliente;
- máximo de 10 pessoas na fila;
- prioridade: retorno vencido → recompra → lead → pós-venda → complementar;
- cooldown e `next_eligible_on`;
- respeito a exclusões/automação/contato perdido;
- oportunidades sem estoque ficam aguardando;
- `lead_stock_watches` preservados;
- retornos `later/still_using` voltam sem duplicar oportunidade/tarefa;
- recebível novo/editado exige vencimento ou justificativa explícita `sem data combinada`;
- exceção sem data cria pendência em `operational_tasks`;
- lucro do relatório de estoque usa o lucro final da venda após desconto;
- fecha apenas os dois sinais históricos exatos do UX Doctor;
- nenhum redesign.

## Segurança

A V45.48 NÃO foi aplicada em produção na preparação deste ZIP.
A única migration do conjunto que já tinha sido aplicada antes é a correção V45.47 de custo da entrega,
pois ela foi corrigida no incidente anterior. Ela segue no repositório para manter histórico/migrations alinhados.

A migration comercial não altera automaticamente:
- valores de vendas antigas;
- vencimentos antigos;
- pagamentos;
- entregas;
- estoque;
- clientes;
- interações históricas.

## Ordem de revisão

1. Extraia na raiz do `candinho-gestao`.
2. Veja os arquivos novos no GitHub Desktop.
3. Antes do deploy, rode apenas:
   `supabase/tests/V45_48_PRECHECK_READONLY.sql`
4. Revise o relatório:
   `reports/V45_48_PREVIEW_ANTES_DEPOIS.md`
5. Commit/push.
6. Depois do deploy/migration, rode:
   `supabase/tests/V45_48_POST_MIGRATION_TESTS.sql`

## Commit sugerido

`V45.48 higieniza backend comercial e consolida V45.47`
