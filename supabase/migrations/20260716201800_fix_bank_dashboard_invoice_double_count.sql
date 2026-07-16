-- Prevent duplicate subtraction when a card invoice also has a generated charge.
-- Card invoices are represented separately by bank_card_invoices on the Bank dashboard.
create or replace view public.bank_dashboard_summary
with (security_invoker = true)
as
with latest_balances as (
  select distinct on (s.account_id) s.account_id,s.balance,s.balance_date
  from public.bank_balance_snapshots s
  join public.bank_accounts a on a.id=s.account_id
  where a.is_active=true
  order by s.account_id,s.balance_date desc,s.created_at desc
),
charge_totals as (
  select
    coalesce(sum(greatest(c.amount-c.paid_amount,0)) filter (
      where c.status not in ('cancelled','paid') and c.charge_type<>'card_invoice'
        and date_trunc('month',c.due_date)=date_trunc('month',current_date)
    ),0)::numeric(14,2) due_this_month,
    coalesce(sum(greatest(c.amount-c.paid_amount,0)) filter (
      where c.status not in ('cancelled','paid') and c.charge_type<>'card_invoice' and c.due_date<current_date
    ),0)::numeric(14,2) overdue_total,
    coalesce(sum(greatest(c.amount-c.paid_amount,0)) filter (
      where c.status not in ('cancelled','paid') and c.charge_type<>'card_invoice'
        and c.due_date>=current_date and c.due_date<current_date+interval '30 days'
    ),0)::numeric(14,2) next_30_days
  from public.bank_charges c
),
receivable_totals as (
  select
    coalesce(sum(greatest(r.amount-r.received_amount,0)) filter (
      where r.status not in ('cancelled','received') and date_trunc('month',r.due_date)=date_trunc('month',current_date)
    ),0)::numeric(14,2) receivable_this_month,
    coalesce(sum(greatest(r.amount-r.received_amount,0)) filter (
      where r.status not in ('cancelled','received') and r.due_date<current_date
    ),0)::numeric(14,2) receivable_overdue,
    coalesce(sum(greatest(r.amount-r.received_amount,0)) filter (
      where r.status not in ('cancelled','received') and r.due_date>=current_date and r.due_date<current_date+interval '30 days'
    ),0)::numeric(14,2) receivable_next_30_days
  from public.bank_receivables r
),
invoice_totals as (
  select coalesce(sum(i.amount) filter (
    where i.amount is not null and i.status not in ('paid','cancelled')
      and date_trunc('month',i.reference_month)=date_trunc('month',current_date)
  ),0)::numeric(14,2) invoices_this_month
  from public.bank_card_invoices i
),
debt_totals as (
  select coalesce(sum(greatest(d.original_amount-d.total_paid,0)) filter (
    where d.status in ('active','paused')
  ),0)::numeric(14,2) total_debt_remaining
  from public.bank_debts d
)
select
  coalesce((select sum(lb.balance) from latest_balances lb),0)::numeric(14,2) total_balance,
  (select max(lb.balance_date) from latest_balances lb) latest_balance_date,
  ct.due_this_month,ct.overdue_total,ct.next_30_days,it.invoices_this_month,dt.total_debt_remaining,
  (coalesce((select sum(lb.balance) from latest_balances lb),0)-ct.due_this_month-it.invoices_this_month)::numeric(14,2) balance_after_current_month_commitments,
  rt.receivable_this_month,rt.receivable_overdue,rt.receivable_next_30_days,
  (coalesce((select sum(lb.balance) from latest_balances lb),0)+rt.receivable_this_month-ct.due_this_month-it.invoices_this_month)::numeric(14,2) projected_balance_after_current_month
from charge_totals ct cross join receivable_totals rt cross join invoice_totals it cross join debt_totals dt;

grant select on public.bank_dashboard_summary to authenticated,service_role;
