-- Inclui o estoque de insumos no patrimônio total do Bank sem misturá-lo
-- ao estoque de produtos de Suplementos ou Fitness.
create or replace function public.bank_get_company_patrimony()
returns table(
  total_cash_balance numeric,
  company_cash_balance numeric,
  supplements_stock_cost numeric,
  supplements_stock_sale_value numeric,
  fitness_stock_cost numeric,
  fitness_stock_sale_value numeric,
  total_inventory_cost numeric,
  bank_receivables numeric,
  operation_receivables numeric,
  total_receivables numeric,
  company_debt_remaining numeric,
  total_debt_remaining numeric,
  operational_net_position numeric,
  total_net_position numeric
)
language sql
stable security definer
set search_path=public
as $$
with base as (
  select * from public.bank_get_company_patrimony_legacy_base()
), corrected as (
  select (
    coalesce((
      select sum(r.amount)
      from public.supplement_sale_receivable_schedule r
      join public.sales s on s.id=r.sale_id
      left join public.customers c on c.id=s.customer_id
      where coalesce(c.name,'') not in('Igor Candinho','Brinde')
    ),0)
    +coalesce((
      select sum(total_amount)
      from public.fitness_sales
      where general_status<>'cancelled'
        and payment_status='receivable'
    ),0)
  )::numeric(14,2) as amount
), supplies as (
  select coalesce(
    sum(greatest(quantity_on_hand,0)*average_unit_cost),0
  )::numeric(14,2) as amount
  from public.operational_supplies
  where active
)
select
  b.total_cash_balance,
  b.company_cash_balance,
  b.supplements_stock_cost,
  b.supplements_stock_sale_value,
  b.fitness_stock_cost,
  b.fitness_stock_sale_value,
  (b.total_inventory_cost+os.amount)::numeric(14,2),
  b.bank_receivables,
  c.amount,
  (b.bank_receivables+c.amount)::numeric(14,2),
  b.company_debt_remaining,
  b.total_debt_remaining,
  (b.operational_net_position-b.operation_receivables+c.amount+os.amount)::numeric(14,2),
  (b.total_net_position-b.operation_receivables+c.amount+os.amount)::numeric(14,2)
from base b cross join corrected c cross join supplies os;
$$;

revoke all on function public.bank_get_company_patrimony() from public,anon;
grant execute on function public.bank_get_company_patrimony()
to authenticated,service_role;
