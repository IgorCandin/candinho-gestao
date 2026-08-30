-- V45.54 · postcheck (somente leitura)
select
  to_regclass('public.commercial_route_schedules') is not null as has_route_schedules,
  to_regclass('public.commercial_route_customers') is not null as has_route_customers,
  to_regclass('public.commercial_route_schedule_overview_v1') is not null as has_route_overview,
  to_regclass('public.commercial_route_queue_v1') is not null as has_route_queue;

select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'commercial_schedule_route_v1',
    'commercial_prepare_route_v1',
    'commercial_prepare_due_routes_v1',
    'commercial_route_customer_action_v1'
  )
order by p.proname;

select
  fingerprint,
  route,
  status,
  resolved_at,
  resolution_note
from public.ux_health_signals
where fingerprint in (
  '0f503e9b13ea0490322835b17b6c502f',
  'ac9250a3bf93d684bfcad798da982a0f',
  'dc584151b430e65b106774c282b43335',
  '03947fec8b4b34f9d77392b6375c19d2'
)
order by route;

-- Deve continuar verdadeiro: sales_quotes.payment_due_on é o campo
-- reaproveitado pela revisão de orçamento, sem coluna paralela.
select exists (
  select 1
  from information_schema.columns
  where table_schema='public'
    and table_name='sales_quotes'
    and column_name='payment_due_on'
) as quote_payment_due_on_preserved;
