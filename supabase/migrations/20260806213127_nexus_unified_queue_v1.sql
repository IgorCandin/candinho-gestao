create or replace function public.nexus_unified_queue_v1(p_limit integer default 80)
returns jsonb
language sql
stable
security definer
set search_path='public'
as $$
with access as (
  select
    p.id as user_id,
    p.active,
    p.role::text as role,
    coalesce(p.can_access_supplements,false) as can_supplements,
    coalesce(p.can_access_fitness,false) as can_fitness,
    coalesce(p.can_access_bank,false) as can_bank,
    coalesce(p.can_access_marketing,false) as can_marketing,
    coalesce(p.can_manage_users,false) as can_manage_users
  from public.profiles p
  where p.id=auth.uid()
), allowed as (
  select
    user_id,
    active,
    role,
    (active and (role='admin' or can_supplements)) as supplements,
    (active and (role='admin' or can_fitness)) as fitness,
    (active and (role='admin' or can_bank)) as bank,
    (active and (role='admin' or can_marketing)) as marketing,
    (active and (role='admin' or can_manage_users or can_supplements or can_fitness or can_marketing)) as central
  from access
), items as (
  select
    ('signal:'||s.id::text) as queue_id,
    s.id::text as source_id,
    'nexus_signal'::text as source_type,
    'supplements'::text as operation_scope,
    'Suplementos'::text as operation_label,
    s.severity::text as severity,
    coalesce(s.score,0)::numeric as score,
    s.title::text as title,
    s.summary::text as summary,
    coalesce(s.action_href,'/suplementos/nexus')::text as href,
    null::timestamptz as due_at,
    case when s.status='open' then 'signal_status' else 'open' end::text as action_mode,
    jsonb_build_object(
      'signal_id',s.id,
      'signal_type',s.signal_type,
      'customer_id',s.customer_id,
      'product_id',s.product_id,
      'partner_id',s.partner_id,
      'recommended_action',s.recommended_action,
      'action_label',s.action_label
    ) as metadata
  from public.nexus_signals s
  cross join allowed a
  where a.supplements
    and s.operation_scope='supplements'
    and s.status='open'

  union all

  select
    ('task:'||t.id::text) as queue_id,
    t.id::text as source_id,
    'operational_task'::text as source_type,
    t.operation_scope::text as operation_scope,
    case t.operation_scope
      when 'fitness' then 'Fitness'
      when 'marketing' then 'Marketing'
      when 'supplements' then 'Suplementos'
      else 'Central'
    end::text as operation_label,
    case
      when t.due_at < now() then 'urgent'
      when t.priority='urgent' then 'urgent'
      when t.priority='attention' then 'attention'
      else 'info'
    end::text as severity,
    (
      case
        when t.due_at < now() then 96
        when t.priority='urgent' then 92
        when t.priority='attention' then 82
        else 58
      end
      + greatest(0,least(10,ceil(extract(epoch from (now()+interval '7 days'-t.due_at))/86400.0)))
    )::numeric as score,
    t.title::text as title,
    coalesce(t.notes,t.category)::text as summary,
    case t.operation_scope
      when 'fitness' then '/fitness'
      when 'marketing' then '/central/agenda?scope=marketing'
      when 'supplements' then '/agenda'
      else '/central/prioridades'
    end::text as href,
    t.due_at,
    'open'::text as action_mode,
    jsonb_build_object(
      'task_id',t.id,
      'category',t.category,
      'priority',t.priority,
      'status',t.status,
      'contact_name',t.contact_name,
      'assigned_name',t.assigned_name
    ) as metadata
  from public.central_operational_tasks_overview t
  cross join allowed a
  where t.status in ('planned','pending')
    and (t.due_at <= now()+interval '7 days' or t.priority in ('urgent','attention'))
    and (
      (t.operation_scope='supplements' and a.supplements)
      or (t.operation_scope='fitness' and a.fitness)
      or (t.operation_scope='marketing' and a.marketing)
      or (t.operation_scope='company' and a.central)
    )

  union all

  select
    ('fitness-sale:'||f.id::text) as queue_id,
    f.id::text as source_id,
    'fitness_sale'::text as source_type,
    'fitness'::text as operation_scope,
    'Fitness'::text as operation_label,
    case
      when f.payment_status='receivable' and coalesce(f.payment_due_on,f.quoted_on) < (now() at time zone 'America/Sao_Paulo')::date then 'urgent'
      when f.payment_status='receivable' then 'attention'
      when f.delivery_status<>'delivered' then 'attention'
      else 'info'
    end::text as severity,
    case
      when f.payment_status='receivable' and coalesce(f.payment_due_on,f.quoted_on) < (now() at time zone 'America/Sao_Paulo')::date then 98
      when f.payment_status='receivable' then 88
      when f.delivery_status<>'delivered' then 80
      else 40
    end::numeric as score,
    ('Venda Fitness · '||f.customer_name)::text as title,
    coalesce(f.product_summary,'Venda sem itens')::text as summary,
    ('/fitness/vendas/'||f.id::text)::text as href,
    (coalesce(f.payment_due_on,f.quoted_on)::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo' as due_at,
    'open'::text as action_mode,
    jsonb_build_object(
      'payment_status',f.payment_status,
      'delivery_status',f.delivery_status,
      'total_amount',f.total_amount,
      'customer_id',f.customer_id
    ) as metadata
  from public.fitness_sales_overview f
  cross join allowed a
  where a.fitness
    and f.general_status<>'cancelled'
    and (f.payment_status='receivable' or f.delivery_status<>'delivered')

  union all

  select
    ('fitness-post-sale:'||p.id::text) as queue_id,
    p.id::text as source_id,
    'fitness_post_sale'::text as source_type,
    'fitness'::text as operation_scope,
    'Fitness'::text as operation_label,
    case when p.status='overdue' then 'urgent' else 'attention' end::text as severity,
    case when p.status='overdue' then 90 else 74 end::numeric as score,
    ('Pós-venda Fitness · '||p.customer_name)::text as title,
    coalesce(p.product_summary,'Revisar retorno')::text as summary,
    '/fitness/pos-venda'::text as href,
    (p.due_on::timestamp + interval '10 hours') at time zone 'America/Sao_Paulo' as due_at,
    'open'::text as action_mode,
    jsonb_build_object(
      'customer_id',p.customer_id,
      'status',p.status,
      'last_sale_on',p.last_sale_on,
      'sale_count',p.sale_count
    ) as metadata
  from public.fitness_post_sale_overview p
  cross join allowed a
  where a.fitness
    and p.status in ('overdue','upcoming')
    and p.due_on <= (now() at time zone 'America/Sao_Paulo')::date + 7

  union all

  select
    ('bank-charge:'||b.id::text) as queue_id,
    b.id::text as source_id,
    'bank_charge'::text as source_type,
    'bank'::text as operation_scope,
    'Bank'::text as operation_label,
    case
      when b.due_date < (now() at time zone 'America/Sao_Paulo')::date then 'urgent'
      when b.due_date <= (now() at time zone 'America/Sao_Paulo')::date + 2 then 'attention'
      else 'info'
    end::text as severity,
    case
      when b.due_date < (now() at time zone 'America/Sao_Paulo')::date then 99
      when b.due_date <= (now() at time zone 'America/Sao_Paulo')::date + 2 then 89
      else 68
    end::numeric as score,
    ('Pagar · '||b.title)::text as title,
    ('R$ '||to_char(coalesce(b.remaining_amount,b.amount,0),'FM999G999G990D00')||coalesce(' · '||nullif(b.category,''),''))::text as summary,
    '/bank/cobrancas'::text as href,
    (b.due_date::timestamp + interval '9 hours') at time zone 'America/Sao_Paulo' as due_at,
    'open'::text as action_mode,
    jsonb_build_object(
      'amount',b.amount,
      'remaining_amount',b.remaining_amount,
      'effective_status',b.effective_status,
      'category',b.category
    ) as metadata
  from public.bank_charges_overview b
  cross join allowed a
  where a.bank
    and b.effective_status not in ('paid','cancelled')
    and b.due_date <= (now() at time zone 'America/Sao_Paulo')::date + 7

  union all

  select
    ('bank-invoice:'||i.id::text) as queue_id,
    i.id::text as source_id,
    'bank_invoice'::text as source_type,
    'bank'::text as operation_scope,
    'Bank'::text as operation_label,
    case
      when i.due_date < (now() at time zone 'America/Sao_Paulo')::date then 'urgent'
      when i.due_date <= (now() at time zone 'America/Sao_Paulo')::date + 2 then 'attention'
      else 'info'
    end::text as severity,
    case
      when i.due_date < (now() at time zone 'America/Sao_Paulo')::date then 97
      when i.due_date <= (now() at time zone 'America/Sao_Paulo')::date + 2 then 87
      else 66
    end::numeric as score,
    ('Fatura · '||i.card_name)::text as title,
    ('R$ '||to_char(coalesce(i.amount,0),'FM999G999G990D00')||' · '||coalesce(i.institution,'Cartão'))::text as summary,
    '/bank/faturas'::text as href,
    (i.due_date::timestamp + interval '9 hours') at time zone 'America/Sao_Paulo' as due_at,
    'open'::text as action_mode,
    jsonb_build_object(
      'amount',i.amount,
      'status',i.status,
      'reference_month',i.reference_month,
      'card_id',i.card_id
    ) as metadata
  from public.bank_card_invoice_overview i
  cross join allowed a
  where a.bank
    and i.status='planned'
    and i.due_date <= (now() at time zone 'America/Sao_Paulo')::date + 7

  union all

  select
    ('bank-debt:'||d.id::text) as queue_id,
    d.id::text as source_id,
    'bank_debt'::text as source_type,
    'bank'::text as operation_scope,
    'Bank'::text as operation_label,
    case
      when d.next_due_date < (now() at time zone 'America/Sao_Paulo')::date then 'urgent'
      when d.next_due_date <= (now() at time zone 'America/Sao_Paulo')::date + 2 then 'attention'
      else 'info'
    end::text as severity,
    case
      when d.next_due_date < (now() at time zone 'America/Sao_Paulo')::date then 95
      when d.next_due_date <= (now() at time zone 'America/Sao_Paulo')::date + 2 then 85
      else 64
    end::numeric as score,
    ('Parcela · '||d.name)::text as title,
    ('R$ '||to_char(coalesce(d.monthly_amount,0),'FM999G999G990D00')||coalesce(' · '||nullif(d.creditor_name,''),''))::text as summary,
    '/bank/emprestimos'::text as href,
    (d.next_due_date::timestamp + interval '9 hours') at time zone 'America/Sao_Paulo' as due_at,
    'open'::text as action_mode,
    jsonb_build_object(
      'monthly_amount',d.monthly_amount,
      'remaining_amount',d.remaining_amount,
      'effective_status',d.effective_status,
      'creditor_name',d.creditor_name
    ) as metadata
  from public.bank_debts_overview d
  cross join allowed a
  where a.bank
    and d.effective_status='active'
    and d.next_due_date is not null
    and d.next_due_date <= (now() at time zone 'America/Sao_Paulo')::date + 7
), ranked as (
  select *
  from items
  order by score desc, due_at asc nulls last, title asc
), limited as (
  select * from ranked limit greatest(1,least(coalesce(p_limit,80),200))
), operation_counts as (
  select operation_scope,count(*)::integer as count
  from items
  group by operation_scope
), severity_counts as (
  select severity,count(*)::integer as count
  from items
  group by severity
)
select jsonb_build_object(
  'generated_at',now(),
  'items',coalesce((select jsonb_agg(to_jsonb(l) order by l.score desc,l.due_at asc nulls last,l.title) from limited l),'[]'::jsonb),
  'summary',jsonb_build_object(
    'total',(select count(*) from items),
    'urgent',(select count(*) from items where severity='urgent'),
    'attention',(select count(*) from items where severity='attention'),
    'opportunity',(select count(*) from items where severity='opportunity'),
    'info',(select count(*) from items where severity='info'),
    'by_operation',coalesce((select jsonb_object_agg(operation_scope,count) from operation_counts),'{}'::jsonb),
    'by_severity',coalesce((select jsonb_object_agg(severity,count) from severity_counts),'{}'::jsonb)
  )
);
$$;

grant execute on function public.nexus_unified_queue_v1(integer) to authenticated;
