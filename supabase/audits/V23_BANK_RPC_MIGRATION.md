# V23 · Bank RPC Migration

## Objetivo

Remover a dependência do frontend de INSERT / UPDATE / DELETE direto nas
tabelas principais do Candinho Bank antes de fechar os grants dessas tabelas.

## Backend aplicado em produção

Foram criadas 13 RPCs:

1. `bank_save_balances`
2. `bank_create_account`
3. `bank_create_card`
4. `bank_save_card_invoices`
5. `bank_create_debt`
6. `bank_create_charge`
7. `bank_create_subscription`
8. `bank_toggle_subscription`
9. `bank_create_income_source`
10. `bank_toggle_income_source`
11. `bank_create_receivable`
12. `bank_mark_commitment_paid`
13. `bank_quick_update`

Validação após criação:

- todas são SECURITY DEFINER;
- todas possuem `search_path=public`;
- `authenticated` possui EXECUTE;
- `service_role` possui EXECUTE;
- `anon` não possui EXECUTE.

## Frontend migrado

As seguintes Server Actions deixam de gravar tabelas Bank diretamente:

- `bank/contas/actions.ts`
- `bank/faturas/actions.ts`
- `bank/emprestimos/actions.ts`
- `bank/cobrancas/actions.ts`
- `bank/mensalidades/actions.ts`
- `bank/entradas/actions.ts`
- `bank/actions.ts`
- `bank/atualizar/actions.ts`

As operações existentes que já usavam RPCs continuam usando as RPCs antigas:

- `bank_pay_debt_installment`
- `bank_postpone_debt_payment`
- `bank_mark_charge_paid`
- `bank_receive_receivable`

## Bug corrigido

A interface aceitava o ciclo `annual` para mensalidades, enquanto a constraint
do banco usa `yearly`.

A nova RPC `bank_create_subscription` aceita `annual` da interface e normaliza
para `yearly` antes do INSERT.

## O que ainda NÃO foi feito

Os grants INSERT / UPDATE / DELETE das tabelas Bank continuam ativos nesta
fase, para manter compatibilidade com a V22 enquanto o frontend V23 ainda não
estiver publicado.

Depois que o commit V23 estiver READY na Vercel e sem erros de runtime, a
próxima migration poderá revogar a escrita direta das tabelas Bank.
