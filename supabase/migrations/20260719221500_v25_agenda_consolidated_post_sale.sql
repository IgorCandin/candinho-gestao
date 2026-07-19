-- V25 · Agenda passa a mostrar pós-venda consolidado por batch.
-- Mantém source_type='sale_post_sale' para compatibilidade com o frontend.

create or replace view public.operational_calendar_events
with (security_invoker=true)
as
with sale_products as (
  select
    si.sale_id,
    string_agg(
      p.name ||
      case when si.quantity>1 then ' ×'||si.quantity::text else '' end,
      ', ' order by p.name
    ) product_summary
  from public.sale_items si
  join public.products p on p.id=si.product_id
  group by si.sale_id
),
manual_events as (
  select
    'task:'||t.id::text event_key,
    'task'::text source_type,
    t.id source_id,
    t.category,
    t.title,
    coalesce(c.name,sp.product_summary,po_s.supplier_name,'Tarefa operacional') subtitle,
    t.due_at,
    (t.due_at at time zone 'America/Sao_Paulo')::date due_date,
    t.status,
    t.priority,
    t.customer_id,
    c.name customer_name,
    c.phone customer_phone,
    t.sale_id,
    t.purchase_order_id,
    t.assigned_to,
    coalesce(pr.full_name,pr.email) assigned_name,
    case
      when t.sale_id is not null then '/vendas/'||t.sale_id::text
      when t.customer_id is not null then '/clientes/'||t.customer_id::text
      when t.purchase_order_id is not null then '/pedidos-fornecedor/'||t.purchase_order_id::text
      else '/agenda'
    end href,
    t.notes,
    null::numeric amount,
    t.created_at
  from public.operational_tasks t
  left join public.customers c on c.id=t.customer_id
  left join sale_products sp on sp.sale_id=t.sale_id
  left join public.supplier_order_summary po_s on po_s.id=t.purchase_order_id
  left join public.profiles pr on pr.id=t.assigned_to
),
interaction_events as (
  select
    'interaction:'||ci.id::text event_key,
    'interaction'::text source_type,
    ci.id source_id,
    case when ci.interaction_type='post_sale' then 'post_sale' else 'follow_up' end category,
    (case when ci.interaction_type='post_sale' then 'Pós-venda · ' else 'Retorno · ' end)||c.name title,
    coalesce(nullif(ci.notes,''),'Contato agendado') subtitle,
    ((ci.due_at::timestamp+interval '12 hours') at time zone 'America/Sao_Paulo') due_at,
    ci.due_at due_date,
    ci.status,
    case
      when ci.due_at<(now() at time zone 'America/Sao_Paulo')::date
       and ci.status='planned'
      then 'urgent'
      else 'normal'
    end priority,
    ci.customer_id,
    c.name customer_name,
    c.phone customer_phone,
    ci.sale_id,
    null::uuid purchase_order_id,
    ci.created_by assigned_to,
    coalesce(pr.full_name,pr.email) assigned_name,
    '/clientes/'||ci.customer_id::text href,
    ci.notes,
    null::numeric amount,
    ci.created_at
  from public.customer_interactions ci
  join public.customers c on c.id=ci.customer_id
  left join public.profiles pr on pr.id=ci.created_by
  where ci.due_at is not null
    and ci.status in ('planned','completed','cancelled')
),
payment_events as (
  select
    'sale_payment:'||s.id::text event_key,
    'sale_payment'::text source_type,
    s.id source_id,
    'payment'::text category,
    'Cobrança · '||coalesce(c.name,s.reference,'Cliente') title,
    coalesce(sp.product_summary,'Venda registrada') subtitle,
    ((s.payment_due_at::timestamp+interval '12 hours') at time zone 'America/Sao_Paulo') due_at,
    s.payment_due_at due_date,
    'planned'::text status,
    case
      when s.payment_due_at<(now() at time zone 'America/Sao_Paulo')::date then 'urgent'
      else 'attention'
    end priority,
    s.customer_id,
    coalesce(c.name,s.reference,'Cliente') customer_name,
    coalesce(c.phone,s.phone) customer_phone,
    s.id sale_id,
    null::uuid purchase_order_id,
    s.created_by assigned_to,
    coalesce(pr.full_name,pr.email) assigned_name,
    '/vendas/'||s.id::text href,
    s.notes,
    s.total_amount amount,
    s.created_at
  from public.sales s
  left join public.customers c on c.id=s.customer_id
  left join sale_products sp on sp.sale_id=s.id
  left join public.profiles pr on pr.id=s.created_by
  where s.record_type='sale'
    and s.general_status<>'cancelled'
    and s.payment_status='receivable'
    and s.payment_due_at is not null
),
delivery_events as (
  select
    'sale_delivery:'||s.id::text event_key,
    'sale_delivery'::text source_type,
    s.id source_id,
    'delivery'::text category,
    'Entrega · '||coalesce(c.name,s.reference,'Cliente') title,
    coalesce(sp.product_summary,'Pedido registrado') subtitle,
    ((s.delivery_due_at::timestamp+interval '12 hours') at time zone 'America/Sao_Paulo') due_at,
    s.delivery_due_at due_date,
    'planned'::text status,
    case
      when s.delivery_due_at<(now() at time zone 'America/Sao_Paulo')::date then 'urgent'
      else 'normal'
    end priority,
    s.customer_id,
    coalesce(c.name,s.reference,'Cliente') customer_name,
    coalesce(c.phone,s.phone) customer_phone,
    s.id sale_id,
    null::uuid purchase_order_id,
    s.created_by assigned_to,
    coalesce(pr.full_name,pr.email) assigned_name,
    '/vendas/'||s.id::text href,
    s.notes,
    s.total_amount amount,
    s.created_at
  from public.sales s
  left join public.customers c on c.id=s.customer_id
  left join sale_products sp on sp.sale_id=s.id
  left join public.profiles pr on pr.id=s.created_by
  where s.record_type='sale'
    and s.general_status<>'cancelled'
    and s.delivery_status='to_deliver'
    and s.delivery_due_at is not null
),
post_sale_events as (
  select
    'sale_post_sale:'||b.id::text event_key,
    'sale_post_sale'::text source_type,
    b.id source_id,
    'post_sale'::text category,
    'Pós-venda · '||b.customer_name title,
    coalesce(b.product_summary,'Venda entregue') ||
      case when b.sale_count>1 then ' · '||b.sale_count::text||' compras' else '' end subtitle,
    ((b.due_on::timestamp+interval '12 hours') at time zone 'America/Sao_Paulo') due_at,
    b.due_on due_date,
    b.status,
    case
      when b.status='planned'
       and b.due_on<(now() at time zone 'America/Sao_Paulo')::date
      then 'urgent'
      else 'normal'
    end priority,
    b.customer_id,
    b.customer_name,
    b.customer_phone,
    b.latest_sale_id sale_id,
    null::uuid purchase_order_id,
    b.created_by assigned_to,
    coalesce(pr.full_name,pr.email) assigned_name,
    '/pos-venda/'||b.id::text href,
    b.notes,
    b.total_amount amount,
    b.created_at
  from public.post_sale_batch_overview b
  left join public.profiles pr on pr.id=b.created_by
),
supplier_events as (
  select
    'purchase_order:'||po.id::text event_key,
    'purchase_order'::text source_type,
    po.id source_id,
    'supplier'::text category,
    'Chegada prevista · '||pos.supplier_name title,
    coalesce(pos.product_summary,pos.pending_units::text||' unidade(s) a caminho') subtitle,
    ((po.expected_on::timestamp+interval '12 hours') at time zone 'America/Sao_Paulo') due_at,
    po.expected_on due_date,
    'planned'::text status,
    case
      when po.expected_on<(now() at time zone 'America/Sao_Paulo')::date then 'attention'
      else 'normal'
    end priority,
    null::uuid customer_id,
    null::text customer_name,
    null::text customer_phone,
    null::uuid sale_id,
    po.id purchase_order_id,
    po.created_by assigned_to,
    coalesce(pr.full_name,pr.email) assigned_name,
    '/pedidos-fornecedor/'||po.id::text href,
    po.notes,
    pos.order_total amount,
    po.created_at
  from public.purchase_orders po
  join public.supplier_order_summary pos on pos.id=po.id
  left join public.profiles pr on pr.id=po.created_by
  where po.status in ('pending','partial')
    and po.expected_on is not null
)
select * from manual_events
union all select * from interaction_events
union all select * from payment_events
union all select * from delivery_events
union all select * from post_sale_events
union all select * from supplier_events;

grant select on public.operational_calendar_events
to authenticated,service_role;
