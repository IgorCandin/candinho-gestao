-- V45.48 · Backend Comercial executável + higienização histórica
-- Base: V45.45 + correções V45.47 incluídas neste pacotão.
-- IMPORTANTE: este arquivo NÃO foi aplicado em produção durante a preparação.
-- O deploy da migration deve ocorrer somente após revisão.

begin;

-- ---------------------------------------------------------------------------
-- 0. Preflight estrutural: falhar cedo se a base esperada não existir.
-- ---------------------------------------------------------------------------
do $preflight$
begin
  if to_regclass('public.sale_replenishment_reminders') is null
     or to_regclass('public.post_sale_batches') is null
     or to_regclass('public.commercial_contact_attempts') is null
     or to_regclass('public.customer_sales_opportunity_feedback') is null
     or to_regclass('public.customer_sales_opportunities_actionable_v2') is null
     or to_regclass('public.lead_stock_watches') is null
     or to_regclass('public.inventory_control_overview') is null then
    raise exception 'V45.48 preflight: estrutura comercial esperada não encontrada';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.sale_replenishment_reminders'::regclass
      and conname='sale_replenishment_reminders_status_check'
  ) then
    raise exception 'V45.48 preflight: constraint de status de recompra não encontrada';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.post_sale_batches'::regclass
      and conname='post_sale_batches_status_check'
  ) then
    raise exception 'V45.48 preflight: constraint de status de pós-venda não encontrada';
  end if;
end
$preflight$;

-- ---------------------------------------------------------------------------
-- 1. Metadados de limpeza: preserva histórico e identifica exatamente o motivo.
-- ---------------------------------------------------------------------------
alter table public.sale_replenishment_reminders
  add column if not exists cleanup_tag text,
  add column if not exists cleanup_at timestamptz;

alter table public.post_sale_batches
  add column if not exists cleanup_tag text,
  add column if not exists cleanup_at timestamptz;

create index if not exists sale_replenishment_reminders_cleanup_idx
  on public.sale_replenishment_reminders(cleanup_tag,cleanup_at)
  where cleanup_tag is not null;

create index if not exists post_sale_batches_cleanup_idx
  on public.post_sale_batches(cleanup_tag,cleanup_at)
  where cleanup_tag is not null;

-- ---------------------------------------------------------------------------
-- 2. Higienização idempotente.
--    Não toca vendas, pagamentos, estoque, entregas nem interações.
--    Não encerra registros com reagendamento manual futuro.
-- ---------------------------------------------------------------------------
with candidates as (
  select
    r.id,
    r.sale_id,
    r.product_id,
    r.customer_id,
    r.task_id,
    r.due_on,
    t.status task_status,
    t.due_at task_due_at,
    t.queue_not_before_on,
    c.next_contact_at,
    la.next_eligible_on
  from public.sale_replenishment_reminders r
  left join public.operational_tasks t on t.id=r.task_id
  join public.customers c on c.id=r.customer_id
  left join lateral (
    select a.next_eligible_on
    from public.commercial_contact_attempts a
    where a.source_type='repurchase'
      and a.source_id=r.id
    order by a.occurred_at desc,a.id desc
    limit 1
  ) la on true
  left join lateral (
    select f.feedback_status,f.next_action_on
    from public.customer_sales_opportunity_feedback f
    where f.customer_id=r.customer_id
      and f.recommended_product_id is not distinct from r.product_id
    order by f.created_at desc,f.id desc
    limit 1
  ) lf on true
  where r.status='planned'
    and r.due_on<'2026-08-01'::date
    and r.cleanup_tag is null
    and coalesce(c.next_contact_at,'1900-01-01'::date)
        <=(now() at time zone 'America/Sao_Paulo')::date
    and coalesce(la.next_eligible_on,'1900-01-01'::date)
        <=(now() at time zone 'America/Sao_Paulo')::date
    and coalesce(t.queue_not_before_on,'1900-01-01'::date)
        <=(now() at time zone 'America/Sao_Paulo')::date
    and coalesce(
      (t.due_at at time zone 'America/Sao_Paulo')::date,
      '1900-01-01'::date
    ) <=(now() at time zone 'America/Sao_Paulo')::date
    and not (
      lf.feedback_status in ('later','still_using')
      and lf.next_action_on>(now() at time zone 'America/Sao_Paulo')::date
    )
)
insert into public.audit_events(entity_type,entity_id,action,details)
select
  'sale_replenishment_reminder',
  x.id,
  'legacy_commercial_cleanup',
  jsonb_build_object(
    'cleanup_tag','legacy_commercial_cleanup_2026_08',
    'due_on_before',x.due_on,
    'sale_id',x.sale_id,
    'product_id',x.product_id,
    'customer_id',x.customer_id,
    'task_id',x.task_id,
    'task_status_before',x.task_status,
    'task_due_at_before',x.task_due_at,
    'task_queue_not_before_before',x.queue_not_before_on,
    'customer_next_contact_before',x.next_contact_at,
    'latest_attempt_next_eligible_before',x.next_eligible_on
  )
from candidates x
where not exists (
  select 1
  from public.audit_events a
  where a.entity_type='sale_replenishment_reminder'
    and a.entity_id=x.id
    and a.action='legacy_commercial_cleanup'
    and a.details->>'cleanup_tag'='legacy_commercial_cleanup_2026_08'
);

update public.sale_replenishment_reminders r
set
  status='cancelled',
  cleanup_tag='legacy_commercial_cleanup_2026_08',
  cleanup_at=now(),
  updated_at=now()
where r.status='planned'
  and r.due_on<'2026-08-01'::date
  and r.cleanup_tag is null
  and exists (
    select 1
    from public.customers c
    left join public.operational_tasks t on t.id=r.task_id
    left join lateral (
      select a.next_eligible_on
      from public.commercial_contact_attempts a
      where a.source_type='repurchase'
        and a.source_id=r.id
      order by a.occurred_at desc,a.id desc
      limit 1
    ) la on true
    left join lateral (
      select f.feedback_status,f.next_action_on
      from public.customer_sales_opportunity_feedback f
      where f.customer_id=r.customer_id
        and f.recommended_product_id is not distinct from r.product_id
      order by f.created_at desc,f.id desc
      limit 1
    ) lf on true
    where c.id=r.customer_id
      and coalesce(c.next_contact_at,'1900-01-01'::date)
          <=(now() at time zone 'America/Sao_Paulo')::date
      and coalesce(la.next_eligible_on,'1900-01-01'::date)
          <=(now() at time zone 'America/Sao_Paulo')::date
      and coalesce(t.queue_not_before_on,'1900-01-01'::date)
          <=(now() at time zone 'America/Sao_Paulo')::date
      and coalesce(
        (t.due_at at time zone 'America/Sao_Paulo')::date,
        '1900-01-01'::date
      ) <=(now() at time zone 'America/Sao_Paulo')::date
      and not (
        lf.feedback_status in ('later','still_using')
        and lf.next_action_on>(now() at time zone 'America/Sao_Paulo')::date
      )
  );

update public.operational_tasks t
set
  status='cancelled',
  cancelled_at=coalesce(cancelled_at,now()),
  updated_at=now(),
  notes=case
    when coalesce(t.notes,'') like '%[legacy_commercial_cleanup_2026_08]%'
      then t.notes
    else concat_ws(E'\n',t.notes,'[legacy_commercial_cleanup_2026_08] Recompra automática histórica encerrada.')
  end
from public.sale_replenishment_reminders r
where r.task_id=t.id
  and r.cleanup_tag='legacy_commercial_cleanup_2026_08'
  and t.status='planned'
  and t.notes like '[Recompra automática]%';

with candidates as (
  select b.id,b.customer_id,b.due_on,b.notes,c.next_contact_at
  from public.post_sale_batches b
  join public.customers c on c.id=b.customer_id
  left join lateral (
    select f.feedback_status,f.next_action_on
    from public.customer_sales_opportunity_feedback f
    where f.customer_id=b.customer_id
    order by f.created_at desc,f.id desc
    limit 1
  ) lf on true
  where b.status='planned'
    and b.due_on<'2026-08-01'::date
    and b.cleanup_tag is null
    and coalesce(c.next_contact_at,'1900-01-01'::date)
        <=(now() at time zone 'America/Sao_Paulo')::date
    and not (
      lf.feedback_status in ('later','still_using')
      and lf.next_action_on>(now() at time zone 'America/Sao_Paulo')::date
    )
)
insert into public.audit_events(entity_type,entity_id,action,details)
select
  'post_sale_batch',
  x.id,
  'legacy_commercial_cleanup',
  jsonb_build_object(
    'cleanup_tag','legacy_commercial_cleanup_2026_08',
    'customer_id',x.customer_id,
    'due_on_before',x.due_on,
    'notes_before',x.notes,
    'customer_next_contact_before',x.next_contact_at
  )
from candidates x
where not exists (
  select 1 from public.audit_events a
  where a.entity_type='post_sale_batch'
    and a.entity_id=x.id
    and a.action='legacy_commercial_cleanup'
    and a.details->>'cleanup_tag'='legacy_commercial_cleanup_2026_08'
);

update public.post_sale_batches b
set
  status='cancelled',
  cancelled_at=coalesce(cancelled_at,now()),
  cleanup_tag='legacy_commercial_cleanup_2026_08',
  cleanup_at=now(),
  updated_at=now(),
  notes=case
    when coalesce(b.notes,'') like '%[legacy_commercial_cleanup_2026_08]%'
      then b.notes
    else concat_ws(E'\n',b.notes,'[legacy_commercial_cleanup_2026_08] Pós-venda histórico encerrado.')
  end
where b.status='planned'
  and b.due_on<'2026-08-01'::date
  and b.cleanup_tag is null
  and exists (
    select 1
    from public.customers c
    left join lateral (
      select f.feedback_status,f.next_action_on
      from public.customer_sales_opportunity_feedback f
      where f.customer_id=b.customer_id
      order by f.created_at desc,f.id desc
      limit 1
    ) lf on true
    where c.id=b.customer_id
      and coalesce(c.next_contact_at,'1900-01-01'::date)
          <=(now() at time zone 'America/Sao_Paulo')::date
      and not (
        lf.feedback_status in ('later','still_using')
        and lf.next_action_on>(now() at time zone 'America/Sao_Paulo')::date
      )
  );

-- ---------------------------------------------------------------------------
-- 3. A tabela de tentativas passa a aceitar os contextos já existentes
--    no backend comercial, sem criar uma central paralela.
-- ---------------------------------------------------------------------------
alter table public.commercial_contact_attempts
  drop constraint if exists commercial_contact_attempts_source_type_check;

alter table public.commercial_contact_attempts
  add constraint commercial_contact_attempts_source_type_check
  check (source_type in ('repurchase','lead','return','post_sale','opportunity'));

create index if not exists commercial_contact_attempts_eligibility_idx
  on public.commercial_contact_attempts(customer_id,next_eligible_on,occurred_at desc);

-- ---------------------------------------------------------------------------
-- 4. Camada única de contextos comerciais.
-- ---------------------------------------------------------------------------
create or replace view public.commercial_contact_contexts_v2
with (security_invoker=true)
as
with
today as (
  select (now() at time zone 'America/Sao_Paulo')::date as d
),
latest_attempt as (
  select distinct on (a.source_type,a.source_id)
    a.source_type,a.source_id,a.action,a.occurred_at,a.next_eligible_on
  from public.commercial_contact_attempts a
  order by a.source_type,a.source_id,a.occurred_at desc,a.id desc
),
latest_feedback as (
  select distinct on (
    f.customer_id,
    coalesce(f.recommended_product_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(f.opportunity_group,''),
    coalesce(f.opportunity_subtype,'')
  )
    f.*
  from public.customer_sales_opportunity_feedback f
  order by
    f.customer_id,
    coalesce(f.recommended_product_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(f.opportunity_group,''),
    coalesce(f.opportunity_subtype,''),
    f.created_at desc,
    f.id desc
),
lead_items as (
  select
    l.id lead_id,
    (array_agg(si.product_id order by si.id) filter (where si.product_id is not null))[1] product_id,
    string_agg(
      p.name||case when si.quantity>1 then ' ×'||si.quantity::text else '' end,
      ', ' order by p.name
    ) filter (where p.name is not null) product_summary
  from public.sales l
  left join public.sale_items si on si.sale_id=l.id
  left join public.products p on p.id=si.product_id
  where l.record_type='lead'
  group by l.id
),
lead_due as (
  select
    l.id lead_id,
    min(ci.due_at) filter (where ci.status='planned') explicit_due_on
  from public.sales l
  left join public.customer_interactions ci
    on ci.sale_id=l.id
    or ci.notes like ('[Lead:'||l.id::text||']%')
  where l.record_type='lead'
  group by l.id
),
post_sale_products as (
  select
    b.id batch_id,
    min(bs.sale_id) sale_id,
    coalesce(string_agg(distinct p.name,', ' order by p.name),'Pós-venda') product_summary
  from public.post_sale_batches b
  left join public.post_sale_batch_sales bs on bs.batch_id=b.id
  left join public.sale_items si on si.sale_id=bs.sale_id
  left join public.products p on p.id=si.product_id
  group by b.id
),
repurchase as (
  select
    'repurchase:'||r.id::text queue_key,
    'repurchase'::text source_type,
    r.id source_id,
    r.customer_id,
    c.name customer_name,
    coalesce(c.phone,s.phone) phone,
    coalesce(c.city,s.city) city,
    r.product_id,
    p.name product_name,
    coalesce(inv.available_quantity,0)::integer stock_quantity,
    'Recompra prevista'::text reason,
    case
      when la.action='contacted'
       and coalesce(la.next_eligible_on,today.d)<=today.d
        then 'response_check'
      else 'contact'
    end::text stage,
    2::integer priority_rank,
    r.due_on reference_on,
    greatest(
      r.due_on,
      coalesce(c.next_contact_at,'1900-01-01'::date),
      coalesce(la.next_eligible_on,'1900-01-01'::date),
      coalesce(t.queue_not_before_on,'1900-01-01'::date),
      coalesce((t.due_at at time zone 'America/Sao_Paulo')::date,'1900-01-01'::date)
    ) eligible_on,
    la.action last_action,
    la.occurred_at last_attempt_at,
    coalesce(s.delivered_at,s.quoted_at,s.created_at)::date last_purchase_on,
    r.due_on estimated_due_on,
    null::text lead_status,
    null::text reference,
    'Produto dentro da janela real de reposição.'::text source_notes,
    '/clientes/'||r.customer_id::text href,
    r.created_at source_created_at,
    s.id sale_id,
    case
      when not c.active
        or c.contact_lost
        or not c.crm_automation_enabled
        or not c.sales_radar_enabled
        or nullif(btrim(coalesce(c.crm_exclusion_reason,'')),'') is not null
        or lower(coalesce(c.crm_status,'')) in ('inactive','lost','excluded')
        then 'excluded'
      when greatest(
        r.due_on,
        coalesce(c.next_contact_at,'1900-01-01'::date),
        coalesce(la.next_eligible_on,'1900-01-01'::date),
        coalesce(t.queue_not_before_on,'1900-01-01'::date),
        coalesce((t.due_at at time zone 'America/Sao_Paulo')::date,'1900-01-01'::date)
      ) > today.d
        then 'waiting_date'
      when not p.active or p.restricted or coalesce(inv.available_quantity,0)<=0
        then 'waiting_stock'
      else 'ready'
    end::text state,
    case
      when not c.active or c.contact_lost then 'customer_unavailable'
      when not c.crm_automation_enabled or not c.sales_radar_enabled then 'automation_disabled'
      when nullif(btrim(coalesce(c.crm_exclusion_reason,'')),'') is not null then 'commercial_exclusion'
      when greatest(
        r.due_on,
        coalesce(c.next_contact_at,'1900-01-01'::date),
        coalesce(la.next_eligible_on,'1900-01-01'::date),
        coalesce(t.queue_not_before_on,'1900-01-01'::date),
        coalesce((t.due_at at time zone 'America/Sao_Paulo')::date,'1900-01-01'::date)
      ) > today.d then 'future_or_cooldown'
      when not p.active or p.restricted then 'product_unavailable'
      when coalesce(inv.available_quantity,0)<=0 then 'stock_unavailable'
      else 'eligible'
    end::text state_reason
  from public.sale_replenishment_reminders r
  join public.sales s on s.id=r.sale_id
  join public.customers c on c.id=r.customer_id
  join public.products p on p.id=r.product_id
  left join public.operational_tasks t on t.id=r.task_id
  left join public.inventory_control_overview inv on inv.product_id=r.product_id
  left join latest_attempt la
    on la.source_type='repurchase' and la.source_id=r.id
  cross join today
  where r.status='planned'
    and r.cleanup_tag is null
    and not exists (
      select 1
      from public.sales s2
      join public.sale_items si2 on si2.sale_id=s2.id
      where s2.record_type='sale'
        and s2.general_status<>'cancelled'
        and s2.customer_id=r.customer_id
        and si2.product_id=r.product_id
        and coalesce(s2.delivered_at,s2.quoted_at,s2.created_at)
            >coalesce(s.delivered_at,s.quoted_at,s.created_at)
    )
),
returns as (
  select
    'return:'||f.id::text queue_key,
    'return'::text source_type,
    f.id source_id,
    f.customer_id,
    c.name customer_name,
    c.phone,
    c.city,
    f.recommended_product_id product_id,
    coalesce(p.name,'Retorno agendado') product_name,
    coalesce(inv.available_quantity,0)::integer stock_quantity,
    case f.feedback_status
      when 'later' then 'Pediu para falar depois'
      else 'Ainda estava usando'
    end::text reason,
    case
      when la.action='contacted'
       and coalesce(la.next_eligible_on,today.d)<=today.d
        then 'response_check'
      else 'contact'
    end::text stage,
    1::integer priority_rank,
    coalesce(
      f.next_action_on,
      (f.created_at at time zone 'America/Sao_Paulo')::date
        +case when f.feedback_status='still_using' then 14 else 7 end
    ) reference_on,
    greatest(
      coalesce(
        f.next_action_on,
        (f.created_at at time zone 'America/Sao_Paulo')::date
          +case when f.feedback_status='still_using' then 14 else 7 end
      ),
      coalesce(c.next_contact_at,'1900-01-01'::date),
      coalesce(la.next_eligible_on,'1900-01-01'::date)
    ) eligible_on,
    la.action last_action,
    la.occurred_at last_attempt_at,
    null::date last_purchase_on,
    null::date estimated_due_on,
    'Retorno agendado'::text lead_status,
    null::text reference,
    concat_ws(' · ',f.notes,'Retorno originado do último feedback comercial.') source_notes,
    '/clientes/'||f.customer_id::text href,
    f.created_at source_created_at,
    null::uuid sale_id,
    case
      when not c.active
        or c.contact_lost
        or not c.crm_automation_enabled
        or not c.sales_radar_enabled
        or nullif(btrim(coalesce(c.crm_exclusion_reason,'')),'') is not null
        or lower(coalesce(c.crm_status,'')) in ('inactive','lost','excluded')
        then 'excluded'
      when greatest(
        coalesce(
          f.next_action_on,
          (f.created_at at time zone 'America/Sao_Paulo')::date
            +case when f.feedback_status='still_using' then 14 else 7 end
        ),
        coalesce(c.next_contact_at,'1900-01-01'::date),
        coalesce(la.next_eligible_on,'1900-01-01'::date)
      ) > today.d
        then 'waiting_date'
      when f.recommended_product_id is not null
       and (coalesce(p.active,false)=false or coalesce(p.restricted,false)=true or coalesce(inv.available_quantity,0)<=0)
        then 'waiting_stock'
      else 'ready'
    end::text state,
    case
      when not c.active or c.contact_lost then 'customer_unavailable'
      when not c.crm_automation_enabled or not c.sales_radar_enabled then 'automation_disabled'
      when nullif(btrim(coalesce(c.crm_exclusion_reason,'')),'') is not null then 'commercial_exclusion'
      when greatest(
        coalesce(
          f.next_action_on,
          (f.created_at at time zone 'America/Sao_Paulo')::date
            +case when f.feedback_status='still_using' then 14 else 7 end
        ),
        coalesce(c.next_contact_at,'1900-01-01'::date),
        coalesce(la.next_eligible_on,'1900-01-01'::date)
      ) > today.d then 'future_or_cooldown'
      when f.recommended_product_id is not null
       and (coalesce(p.active,false)=false or coalesce(p.restricted,false)=true)
        then 'product_unavailable'
      when f.recommended_product_id is not null
       and coalesce(inv.available_quantity,0)<=0
        then 'stock_unavailable'
      else 'eligible'
    end::text state_reason
  from latest_feedback f
  join public.customers c on c.id=f.customer_id
  left join public.products p on p.id=f.recommended_product_id
  left join public.inventory_control_overview inv on inv.product_id=f.recommended_product_id
  left join latest_attempt la
    on la.source_type='return' and la.source_id=f.id
  cross join today
  where f.feedback_status in ('later','still_using')
),
leads as (
  select
    'lead:'||l.id::text queue_key,
    'lead'::text source_type,
    l.id source_id,
    l.customer_id,
    c.name customer_name,
    coalesce(c.phone,l.phone) phone,
    coalesce(c.city,l.city) city,
    li.product_id,
    coalesce(li.product_summary,'Interesse sem produto definido') product_name,
    coalesce(inv.available_quantity,0)::integer stock_quantity,
    coalesce(l.lead_status,'Lead')::text reason,
    case
      when la.action='contacted'
       and coalesce(la.next_eligible_on,today.d)<=today.d
        then 'response_check'
      else 'contact'
    end::text stage,
    3::integer priority_rank,
    coalesce(ld.explicit_due_on,(l.created_at at time zone 'America/Sao_Paulo')::date) reference_on,
    greatest(
      coalesce(ld.explicit_due_on,(l.created_at at time zone 'America/Sao_Paulo')::date),
      coalesce(c.next_contact_at,'1900-01-01'::date),
      coalesce(la.next_eligible_on,'1900-01-01'::date)
    ) eligible_on,
    la.action last_action,
    la.occurred_at last_attempt_at,
    null::date last_purchase_on,
    null::date estimated_due_on,
    l.lead_status::text lead_status,
    l.reference::text reference,
    l.notes::text source_notes,
    '/leads/'||l.id::text href,
    l.created_at source_created_at,
    l.id sale_id,
    case
      when not c.active
        or c.contact_lost
        or not c.crm_automation_enabled
        or not c.sales_radar_enabled
        or nullif(btrim(coalesce(c.crm_exclusion_reason,'')),'') is not null
        or lower(coalesce(c.crm_status,'')) in ('inactive','lost','excluded')
        then 'excluded'
      when l.created_at<now()-interval '60 days'
        then 'excluded'
      when greatest(
        coalesce(ld.explicit_due_on,(l.created_at at time zone 'America/Sao_Paulo')::date),
        coalesce(c.next_contact_at,'1900-01-01'::date),
        coalesce(la.next_eligible_on,'1900-01-01'::date)
      ) > today.d
        then 'waiting_date'
      when w.status='waiting_stock'
        then 'waiting_stock'
      when li.product_id is not null
       and (coalesce(p.active,false)=false or coalesce(p.restricted,false)=true or coalesce(inv.available_quantity,0)<=0)
        then 'waiting_stock'
      else 'ready'
    end::text state,
    case
      when not c.active or c.contact_lost then 'customer_unavailable'
      when not c.crm_automation_enabled or not c.sales_radar_enabled then 'automation_disabled'
      when nullif(btrim(coalesce(c.crm_exclusion_reason,'')),'') is not null then 'commercial_exclusion'
      when l.created_at<now()-interval '60 days' then 'legacy_lead'
      when greatest(
        coalesce(ld.explicit_due_on,(l.created_at at time zone 'America/Sao_Paulo')::date),
        coalesce(c.next_contact_at,'1900-01-01'::date),
        coalesce(la.next_eligible_on,'1900-01-01'::date)
      ) > today.d then 'future_or_cooldown'
      when w.status='waiting_stock' then 'lead_stock_watch'
      when li.product_id is not null
       and (coalesce(p.active,false)=false or coalesce(p.restricted,false)=true)
        then 'product_unavailable'
      when li.product_id is not null and coalesce(inv.available_quantity,0)<=0
        then 'stock_unavailable'
      else 'eligible'
    end::text state_reason
  from public.sales l
  join public.customers c on c.id=l.customer_id
  left join lead_items li on li.lead_id=l.id
  left join lead_due ld on ld.lead_id=l.id
  left join public.products p on p.id=li.product_id
  left join public.inventory_control_overview inv on inv.product_id=li.product_id
  left join public.lead_stock_watches w
    on w.lead_id=l.id and w.status in ('waiting_stock','ready_to_contact')
  left join latest_attempt la
    on la.source_type='lead' and la.source_id=l.id
  cross join today
  where l.record_type='lead'
    and l.general_status<>'cancelled'
    and lower(coalesce(l.lead_status,'')) in (
      'está quase comprando','ta quase comprando','cotação','decidindo','perguntou sobre'
    )
),
post_sale as (
  select
    'post_sale:'||b.id::text queue_key,
    'post_sale'::text source_type,
    b.id source_id,
    b.customer_id,
    c.name customer_name,
    c.phone,
    c.city,
    null::uuid product_id,
    psp.product_summary product_name,
    0::integer stock_quantity,
    'Pós-venda atual'::text reason,
    case
      when la.action='contacted'
       and coalesce(la.next_eligible_on,today.d)<=today.d
        then 'response_check'
      else 'contact'
    end::text stage,
    4::integer priority_rank,
    b.due_on reference_on,
    greatest(
      b.due_on,
      coalesce(c.next_contact_at,'1900-01-01'::date),
      coalesce(la.next_eligible_on,'1900-01-01'::date)
    ) eligible_on,
    la.action last_action,
    la.occurred_at last_attempt_at,
    null::date last_purchase_on,
    null::date estimated_due_on,
    'Pós-venda'::text lead_status,
    null::text reference,
    b.notes source_notes,
    '/clientes/'||b.customer_id::text href,
    b.created_at source_created_at,
    psp.sale_id,
    case
      when not c.active
        or c.contact_lost
        or not c.crm_automation_enabled
        or not c.sales_radar_enabled
        or nullif(btrim(coalesce(c.crm_exclusion_reason,'')),'') is not null
        or lower(coalesce(c.crm_status,'')) in ('inactive','lost','excluded')
        then 'excluded'
      when greatest(
        b.due_on,
        coalesce(c.next_contact_at,'1900-01-01'::date),
        coalesce(la.next_eligible_on,'1900-01-01'::date)
      ) > today.d
        then 'waiting_date'
      else 'ready'
    end::text state,
    case
      when not c.active or c.contact_lost then 'customer_unavailable'
      when not c.crm_automation_enabled or not c.sales_radar_enabled then 'automation_disabled'
      when nullif(btrim(coalesce(c.crm_exclusion_reason,'')),'') is not null then 'commercial_exclusion'
      when greatest(
        b.due_on,
        coalesce(c.next_contact_at,'1900-01-01'::date),
        coalesce(la.next_eligible_on,'1900-01-01'::date)
      ) > today.d then 'future_or_cooldown'
      else 'eligible'
    end::text state_reason
  from public.post_sale_batches b
  join public.customers c on c.id=b.customer_id
  left join post_sale_products psp on psp.batch_id=b.id
  left join latest_attempt la
    on la.source_type='post_sale' and la.source_id=b.id
  cross join today
  where b.status='planned'
    and b.cleanup_tag is null
),
opportunities as (
  select
    'opportunity:'||o.customer_id::text||':'||coalesce(o.recommended_product_id::text,'none') queue_key,
    'opportunity'::text source_type,
    o.customer_id source_id,
    o.customer_id,
    c.name customer_name,
    coalesce(c.phone,o.phone) phone,
    coalesce(c.city,o.city) city,
    o.recommended_product_id product_id,
    coalesce(o.recommended_product_name,'Produto complementar') product_name,
    coalesce(inv.available_quantity,0)::integer stock_quantity,
    'Produto complementar'::text reason,
    case
      when la.action='contacted'
       and coalesce(la.next_eligible_on,today.d)<=today.d
        then 'response_check'
      else 'contact'
    end::text stage,
    5::integer priority_rank,
    o.expected_action_on reference_on,
    greatest(
      coalesce(o.expected_action_on,'1900-01-01'::date),
      coalesce(o.feedback_next_action_on,'1900-01-01'::date),
      coalesce(c.next_contact_at,'1900-01-01'::date),
      coalesce(la.next_eligible_on,'1900-01-01'::date)
    ) eligible_on,
    la.action last_action,
    la.occurred_at last_attempt_at,
    o.last_relevant_purchase_at::date last_purchase_on,
    null::date estimated_due_on,
    'Complementar'::text lead_status,
    o.source_product_name reference,
    concat_ws(' · ',o.reason,o.recommended_action) source_notes,
    '/clientes/'||o.customer_id::text href,
    coalesce(o.last_relevant_purchase_at,now()) source_created_at,
    null::uuid sale_id,
    case
      when not c.active
        or c.contact_lost
        or not c.crm_automation_enabled
        or not c.sales_radar_enabled
        or nullif(btrim(coalesce(c.crm_exclusion_reason,'')),'') is not null
        or lower(coalesce(c.crm_status,'')) in ('inactive','lost','excluded')
        then 'excluded'
      when greatest(
        coalesce(o.expected_action_on,'1900-01-01'::date),
        coalesce(o.feedback_next_action_on,'1900-01-01'::date),
        coalesce(c.next_contact_at,'1900-01-01'::date),
        coalesce(la.next_eligible_on,'1900-01-01'::date)
      ) > today.d
        then 'waiting_date'
      when o.recommended_product_id is null
        or coalesce(p.active,false)=false
        or coalesce(p.restricted,false)=true
        or coalesce(inv.available_quantity,0)<=0
        then 'waiting_stock'
      else 'ready'
    end::text state,
    case
      when not c.active or c.contact_lost then 'customer_unavailable'
      when not c.crm_automation_enabled or not c.sales_radar_enabled then 'automation_disabled'
      when nullif(btrim(coalesce(c.crm_exclusion_reason,'')),'') is not null then 'commercial_exclusion'
      when greatest(
        coalesce(o.expected_action_on,'1900-01-01'::date),
        coalesce(o.feedback_next_action_on,'1900-01-01'::date),
        coalesce(c.next_contact_at,'1900-01-01'::date),
        coalesce(la.next_eligible_on,'1900-01-01'::date)
      ) > today.d then 'future_or_cooldown'
      when o.recommended_product_id is null then 'product_missing'
      when coalesce(p.active,false)=false or coalesce(p.restricted,false)=true then 'product_unavailable'
      when coalesce(inv.available_quantity,0)<=0 then 'stock_unavailable'
      else 'eligible'
    end::text state_reason
  from public.customer_sales_opportunities_actionable_v2 o
  join public.customers c on c.id=o.customer_id
  left join public.products p on p.id=o.recommended_product_id
  left join public.inventory_control_overview inv on inv.product_id=o.recommended_product_id
  left join latest_attempt la
    on la.source_type='opportunity' and la.source_id=o.customer_id
  cross join today
  where o.opportunity_group='produto_complementar'
)
select * from returns
union all select * from repurchase
union all select * from leads
union all select * from post_sale
union all select * from opportunities;

revoke all on public.commercial_contact_contexts_v2 from anon;
grant select on public.commercial_contact_contexts_v2 to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- 5. Fila diária: uma posição por cliente e no máximo 10 pessoas.
-- ---------------------------------------------------------------------------
create or replace function public.commercial_contact_queue_people_v1(p_limit integer default 10)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_goal integer := 10;
  v_limit integer := greatest(1,least(coalesce(p_limit,10),10));
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_total_contexts integer := 0;
  v_leads integer := 0;
  v_repurchase integer := 0;
  v_contacted integer := 0;
  v_waiting_date integer := 0;
  v_waiting_stock integer := 0;
  v_rescheduled integer := 0;
  v_historical_closed integer := 0;
  v_review_required integer := 0;
begin
  if not public.can_write() then
    return jsonb_build_object(
      'today',v_today,'goal',v_goal,'contacted_today',0,'remaining',v_goal,
      'completed',false,'total_eligible',0,'total_contexts',0,
      'lead_eligible',0,'repurchase_eligible',0,'items','[]'::jsonb,
      'waiting_date',0,'waiting_stock',0,'rescheduled',0,
      'historical_closed',0,'review_required',0,
      'skipped',true,'reason','no_write_permission'
    );
  end if;

  select count(distinct a.customer_id)::integer
  into v_contacted
  from public.commercial_contact_attempts a
  where a.action='contacted'
    and a.customer_id is not null
    and (a.occurred_at at time zone 'America/Sao_Paulo')::date=v_today;

  with ready as (
    select *
    from public.commercial_contact_contexts_v2
    where state='ready'
      and eligible_on<=v_today
  ),
  ranked as (
    select
      r.*,
      row_number() over(
        partition by r.customer_id
        order by
          case when r.stage='response_check' then 0 else r.priority_rank end,
          r.eligible_on,
          r.last_attempt_at asc nulls first,
          r.source_created_at,
          r.queue_key
      ) rn
    from ready r
  ),
  grouped as (
    select
      r.customer_id,
      count(*)::integer context_count,
      bool_or(r.source_type='lead') has_lead,
      bool_or(r.source_type='repurchase') has_repurchase,
      jsonb_agg(
        to_jsonb(r)-'rn'-'state'-'state_reason'-'sale_id'
        order by
          case when r.stage='response_check' then 0 else r.priority_rank end,
          r.eligible_on,
          r.last_attempt_at asc nulls first,
          r.source_created_at,
          r.queue_key
      ) contexts
    from ranked r
    group by r.customer_id
  ),
  people as (
    select
      (
        to_jsonb(r)-'rn'-'state'-'state_reason'-'sale_id'
        || jsonb_build_object(
          'queue_key','customer:'||r.customer_id::text,
          'href','/clientes/'||r.customer_id::text,
          'context_count',g.context_count,
          'contexts',g.contexts,
          'product_name',case
            when g.context_count=1 then r.product_name
            else g.context_count::text||' assuntos comerciais'
          end,
          'reason',case
            when g.context_count=1 then r.reason
            else 'Múltiplos contextos'
          end
        )
      ) person_item,
      r.customer_id,
      g.context_count,
      g.has_lead,
      g.has_repurchase,
      case when r.stage='response_check' then 0 else r.priority_rank end sort_rank,
      r.eligible_on,
      r.last_attempt_at,
      r.source_created_at,
      r.queue_key
    from ranked r
    join grouped g on g.customer_id=r.customer_id
    where r.rn=1
  ),
  limited as (
    select *
    from people
    order by sort_rank,eligible_on,last_attempt_at asc nulls first,source_created_at,queue_key
    limit v_limit
  )
  select
    coalesce(
      (select jsonb_agg(l.person_item order by l.sort_rank,l.eligible_on,l.last_attempt_at asc nulls first,l.source_created_at,l.queue_key) from limited l),
      '[]'::jsonb
    ),
    (select count(*)::integer from people),
    coalesce((select sum(context_count)::integer from people),0),
    (select count(*)::integer from people where has_lead),
    (select count(*)::integer from people where has_repurchase)
  into v_items,v_total,v_total_contexts,v_leads,v_repurchase;

  select count(distinct customer_id)::integer
  into v_waiting_date
  from public.commercial_contact_contexts_v2
  where state='waiting_date';

  select count(distinct customer_id)::integer
  into v_waiting_stock
  from public.commercial_contact_contexts_v2
  where state='waiting_stock';

  select count(distinct customer_id)::integer
  into v_rescheduled
  from public.commercial_contact_contexts_v2
  where state='waiting_date'
    and (
      last_action is not null
      or state_reason='future_or_cooldown'
    );

  select (
    (select count(*) from public.sale_replenishment_reminders
      where cleanup_tag='legacy_commercial_cleanup_2026_08')
    +
    (select count(*) from public.post_sale_batches
      where cleanup_tag='legacy_commercial_cleanup_2026_08')
  )::integer
  into v_historical_closed;

  if to_regclass('public.supplement_receivable_attention_v1') is not null then
    execute 'select count(*)::integer from public.supplement_receivable_attention_v1'
      into v_review_required;
  end if;

  if v_contacted>=v_goal then
    v_items:='[]'::jsonb;
  end if;

  return jsonb_build_object(
    'today',v_today,
    'goal',v_goal,
    'contacted_today',v_contacted,
    'remaining',greatest(v_goal-v_contacted,0),
    'completed',v_contacted>=v_goal,
    'total_eligible',v_total,
    'total_contexts',v_total_contexts,
    'lead_eligible',v_leads,
    'repurchase_eligible',v_repurchase,
    'available_today',v_total,
    'waiting_date',v_waiting_date,
    'waiting_stock',v_waiting_stock,
    'rescheduled',v_rescheduled,
    'historical_closed',v_historical_closed,
    'review_required',v_review_required,
    'items',v_items
  );
end;
$$;

revoke all on function public.commercial_contact_queue_people_v1(integer) from public,anon;
grant execute on function public.commercial_contact_queue_people_v1(integer) to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- 6. Ação da fila. Um clique trata todos os contextos da mesma pessoa.
-- ---------------------------------------------------------------------------
create or replace function public.commercial_contact_customer_action_v1(
  p_customer_id uuid,
  p_action text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_next date;
  v_snapshot jsonb;
  v_person jsonb;
  v_context jsonb;
  v_contexts jsonb;
  v_source_type text;
  v_source_id uuid;
  v_product_id uuid;
  v_sale_id uuid;
  v_attempt_id uuid;
  v_first_attempt_id uuid;
  v_attempt_ids jsonb := '[]'::jsonb;
  v_context_count integer := 0;
  v_customer_name text;
  v_context_lines text := null;
  v_interaction_note text;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para trabalhar a fila comercial';
  end if;

  if p_action not in ('contacted','skipped','no_response','responded') then
    raise exception 'Ação comercial inválida';
  end if;

  if exists (
    select 1
    from public.commercial_contact_attempts a
    where a.customer_id=p_customer_id
      and a.action=p_action
      and a.occurred_at>now()-interval '8 seconds'
  ) then
    return jsonb_build_object(
      'ok',true,'duplicate_ignored',true,'customer_id',p_customer_id,'action',p_action
    );
  end if;

  v_snapshot:=public.commercial_contact_queue_people_v1(10);

  select x.item
  into v_person
  from jsonb_array_elements(coalesce(v_snapshot->'items','[]'::jsonb)) x(item)
  where x.item->>'customer_id'=p_customer_id::text
  limit 1;

  if v_person is null then
    raise exception 'Cliente não está mais elegível na fila comercial';
  end if;

  v_contexts:=coalesce(v_person->'contexts',jsonb_build_array(v_person));
  v_context_count:=jsonb_array_length(v_contexts);

  v_next:=case p_action
    when 'contacted' then v_today+2
    when 'skipped' then v_today+1
    when 'no_response' then v_today+7
    when 'responded' then v_today+3
  end;

  select c.name into v_customer_name
  from public.customers c
  where c.id=p_customer_id;

  for v_context in
    select distinct on (x.item->>'source_type',x.item->>'source_id') x.item
    from jsonb_array_elements(v_contexts) x(item)
    order by x.item->>'source_type',x.item->>'source_id'
  loop
    v_source_type:=v_context->>'source_type';
    v_source_id:=(v_context->>'source_id')::uuid;
    v_product_id:=nullif(v_context->>'product_id','')::uuid;

    insert into public.commercial_contact_attempts(
      source_type,source_id,customer_id,product_id,action,next_eligible_on,notes,created_by
    )
    values(
      v_source_type,v_source_id,p_customer_id,v_product_id,p_action,v_next,
      nullif(btrim(coalesce(p_notes,'')),''),auth.uid()
    )
    returning id into v_attempt_id;

    if v_first_attempt_id is null then
      v_first_attempt_id:=v_attempt_id;
    end if;

    v_attempt_ids:=v_attempt_ids||jsonb_build_array(v_attempt_id);

    if v_sale_id is null
       and nullif(v_context->>'sale_id','') is not null then
      v_sale_id:=(v_context->>'sale_id')::uuid;
    end if;

    if v_source_type='post_sale' then
      if p_action in ('contacted','responded') then
        update public.post_sale_batches
        set status='completed',
            completed_at=coalesce(completed_at,now()),
            cancelled_at=null,
            updated_at=now()
        where id=v_source_id
          and status='planned';
      elsif p_action in ('skipped','no_response') then
        update public.post_sale_batches
        set due_on=v_next,
            updated_at=now()
        where id=v_source_id
          and status='planned';
      end if;
    end if;

    v_context_lines:=concat_ws(
      E'\n',
      v_context_lines,
      '• '||case v_source_type
        when 'repurchase' then 'Recompra'
        when 'return' then 'Retorno'
        when 'post_sale' then 'Pós-venda'
        when 'opportunity' then 'Complementar'
        else 'Lead'
      end||
      ' · '||coalesce(v_context->>'product_name','Produto não informado')||
      case when nullif(v_context->>'reason','') is not null
        then ' · '||(v_context->>'reason')
        else ''
      end
    );
  end loop;

  if p_action<>'skipped' then
    if v_sale_id is not null
       and not exists(select 1 from public.sales s where s.id=v_sale_id) then
      v_sale_id:=null;
    end if;

    v_interaction_note:=concat_ws(
      E'\n',
      '[Fila Comercial] '||v_context_count::text||' contexto(s) · ação: '||p_action,
      v_context_lines,
      nullif(btrim(coalesce(p_notes,'')),'')
    );

    insert into public.customer_interactions(
      customer_id,sale_id,interaction_type,status,channel,
      occurred_at,completed_at,outcome,notes,created_by
    )
    values(
      p_customer_id,v_sale_id,'follow_up','completed','WhatsApp',
      now(),now(),p_action,v_interaction_note,auth.uid()
    );
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    'commercial_contact',
    coalesce(v_first_attempt_id,p_customer_id),
    'customer_queue_action',
    jsonb_build_object(
      'customer_id',p_customer_id,
      'customer_name',v_customer_name,
      'action',p_action,
      'context_count',v_context_count,
      'attempt_ids',v_attempt_ids,
      'next_eligible_on',v_next,
      'queue_version','v45_48'
    )
  );

  return jsonb_build_object(
    'ok',true,
    'customer_id',p_customer_id,
    'action',p_action,
    'context_count',v_context_count,
    'attempt_ids',v_attempt_ids,
    'next_eligible_on',v_next
  );
end;
$$;

revoke all on function public.commercial_contact_customer_action_v1(uuid,text,text) from public,anon;
grant execute on function public.commercial_contact_customer_action_v1(uuid,text,text) to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- 7. Recebíveis: vencimento obrigatório OU justificativa explícita.
--    Nenhuma venda antiga é reescrita pela migration.
-- ---------------------------------------------------------------------------
alter table public.sales
  add column if not exists receivable_due_exception_reason text,
  add column if not exists receivable_due_attention boolean not null default false;

create or replace function public.enforce_sale_lifecycle_and_financial_integrity_v1()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_due_relevant_change boolean:=true;
  v_explicit_reason text;
begin
  if new.record_type='sale' and new.general_status<>'cancelled' then
    new.general_status:=case
      when new.delivery_status='delivered' and new.payment_status='received'
        then 'finalized'
      else 'active'
    end;
  end if;

  if new.payment_status<>'receivable' then
    new.payment_due_at:=null;
    new.receivable_due_exception_reason:=null;
    new.receivable_due_attention:=false;
  elsif new.record_type='sale' then
    if tg_op='UPDATE' then
      v_due_relevant_change:=(
        old.payment_status is distinct from new.payment_status
        or old.payment_due_at is distinct from new.payment_due_at
        or old.receivable_due_exception_reason is distinct from new.receivable_due_exception_reason
        or old.notes is distinct from new.notes
        or old.payment_condition is distinct from new.payment_condition
        or old.record_type is distinct from new.record_type
      );
    end if;

    if new.payment_due_at is null then
      v_explicit_reason:=nullif(btrim(coalesce(new.receivable_due_exception_reason,'')),'');
      if v_explicit_reason is null
         and (
           lower(coalesce(new.notes,'')) like '%sem data combinada%'
           or lower(coalesce(new.payment_condition,'')) like '%sem data combinada%'
         ) then
        v_explicit_reason:='sem data combinada';
      end if;

      if v_due_relevant_change and v_explicit_reason is null then
        raise exception 'Venda a receber precisa de vencimento ou justificativa explícita \"sem data combinada\"';
      end if;

      if v_explicit_reason is not null then
        new.receivable_due_exception_reason:=v_explicit_reason;
        new.receivable_due_attention:=true;
      elsif tg_op='UPDATE' then
        new.receivable_due_attention:=old.receivable_due_attention;
      end if;
    else
      new.receivable_due_attention:=false;
      new.receivable_due_exception_reason:=null;
    end if;
  end if;

  if new.record_type='lead' and new.payment_status='not_applicable' then
    new.payment_method:=null;
    new.payment_condition:=null;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_sale_lifecycle_and_financial_integrity_v1()
from public,anon,authenticated;

drop trigger if exists enforce_sale_lifecycle_and_financial_integrity_v1 on public.sales;
create trigger enforce_sale_lifecycle_and_financial_integrity_v1
before insert or update of
  record_type,general_status,delivery_status,payment_status,payment_due_at,
  payment_method,payment_condition,notes,receivable_due_exception_reason
on public.sales
for each row
execute function public.enforce_sale_lifecycle_and_financial_integrity_v1();

create or replace function public.sync_receivable_due_attention_task_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_customer_name text;
begin
  if new.record_type<>'sale' then
    return new;
  end if;

  if new.payment_status='receivable'
     and new.general_status<>'cancelled'
     and new.receivable_due_attention
     and new.payment_due_at is null then

    select c.name into v_customer_name
    from public.customers c
    where c.id=new.customer_id;

    if not exists(
      select 1
      from public.operational_tasks t
      where t.sale_id=new.id
        and t.status='planned'
        and t.notes like '[Recebível sem data]%'
    ) then
      insert into public.operational_tasks(
        title,category,due_at,status,priority,customer_id,sale_id,notes,created_by,operation_scope
      )
      values(
        'Definir vencimento · '||coalesce(v_customer_name,'Venda'),
        'task',
        now()+interval '1 hour',
        'planned',
        'high',
        new.customer_id,
        new.id,
        '[Recebível sem data] '||coalesce(new.receivable_due_exception_reason,'sem data combinada'),
        auth.uid(),
        'supplements'
      );
    end if;
  else
    update public.operational_tasks
    set
      status='cancelled',
      cancelled_at=coalesce(cancelled_at,now()),
      updated_at=now(),
      notes=case
        when notes like '%[resolvido automaticamente]%' then notes
        else concat_ws(E'\n',notes,'[resolvido automaticamente] Vencimento definido ou recebível encerrado.')
      end
    where sale_id=new.id
      and status='planned'
      and notes like '[Recebível sem data]%';
  end if;

  return new;
end;
$$;

revoke all on function public.sync_receivable_due_attention_task_v1()
from public,anon,authenticated;

drop trigger if exists sync_receivable_due_attention_task_v1 on public.sales;
create trigger sync_receivable_due_attention_task_v1
after insert or update of
  payment_status,payment_due_at,receivable_due_attention,general_status
on public.sales
for each row
execute function public.sync_receivable_due_attention_task_v1();

create or replace view public.supplement_receivable_attention_v1
with (security_invoker=true)
as
select
  s.id sale_id,
  s.customer_id,
  c.name customer_name,
  s.total_amount,
  ps.outstanding_amount,
  s.quoted_at,
  s.receivable_due_exception_reason,
  s.notes
from public.sales s
left join public.customers c on c.id=s.customer_id
join public.sale_payment_summary ps on ps.sale_id=s.id
where s.record_type='sale'
  and s.payment_status='receivable'
  and s.general_status<>'cancelled'
  and s.payment_due_at is null
  and s.receivable_due_attention
  and ps.outstanding_amount>0.005;

revoke all on public.supplement_receivable_attention_v1 from anon;
grant select on public.supplement_receivable_attention_v1 to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- 8. Lucro por produto: distribuir o lucro FINAL da venda após desconto.
--    Não altera nenhum total histórico; corrige somente a leitura do relatório.
-- ---------------------------------------------------------------------------
create or replace view public.inventory_intelligence_overview
with (security_invoker=true)
as
with sale_product_base as (
  select
    s.id sale_id,
    si.product_id,
    s.quoted_at,
    s.total_amount sale_total_amount,
    s.total_profit sale_total_profit,
    sum(si.quantity)::integer quantity,
    sum(si.total_price)::numeric(14,4) item_gross
  from public.sales s
  join public.sale_items si on si.sale_id=s.id
  where s.record_type='sale'
    and s.general_status<>'cancelled'
  group by s.id,si.product_id,s.quoted_at,s.total_amount,s.total_profit
),
sale_product_weighted as (
  select
    b.*,
    sum(b.item_gross) over(partition by b.sale_id) sale_gross_lines,
    case
      when sum(b.item_gross) over(partition by b.sale_id)>0
        then b.item_gross/sum(b.item_gross) over(partition by b.sale_id)
      else 0
    end allocation_weight
  from sale_product_base b
),
sales_metrics as (
  select
    w.product_id,
    max(w.quoted_at) last_sale_at_all,
    coalesce(sum(w.quantity) filter(
      where w.quoted_at>=now()-interval '30 days'
    ),0)::integer units_30d,
    coalesce(sum(w.quantity) filter(
      where w.quoted_at>=now()-interval '90 days'
    ),0)::integer units_90d,
    coalesce(sum(w.sale_total_amount*w.allocation_weight) filter(
      where w.quoted_at>=now()-interval '90 days'
    ),0)::numeric(12,2) revenue_90d,
    coalesce(sum(w.sale_total_profit*w.allocation_weight) filter(
      where w.quoted_at>=now()-interval '90 days'
    ),0)::numeric(12,2) profit_90d
  from sale_product_weighted w
  group by w.product_id
),
lot_metrics as (
  select
    product_id,
    coalesce(sum(quantity_on_hand) filter(where expiry_status='expired'),0)::integer expired_units,
    coalesce(sum(quantity_on_hand) filter(where expiry_status='expires_30'),0)::integer expires_30_units,
    coalesce(sum(quantity_on_hand) filter(where expiry_status='expires_60'),0)::integer expires_60_units,
    coalesce(sum(quantity_on_hand) filter(where expiry_status='expires_90'),0)::integer expires_90_units,
    coalesce(sum(quantity_on_hand) filter(where expiry_status='quarantined'),0)::integer quarantined_units
  from public.inventory_lot_overview
  group by product_id
),
base as (
  select
    ppo.product_id,
    ppo.product_name,
    ppo.category,
    ppo.brand,
    ppo.image_url,
    ppo.cost_price,
    ppo.sale_price,
    ppo.min_stock,
    ppo.ideal_stock,
    ppo.supplier_id,
    ppo.supplier_name,
    ppo.lead_time_days,
    ppo.target_cover_days,
    ppo.flavor_tracking_enabled,
    p.lot_tracking_enabled,
    p.created_at product_created_at,
    greatest(
      (now() at time zone 'America/Sao_Paulo')::date
      -(p.created_at at time zone 'America/Sao_Paulo')::date,
      0
    )::integer product_age_days,
    ppo.physical_quantity,
    ppo.reserved_quantity,
    ppo.available_quantity,
    ppo.incoming_quantity,
    ppo.backlog_quantity,
    ppo.weighted_daily_demand,
    ppo.coverage_days,
    ppo.target_units,
    ppo.suggested_order_quantity,
    ppo.estimated_order_cost,
    ppo.purchase_priority,
    ppo.estimated_stockout_on,
    coalesce(sm.units_30d,0)::integer units_30d,
    coalesce(sm.units_90d,0)::integer units_90d,
    coalesce(sm.revenue_90d,0)::numeric(12,2) revenue_90d,
    coalesce(sm.profit_90d,0)::numeric(12,2) profit_90d,
    sm.last_sale_at_all,
    case
      when sm.last_sale_at_all is null then null
      else greatest(
        (now() at time zone 'America/Sao_Paulo')::date
        -(sm.last_sale_at_all at time zone 'America/Sao_Paulo')::date,
        0
      )::integer
    end days_since_last_sale,
    coalesce(lm.expired_units,0)::integer expired_units,
    coalesce(lm.expires_30_units,0)::integer expires_30_units,
    coalesce(lm.expires_60_units,0)::integer expires_60_units,
    coalesce(lm.expires_90_units,0)::integer expires_90_units,
    coalesce(lm.quarantined_units,0)::integer quarantined_units,
    (ppo.physical_quantity*ppo.cost_price)::numeric(12,2) stock_cost_value,
    greatest(
      ppo.available_quantity+ppo.incoming_quantity-ppo.target_units,
      0
    )::integer excess_units,
    (
      greatest(
        ppo.available_quantity+ppo.incoming_quantity-ppo.target_units,
        0
      )*ppo.cost_price
    )::numeric(12,2) excess_capital
  from public.purchase_planning_overview ppo
  join public.products p on p.id=ppo.product_id
  left join sales_metrics sm on sm.product_id=ppo.product_id
  left join lot_metrics lm on lm.product_id=ppo.product_id
),
ranked as (
  select
    b.*,
    sum(b.revenue_90d) over() total_revenue_90d,
    sum(b.revenue_90d) over(
      order by b.revenue_90d desc,b.product_name
      rows between unbounded preceding and current row
    ) cumulative_revenue_90d
  from base b
),
classified as (
  select
    r.*,
    case
      when r.revenue_90d<=0 or r.total_revenue_90d<=0 then 'N'
      when r.cumulative_revenue_90d/r.total_revenue_90d<=0.80 then 'A'
      when r.cumulative_revenue_90d/r.total_revenue_90d<=0.95 then 'B'
      else 'C'
    end abc_class,
    case
      when r.total_revenue_90d>0
        then round((r.revenue_90d/r.total_revenue_90d)*100,2)
      else 0
    end::numeric(8,2) revenue_share_pct,
    case
      when r.total_revenue_90d>0
        then round((r.cumulative_revenue_90d/r.total_revenue_90d)*100,2)
      else 0
    end::numeric(8,2) cumulative_revenue_share_pct,
    (
      r.physical_quantity>0
      and (
        (r.last_sale_at_all is null and r.product_age_days>=60)
        or r.days_since_last_sale>=60
      )
    ) slow_stock_60d,
    (
      r.physical_quantity>0
      and (
        (r.last_sale_at_all is null and r.product_age_days>=90)
        or r.days_since_last_sale>=90
      )
    ) stagnant_stock_90d,
    (
      r.excess_units>0
      and (
        r.revenue_90d=0
        or coalesce(r.coverage_days,0)>greatest(r.target_cover_days*2,60)
      )
    ) overstock
  from ranked r
)
select
  c.*,
  case
    when c.expired_units>0 then 'expired'
    when c.expires_30_units>0 then 'expiry_30'
    when c.purchase_priority='critical' then 'stockout_critical'
    when c.purchase_priority='urgent' then 'reorder_urgent'
    when c.stagnant_stock_90d then 'stagnant'
    when c.overstock then 'overstock'
    when c.purchase_priority='attention' then 'reorder_attention'
    when c.expires_60_units>0 then 'expiry_60'
    when c.slow_stock_60d then 'slow'
    when c.expires_90_units>0 then 'expiry_90'
    else 'healthy'
  end top_action,
  case
    when c.expired_units>0 then 1
    when c.expires_30_units>0 then 2
    when c.purchase_priority='critical' then 3
    when c.purchase_priority='urgent' then 4
    when c.stagnant_stock_90d then 5
    when c.overstock then 6
    when c.purchase_priority='attention' then 7
    when c.expires_60_units>0 then 8
    when c.slow_stock_60d then 9
    when c.expires_90_units>0 then 10
    else 99
  end::integer action_priority,
  case
    when c.stagnant_stock_90d then c.stock_cost_value
    else 0
  end::numeric(12,2) stagnant_capital_90d
from classified c;

grant select on public.inventory_intelligence_overview to authenticated,service_role;
revoke all on public.inventory_intelligence_overview from anon;

-- ---------------------------------------------------------------------------
-- 9. UX Doctor: encerra apenas os dois sinais históricos conhecidos.
--    Nenhuma regra ampla é adicionada, portanto ocorrências novas continuam visíveis.
-- ---------------------------------------------------------------------------
update public.ux_health_signals
set
  status='resolved',
  resolved_at=coalesce(resolved_at,now()),
  resolution_note=case fingerprint
    when '03947fec8b4b34f9d77392b6375c19d2'
      then 'V45.48 · sinal histórico do Server Component em /suplementos/vendas; erro raiz já corrigido e sem recorrência atual.'
    when 'dc584151b430e65b106774c282b43335'
      then 'V45.48 · Script error genérico sem arquivo/linha acionável em /dashboard; encerrado como sinal histórico. Nova ocorrência continua sendo registrada.'
    else resolution_note
  end
where status='active'
  and fingerprint in (
    '03947fec8b4b34f9d77392b6375c19d2',
    'dc584151b430e65b106774c282b43335'
  );

-- ---------------------------------------------------------------------------
-- 10. Verificações da própria migration.
-- ---------------------------------------------------------------------------
do $verification$
declare
  v_dup integer;
begin
  if exists (
    select 1
    from public.sale_replenishment_reminders r
    where r.cleanup_tag='legacy_commercial_cleanup_2026_08'
      and r.status<>'cancelled'
  ) then
    raise exception 'V45.48: lembrete marcado como limpeza sem status cancelado';
  end if;

  if exists (
    select 1
    from public.post_sale_batches b
    where b.cleanup_tag='legacy_commercial_cleanup_2026_08'
      and b.status<>'cancelled'
  ) then
    raise exception 'V45.48: pós-venda marcado como limpeza sem status cancelado';
  end if;

  select count(*) into v_dup
  from (
    select customer_id
    from public.commercial_contact_contexts_v2
    where state='ready'
    group by customer_id
  ) q;
  -- v_dup é apenas contagem de pessoas; o agrupamento definitivo ocorre na RPC.

  if exists (
    select 1
    from public.commercial_contact_contexts_v2 c
    where c.state='ready'
      and c.eligible_on>(now() at time zone 'America/Sao_Paulo')::date
  ) then
    raise exception 'V45.48: contexto futuro apareceu como ready';
  end if;
end
$verification$;

commit;
