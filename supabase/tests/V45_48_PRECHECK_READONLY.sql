-- V45.48 PRECHECK · somente leitura
-- Rode antes da migration para revisar o impacto. Não altera nenhum dado.

select 'constraints' bloco, conrelid::regclass::text tabela, conname, pg_get_constraintdef(oid) definicao
from pg_constraint
where connamespace='public'::regnamespace
  and conrelid in (
    'public.sale_replenishment_reminders'::regclass,
    'public.post_sale_batches'::regclass,
    'public.commercial_contact_attempts'::regclass,
    'public.customer_sales_opportunity_feedback'::regclass
  )
order by tabela,conname;

with latest_attempt as (
  select distinct on (source_type,source_id)
    source_type,source_id,next_eligible_on,occurred_at
  from public.commercial_contact_attempts
  order by source_type,source_id,occurred_at desc,id desc
),
old_reminders as (
  select r.id
  from public.sale_replenishment_reminders r
  left join public.operational_tasks t on t.id=r.task_id
  join public.customers c on c.id=r.customer_id
  left join latest_attempt a on a.source_type='repurchase' and a.source_id=r.id
  where r.status='planned'
    and r.due_on<'2026-08-01'::date
    and coalesce(c.next_contact_at,'1900-01-01'::date)<=current_date
    and coalesce(a.next_eligible_on,'1900-01-01'::date)<=current_date
    and coalesce(t.queue_not_before_on,'1900-01-01'::date)<=current_date
    and coalesce((t.due_at at time zone 'America/Sao_Paulo')::date,'1900-01-01'::date)<=current_date
),
old_post as (
  select b.id
  from public.post_sale_batches b
  join public.customers c on c.id=b.customer_id
  where b.status='planned'
    and b.due_on<'2026-08-01'::date
    and coalesce(c.next_contact_at,'1900-01-01'::date)<=current_date
)
select
  (select count(*) from public.sale_replenishment_reminders where status='planned') lembretes_planejados,
  (select count(*) from public.sale_replenishment_reminders where status='planned' and due_on<current_date) lembretes_vencidos,
  (select count(*) from old_reminders) lembretes_candidatos_limpeza,
  (select count(*) from public.post_sale_batches where status='planned') pos_vendas_planejados,
  (select count(*) from old_post) pos_vendas_candidatos_limpeza,
  (select count(*) from public.customer_sales_opportunities_actionable_v2) oportunidades_acionaveis,
  (select count(*) from public.customer_sales_opportunities_actionable_v2 where expected_action_on<current_date) oportunidades_vencidas,
  (select count(*) from public.customer_sales_opportunities_actionable_v2 where priority='Alta') oportunidades_alta,
  (select count(*) from public.lead_stock_watches where status in ('waiting_stock','ready_to_contact')) stock_watches_ativos;
