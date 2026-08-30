-- V45.54 · precheck (somente leitura)
select
  to_regclass('public.customers') is not null as has_customers,
  to_regclass('public.customer_interactions') is not null as has_customer_interactions,
  to_regclass('public.sales_quotes') is not null as has_sales_quotes,
  to_regclass('public.ux_health_signals') is not null as has_ux_health_signals;

select exists (
  select 1
  from information_schema.columns
  where table_schema='public'
    and table_name='sales_quotes'
    and column_name='payment_due_on'
    and data_type='date'
) as quote_has_payment_due_on;

select
  fingerprint,
  route,
  signal_type,
  status,
  occurrence_count,
  last_seen_at
from public.ux_health_signals
where fingerprint in (
  '0f503e9b13ea0490322835b17b6c502f',
  'ac9250a3bf93d684bfcad798da982a0f',
  'dc584151b430e65b106774c282b43335',
  '03947fec8b4b34f9d77392b6375c19d2'
)
order by route;
