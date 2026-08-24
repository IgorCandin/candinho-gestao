-- V45.48 TESTES PÓS-MIGRATION · somente leitura
-- Objetivo: validar duplicidade, cooldown, estoque, retorno reagendado e limite diário.

-- 1. A RPC nunca entrega mais de 10 pessoas.
select
  jsonb_array_length(coalesce(public.commercial_contact_queue_people_v1(100)->'items','[]'::jsonb)) <= 10
  as ok_limit_10;

-- 2. Nenhum customer_id aparece duas vezes nos itens da fila.
with q as (
  select x.item->>'customer_id' customer_id
  from jsonb_array_elements(
    coalesce(public.commercial_contact_queue_people_v1(10)->'items','[]'::jsonb)
  ) x(item)
)
select count(*)=count(distinct customer_id) as ok_unique_customer
from q;

-- 3. Cooldown/data futura nunca aparece como ready.
select count(*)=0 as ok_cooldown
from public.commercial_contact_contexts_v2
where state='ready'
  and eligible_on>(now() at time zone 'America/Sao_Paulo')::date;

-- 4. Produto sem estoque não aparece ready em recompra/complementar/retorno com produto.
select count(*)=0 as ok_stock
from public.commercial_contact_contexts_v2 c
left join public.inventory_control_overview i on i.product_id=c.product_id
where c.state='ready'
  and c.source_type in ('repurchase','opportunity','return')
  and c.product_id is not null
  and coalesce(i.available_quantity,0)<=0;

-- 5. Retorno "falar depois"/"ainda usando" com data futura fica aguardando.
select count(*)=0 as ok_rescheduled_return
from public.commercial_contact_contexts_v2 c
where c.source_type='return'
  and c.reference_on>(now() at time zone 'America/Sao_Paulo')::date
  and c.state='ready';

-- 6. Lead stock watch continua preservado.
select
  count(*) as stock_watches_preservados,
  count(*) filter(where status='waiting_stock') as aguardando_estoque,
  count(*) filter(where status='ready_to_contact') as prontos_para_contato
from public.lead_stock_watches
where status in ('waiting_stock','ready_to_contact');

-- 7. Limpeza é idempotente: nenhum item tagueado permanece planejado.
select
  not exists(
    select 1 from public.sale_replenishment_reminders
    where cleanup_tag='legacy_commercial_cleanup_2026_08' and status='planned'
  ) as ok_cleanup_reminders,
  not exists(
    select 1 from public.post_sale_batches
    where cleanup_tag='legacy_commercial_cleanup_2026_08' and status='planned'
  ) as ok_cleanup_post_sale;

-- 8. Lucro oficial dos principais relatórios continua vindo da venda.
select
  pg_get_viewdef('public.sales_history'::regclass,true) like '%s.total_profit%' as sales_history_uses_sale_profit,
  pg_get_viewdef('public.commercial_dashboard_summary'::regclass,true) like '%commercial.total_profit%' as dashboard_uses_sale_profit;

-- 9. Recebíveis intencionais sem data ficam visíveis na pendência.
select count(*) as recebiveis_sem_data_em_atencao
from public.supplement_receivable_attention_v1;

-- 10. UX Doctor: os dois sinais históricos conhecidos devem estar encerrados.
select fingerprint,route,status,resolution_note
from public.ux_health_signals
where fingerprint in (
  '03947fec8b4b34f9d77392b6375c19d2',
  'dc584151b430e65b106774c282b43335'
)
order by route;
