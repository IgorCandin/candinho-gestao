-- Candinho Company · Bank V39.5
-- Corrige a leitura histórica do Empréstimo Ian:
-- meses vermelhos do sistema antigo eram ADIADOS, não parcelas pendentes.
--
-- Este script NÃO altera:
-- - total pago;
-- - saldo restante;
-- - próxima parcela atual;
-- - valor da parcela.
--
-- Ele apenas grava no histórico quais meses antigos foram adiados.
-- O botão "Adiar" atual do Bank já move next_due_date exatamente +1 mês.

begin;

with target as (
  select id
  from public.bank_debts
  where lower(name) = lower('Empréstimo Ian')
    and debt_type = 'loan'
  order by created_at
  limit 1
),
postponed_months(due_date) as (
  values
    (date '2025-03-01'),
    (date '2025-04-01'),
    (date '2025-08-01'),
    (date '2025-10-01'),
    (date '2025-12-01'),
    (date '2026-03-01'),
    (date '2026-04-01'),
    (date '2026-05-01'),
    (date '2026-06-01')
)
insert into public.bank_debt_payments(
  debt_id,
  due_date,
  action_type,
  amount,
  paid_on,
  previous_due_date,
  new_due_date,
  payment_account_id,
  notes,
  created_by
)
select
  target.id,
  postponed_months.due_date,
  'postponed',
  0,
  null,
  postponed_months.due_date,
  (postponed_months.due_date + interval '1 month')::date,
  null,
  'V39.5 · Mês adiado no sistema anterior; parcela empurrada um mês para frente.',
  null
from target
cross join postponed_months
where not exists (
  select 1
  from public.bank_debt_payments existing
  where existing.debt_id = target.id
    and existing.action_type = 'postponed'
    and date_trunc('month', existing.due_date)::date =
        postponed_months.due_date
);

commit;

-- Conferência visual do histórico importado.
select
  d.name,
  p.due_date,
  p.action_type,
  p.new_due_date
from public.bank_debt_payments p
join public.bank_debts d on d.id = p.debt_id
where lower(d.name) = lower('Empréstimo Ian')
  and p.action_type = 'postponed'
order by p.due_date;
