-- Candinho Company · Bank V39.4
-- Reconstrói SOMENTE o mapa histórico visual dos empréstimos Ian e Sicoob CNPJ
-- a partir dos prints do sistema antigo enviados em 04/08/2026.
--
-- IMPORTANTE:
-- - NÃO soma dinheiro ao total pago.
-- - NÃO altera o saldo restante.
-- - NÃO cria novas parcelas.
-- - Apenas registra quais competências antigas já estavam pagas e corrige
--   a data inicial usada pelo calendário.
--
-- O total pago atual já está correto no Bank:
-- Ian = R$ 2.800,00 (14 parcelas de R$ 200,00)
-- Sicoob CNPJ = R$ 2.093,00 (5 parcelas de R$ 418,60)

begin;

-- Ian: o sistema antigo começa em 09/2024.
update public.bank_debts
set
  start_date = case
    when start_date is null or start_date > date '2024-09-01'
      then date '2024-09-01'
    else start_date
  end,
  updated_at = now()
where lower(name) = lower('Empréstimo Ian')
  and debt_type = 'loan';

with target as (
  select id
  from public.bank_debts
  where lower(name) = lower('Empréstimo Ian')
    and debt_type = 'loan'
  order by created_at
  limit 1
),
paid_months(reference_month, amount) as (
  values
    (date '2024-09-01', 200.00::numeric),
    (date '2024-10-01', 200.00::numeric),
    (date '2024-11-01', 200.00::numeric),
    (date '2024-12-01', 200.00::numeric),
    (date '2025-01-01', 200.00::numeric),
    (date '2025-02-01', 200.00::numeric),
    (date '2025-05-01', 200.00::numeric),
    (date '2025-06-01', 200.00::numeric),
    (date '2025-07-01', 200.00::numeric),
    (date '2025-09-01', 200.00::numeric),
    (date '2025-11-01', 200.00::numeric),
    (date '2026-01-01', 200.00::numeric),
    (date '2026-02-01', 200.00::numeric),
    (date '2026-07-01', 200.00::numeric)
)
insert into public.bank_month_commitment_resolutions(
  commitment_key,
  reference_month,
  resolution,
  amount_override,
  resolved_on,
  notes,
  created_by,
  updated_at
)
select
  'debt:' || target.id::text,
  paid_months.reference_month,
  'paid',
  paid_months.amount,
  null,
  'V39.4 · Histórico importado do sistema anterior a partir do print fornecido pelo usuário.',
  null,
  now()
from target
cross join paid_months
on conflict (commitment_key, reference_month) do nothing;

-- Sicoob CNPJ: parcelas do empréstimo do Sicoob. O sistema antigo começa em 03/2026.
update public.bank_debts
set
  start_date = case
    when start_date is null or start_date > date '2026-03-01'
      then date '2026-03-01'
    else start_date
  end,
  updated_at = now()
where lower(name) = lower('Sicoob CNPJ')
  and debt_type = 'loan';

with target as (
  select id
  from public.bank_debts
  where lower(name) = lower('Sicoob CNPJ')
    and debt_type = 'loan'
  order by created_at
  limit 1
),
paid_months(reference_month, amount) as (
  values
    (date '2026-03-01', 418.60::numeric),
    (date '2026-04-01', 418.60::numeric),
    (date '2026-05-01', 418.60::numeric),
    (date '2026-06-01', 418.60::numeric),
    (date '2026-07-01', 418.60::numeric)
)
insert into public.bank_month_commitment_resolutions(
  commitment_key,
  reference_month,
  resolution,
  amount_override,
  resolved_on,
  notes,
  created_by,
  updated_at
)
select
  'debt:' || target.id::text,
  paid_months.reference_month,
  'paid',
  paid_months.amount,
  null,
  'V39.4 · Histórico importado do sistema anterior a partir do print fornecido pelo usuário.',
  null,
  now()
from target
cross join paid_months
on conflict (commitment_key, reference_month) do nothing;

commit;

-- Conferência: estes valores NÃO são alterados pelo script acima.
select
  name,
  original_amount as total,
  total_paid as pago,
  greatest(original_amount - total_paid, 0) as restante,
  start_date,
  next_due_date
from public.bank_debts
where lower(name) in (
  lower('Empréstimo Ian'),
  lower('Sicoob CNPJ')
)
order by name;
