create or replace view public.operational_calendar_events
with (security_invoker = true)
as
with sale_products as (
  select
    si.sale_id,
    string_agg(p.name || case when si.quantity > 1 then ' ×' || si.quantity::text else '' end, ', ' order by p.name) as product_summary
  from public.sale_items si
  join public.products p on p.id = si.product_id
  group by si.sale_id
), manual_events as (
  select
    'task:' || t.id::text as event_key,
    'task'::text as source_type,
    t.id as source_id,
    t.category,
    t.title,
    coalesce(c.name, sp.product_summary, po_s.supplier_name, 'Tarefa operacional') as subtitle,
    t.due_at,
    (t.due_at at time zone 'America/Sao_Paulo')::date as due_date,
    t.status,
    t.priority,
    t.customer_id,
    c.name as customer_name,
    c.phone as customer_phone,
    t.sale_id,
    t.purchase_order_id,
    t.assigned_to,
    coalesce(pr.full_name, pr.email) as assigned_name,
    case
      when t.sale_id is not null then '/vendas/' || t.sale_id::text
      when t.customer_id is not null then '/clientes/' || t.customer_id::text
      when t.purchase_order_id is not null then '/pedidos-fornecedor/' || t.purchase_order_id::text
      else '/agenda'
    end as href,
    t.notes,
    null::numeric as amount,
    t.created_at
  from public.operational_tasks t
  left join public.customers c on c.id = t.customer_id
  left join sale_products sp on sp.sale_id = t.sale_id
  left join public.supplier_order_summary po_s on po_s.id = t.purchase_order_id
  left join public.profiles pr on pr.id = t.assigned_to
), interaction_events as (
  select
    'interaction:' || ci.id::text,
    'interaction'::text,
    ci.id,
    case when ci.interaction_type = 'post_sale' then 'post_sale' else 'follow_up' end,
    case when ci.interaction_type = 'post_sale' then 'Pós-venda · ' else 'Retorno · ' end || c.name,
    coalesce(nullif(ci.notes,''), 'Contato agendado'),
    (ci.due_at::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo',
    ci.due_at,
    ci.status,
    case when ci.due_at < (now() at time zone 'America/Sao_Paulo')::date and ci.status='planned' then 'urgent' else 'normal' end,
    ci.customer_id,
    c.name,
    c.phone,
    ci.sale_id,
    null::uuid,
    ci.created_by,
    coalesce(pr.full_name, pr.email),
    '/clientes/' || ci.customer_id::text,
    ci.notes,
    null::numeric,
    ci.created_at
  from public.customer_interactions ci
  join public.customers c on c.id = ci.customer_id
  left join public.profiles pr on pr.id = ci.created_by
  where ci.due_at is not null and ci.status in ('planned','completed','cancelled')
), payment_events as (
  select
    'sale_payment:' || s.id::text,
    'sale_payment'::text,
    s.id,
    'payment'::text,
    'Cobrança · ' || coalesce(c.name,s.reference,'Cliente'),
    coalesce(sp.product_summary,'Venda registrada'),
    (s.payment_due_at::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo',
    s.payment_due_at,
    'planned'::text,
    case when s.payment_due_at < (now() at time zone 'America/Sao_Paulo')::date then 'urgent' else 'attention' end,
    s.customer_id,
    coalesce(c.name,s.reference,'Cliente'),
    coalesce(c.phone,s.phone),
    s.id,
    null::uuid,
    s.created_by,
    coalesce(pr.full_name, pr.email),
    '/vendas/' || s.id::text,
    s.notes,
    s.total_amount,
    s.created_at
  from public.sales s
  left join public.customers c on c.id=s.customer_id
  left join sale_products sp on sp.sale_id=s.id
  left join public.profiles pr on pr.id=s.created_by
  where s.record_type='sale' and s.general_status<>'cancelled' and s.payment_status='receivable' and s.payment_due_at is not null
), delivery_events as (
  select
    'sale_delivery:' || s.id::text,
    'sale_delivery'::text,
    s.id,
    'delivery'::text,
    'Entrega · ' || coalesce(c.name,s.reference,'Cliente'),
    coalesce(sp.product_summary,'Pedido registrado'),
    (s.delivery_due_at::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo',
    s.delivery_due_at,
    'planned'::text,
    case when s.delivery_due_at < (now() at time zone 'America/Sao_Paulo')::date then 'urgent' else 'normal' end,
    s.customer_id,
    coalesce(c.name,s.reference,'Cliente'),
    coalesce(c.phone,s.phone),
    s.id,
    null::uuid,
    s.created_by,
    coalesce(pr.full_name, pr.email),
    '/vendas/' || s.id::text,
    s.notes,
    s.total_amount,
    s.created_at
  from public.sales s
  left join public.customers c on c.id=s.customer_id
  left join sale_products sp on sp.sale_id=s.id
  left join public.profiles pr on pr.id=s.created_by
  where s.record_type='sale' and s.general_status<>'cancelled' and s.delivery_status='to_deliver' and s.delivery_due_at is not null
), post_sale_events as (
  select
    'sale_post_sale:' || s.id::text,
    'sale_post_sale'::text,
    s.id,
    'post_sale'::text,
    'Pós-venda · ' || coalesce(c.name,s.reference,'Cliente'),
    coalesce(sp.product_summary,'Venda entregue'),
    (s.post_sale_due_at::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo',
    s.post_sale_due_at,
    case
      when lower(coalesce(s.post_sale_status,'')) in ('concluído','concluido','completed') then 'completed'
      when lower(coalesce(s.post_sale_status,'')) in ('contato perdido','cancelado','cancelled') then 'cancelled'
      else 'planned'
    end,
    case
      when s.post_sale_due_at < (now() at time zone 'America/Sao_Paulo')::date
       and lower(coalesce(s.post_sale_status,'')) not in ('concluído','concluido','completed','contato perdido','cancelado','cancelled')
      then 'urgent' else 'normal'
    end,
    s.customer_id,
    coalesce(c.name,s.reference,'Cliente'),
    coalesce(c.phone,s.phone),
    s.id,
    null::uuid,
    s.created_by,
    coalesce(pr.full_name, pr.email),
    case when s.customer_id is not null then '/clientes/' || s.customer_id::text else '/vendas/' || s.id::text end,
    s.notes,
    s.total_amount,
    s.created_at
  from public.sales s
  left join public.customers c on c.id=s.customer_id
  left join sale_products sp on sp.sale_id=s.id
  left join public.profiles pr on pr.id=s.created_by
  where s.record_type='sale' and s.general_status<>'cancelled' and s.post_sale_due_at is not null
), supplier_events as (
  select
    'purchase_order:' || po.id::text,
    'purchase_order'::text,
    po.id,
    'supplier'::text,
    'Chegada prevista · ' || pos.supplier_name,
    coalesce(pos.product_summary, pos.pending_units::text || ' unidade(s) a caminho'),
    (po.expected_on::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo',
    po.expected_on,
    'planned'::text,
    case when po.expected_on < (now() at time zone 'America/Sao_Paulo')::date then 'attention' else 'normal' end,
    null::uuid,
    null::text,
    null::text,
    null::uuid,
    po.id,
    po.created_by,
    coalesce(pr.full_name, pr.email),
    '/pedidos-fornecedor/' || po.id::text,
    po.notes,
    pos.order_total,
    po.created_at
  from public.purchase_orders po
  join public.supplier_order_summary pos on pos.id=po.id
  left join public.profiles pr on pr.id=po.created_by
  where po.status in ('pending','partial') and po.expected_on is not null
)
select * from manual_events
union all select * from interaction_events
union all select * from payment_events
union all select * from delivery_events
union all select * from post_sale_events
union all select * from supplier_events;

revoke all on public.operational_tasks from anon;
revoke all on public.operational_calendar_events from anon;
revoke all on public.operational_agenda_summary from anon;
revoke execute on function public.create_operational_task(text,text,timestamptz,text,uuid,uuid,uuid,uuid,text) from public, anon;
revoke execute on function public.reschedule_operational_event(text,uuid,timestamptz) from public, anon;
revoke execute on function public.complete_operational_event(text,uuid,date,text,text,text) from public, anon;
revoke execute on function public.cancel_operational_event(text,uuid,text) from public, anon;
revoke execute on function public.append_operational_event_note(text,uuid,text) from public, anon;

grant execute on function public.create_operational_task(text,text,timestamptz,text,uuid,uuid,uuid,uuid,text) to authenticated;
grant execute on function public.reschedule_operational_event(text,uuid,timestamptz) to authenticated;
grant execute on function public.complete_operational_event(text,uuid,date,text,text,text) to authenticated;
grant execute on function public.cancel_operational_event(text,uuid,text) to authenticated;
grant execute on function public.append_operational_event_note(text,uuid,text) to authenticated;
