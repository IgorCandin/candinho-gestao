# V30 · Auditoria técnica de logística reversa

## Objetivo

Criar uma camada explícita entre:

`cliente devolveu`

e

`item voltou ao estoque`

Esses eventos não são equivalentes.

## Invariantes

1. Nenhum retorno nasce sem venda original entregue.
2. Quantidade solicitada não pode exceder a quantidade vendida ainda elegível.
3. Recebimento físico não movimenta estoque.
4. Somente disposição `restock` movimenta estoque.
5. Quarentena, descarte e devolução ao fornecedor ficam fora do estoque vendável.
6. Reembolso não é considerado pago apenas porque a ocorrência foi resolvida.
7. Bank é a fonte de verdade do pagamento do reembolso.
8. Ocorrência com estoque já movimentado não pode ser cancelada silenciosamente.

## Suplementos

Restock usa `inventory_movements`.

Para produto rastreado por lote:

- tenta identificar lote único usado na venda original;
- aceita seleção explícita de lote;
- preserva lote/validade quando conhecidos.

Para estoque legado sem lote:

- o retorno pode continuar como untracked;
- nenhum lote é inventado.

## Fitness

Restock usa:

`fitness_inventory_movements`

movement_type:

`return_in`

A variação original é preservada.

## Reembolso

RPC:

`schedule_return_refund_in_bank`

chama o fluxo seguro já existente:

`bank_create_charge`

Portanto continua respeitando:

`can_write_bank()`

Usuário sem escrita no Bank não consegue criar a cobrança.

## RLS / Grants

Tabelas:

- return_cases
- return_case_items
- return_case_events

Direct DML para authenticated/anon:

- INSERT: revogado
- UPDATE: revogado
- DELETE: revogado
- TRUNCATE: revogado

Leitura:

- condicionada ao acesso Suplementos/Fitness.

## RPCs verificadas no banco

- close_return_case
- create_return_case
- receive_return_case
- resolve_return_case
- returns_center_snapshot
- schedule_return_refund_in_bank

Resultado:

- security_definer = true
- search_path = public
- authenticated_execute = true
- anon_execute = false

## Dados

A criação da estrutura não gerou ocorrências antigas.

`return_cases = 0`

Base elegível observada:

- Fitness: 58 vendas / 59 unidades
- Suplementos: 280 vendas / 280 unidades

## Meta

Sem alterações nas Edge Functions da Meta.
