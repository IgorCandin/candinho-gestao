# V24 · Bank Write Closure Audit

## Estado antes da V24

A V23 migrou as escritas diretas do frontend para 13 novas RPCs seguras.

Antes de fechar os grants, a auditoria encontrou quatro RPCs antigas que ainda
alteravam tabelas Bank como `SECURITY INVOKER`:

- bank_mark_charge_paid
- bank_pay_debt_installment
- bank_postpone_debt_payment
- bank_receive_receivable

Além disso, `bank_mark_charge_paid` verificava apenas `can_access_bank()`.
Isso permitia que um perfil com acesso de leitura ao Bank tentasse marcar uma
cobrança como paga.

## Correções

As quatro RPCs passaram a operar como `SECURITY DEFINER`.

Todas mantêm:

- owner postgres;
- search_path = public;
- EXECUTE para authenticated;
- EXECUTE para service_role;
- sem EXECUTE para anon.

`bank_mark_charge_paid` agora exige `can_write_bank()`.

## Grants fechados

O role `authenticated` perdeu INSERT / UPDATE / DELETE direto em:

- bank_accounts
- bank_balance_snapshots
- bank_card_invoices
- bank_cards
- bank_charges
- bank_debt_payments
- bank_debts
- bank_income_sources
- bank_month_closures
- bank_month_commitment_resolutions
- bank_receivables
- bank_subscriptions

## Validação pós-migration

As 12 tabelas retornaram:

- SELECT = true
- INSERT = false
- UPDATE = false
- DELETE = false

A varredura final retornou:

`0 funções bank_* mutadoras executando como SECURITY INVOKER`

Portanto, o Candinho Bank agora segue o mesmo princípio de segurança aplicado
em Suplementos, Fitness e Test Lab:

**leitura direta sujeita a RLS + escrita por RPCs autorizadas.**
