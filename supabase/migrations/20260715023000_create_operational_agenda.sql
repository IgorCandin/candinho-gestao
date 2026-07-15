-- Agenda operacional da Candinho Suplementos.

alter table public.sales
  add column if not exists delivery_due_at date;

alter table public.purchase_orders
  add column if not exists expected_on date;

create table if not exists public.operational_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 2 and 160),
  category text not null default 'task' check (category in ('task','delivery','payment','follow_up','post_sale','supplier','other')),
  due_at timestamptz not null,
  status text not null default 'planned' check (status in ('planned','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('normal','attention','urgent')),
  customer_id uuid references public.customers(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  notes text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operational_tasks_due_status_idx
  on public.operational_tasks(status,due_at);
create index if not exists operational_tasks_customer_idx
  on public.operational_tasks(customer_id) where customer_id is not null;
create index if not exists operational_tasks_sale_idx
  on public.operational_tasks(sale_id) where sale_id is not null;
create index if not exists operational_tasks_assignee_idx
  on public.operational_tasks(assigned_to) where assigned_to is not null;
create index if not exists sales_delivery_due_idx
  on public.sales(delivery_due_at) where delivery_due_at is not null;
create index if not exists purchase_orders_expected_idx
  on public.purchase_orders(expected_on) where expected_on is not null;

alter table public.operational_tasks enable row level security;

drop policy if exists operational_tasks_read on public.operational_tasks;
create policy operational_tasks_read on public.operational_tasks
  for select to authenticated
  using (public.can_access_operation('supplements'));

drop policy if exists operational_tasks_write on public.operational_tasks;
create policy operational_tasks_write on public.operational_tasks
  for all to authenticated
  using (public.can_write())
  with check (public.can_write());

drop trigger if exists operational_tasks_set_updated_at on public.operational_tasks;
create trigger operational_tasks_set_updated_at
before update on public.operational_tasks
for each row execute function public.set_updated_at();

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
    case when coalesce(s.post_sale_status,'planned') in ('completed','cancelled') then s.post_sale_status else 'planned' end,
    case when s.post_sale_due_at < (now() at time zone 'America/Sao_Paulo')::date and coalesce(s.post_sale_status,'planned')='planned' then 'urgent' else 'normal' end,
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

create or replace view public.operational_agenda_summary
with (security_invoker = true)
as
select
  count(*) filter(where status='planned' and due_date=(now() at time zone 'America/Sao_Paulo')::date)::integer as today_count,
  count(*) filter(where status='planned' and due_date<(now() at time zone 'America/Sao_Paulo')::date)::integer as overdue_count,
  count(*) filter(where status='planned' and due_date>(now() at time zone 'America/Sao_Paulo')::date and due_date<=(now() at time zone 'America/Sao_Paulo')::date+7)::integer as next_seven_days_count,
  count(*) filter(where status='completed' and date_trunc('month',due_date::timestamp)=date_trunc('month',(now() at time zone 'America/Sao_Paulo')::timestamp))::integer as completed_month_count
from public.operational_calendar_events;

create or replace function public.create_operational_task(
  p_title text,
  p_category text,
  p_due_at timestamptz,
  p_priority text default 'normal',
  p_customer_id uuid default null,
  p_sale_id uuid default null,
  p_purchase_order_id uuid default null,
  p_assigned_to uuid default null,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_id uuid;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para criar tarefas'; end if;
  if p_title is null or length(btrim(p_title)) < 2 then raise exception 'Informe o título da tarefa'; end if;
  if p_category not in ('task','delivery','payment','follow_up','post_sale','supplier','other') then raise exception 'Categoria inválida'; end if;
  if p_priority not in ('normal','attention','urgent') then raise exception 'Prioridade inválida'; end if;
  if p_due_at is null then raise exception 'Informe a data da tarefa'; end if;
  if p_customer_id is not null and not exists(select 1 from public.customers where id=p_customer_id) then raise exception 'Cliente não encontrado'; end if;
  if p_sale_id is not null and not exists(select 1 from public.sales where id=p_sale_id and record_type='sale') then raise exception 'Venda não encontrada'; end if;
  if p_purchase_order_id is not null and not exists(select 1 from public.purchase_orders where id=p_purchase_order_id) then raise exception 'Pedido de fornecedor não encontrado'; end if;
  if p_assigned_to is not null and not exists(select 1 from public.profiles where id=p_assigned_to and active and can_access_supplements) then raise exception 'Responsável inválido'; end if;

  insert into public.operational_tasks(title,category,due_at,priority,customer_id,sale_id,purchase_order_id,assigned_to,notes)
  values(btrim(p_title),p_category,p_due_at,p_priority,p_customer_id,p_sale_id,p_purchase_order_id,p_assigned_to,nullif(btrim(p_notes),''))
  returning id into v_id;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('operational_task',v_id,'created',jsonb_build_object('category',p_category,'due_at',p_due_at,'assigned_to',p_assigned_to));
  return v_id;
end $$;

create or replace function public.reschedule_operational_event(
  p_source_type text,
  p_source_id uuid,
  p_due_at timestamptz
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_due date; v_customer_id uuid;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para reagendar eventos'; end if;
  if p_due_at is null then raise exception 'Informe a nova data'; end if;
  v_due := (p_due_at at time zone 'America/Sao_Paulo')::date;

  case p_source_type
    when 'task' then
      update public.operational_tasks set due_at=p_due_at,status='planned',completed_at=null,cancelled_at=null where id=p_source_id;
    when 'interaction' then
      update public.customer_interactions set due_at=v_due,status='planned',completed_at=null where id=p_source_id returning customer_id into v_customer_id;
      update public.customers set crm_status='follow_up',next_contact_at=v_due,contact_lost=false,updated_at=now() where id=v_customer_id;
    when 'sale_payment' then update public.sales set payment_due_at=v_due,updated_at=now() where id=p_source_id and record_type='sale' and payment_status='receivable';
    when 'sale_delivery' then update public.sales set delivery_due_at=v_due,updated_at=now() where id=p_source_id and record_type='sale' and delivery_status='to_deliver';
    when 'sale_post_sale' then update public.sales set post_sale_due_at=v_due,post_sale_status='planned',updated_at=now() where id=p_source_id and record_type='sale';
    when 'purchase_order' then update public.purchase_orders set expected_on=v_due,updated_at=now() where id=p_source_id and status in ('pending','partial');
    else raise exception 'Tipo de evento inválido';
  end case;
  if not found then raise exception 'Evento não encontrado ou já concluído'; end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('operational_event',p_source_id,'rescheduled',jsonb_build_object('source_type',p_source_type,'due_at',p_due_at));
  return p_source_id;
end $$;

create or replace function public.complete_operational_event(
  p_source_type text,
  p_source_id uuid,
  p_completed_on date default null,
  p_outcome text default null,
  p_notes text default null,
  p_payment_method text default null
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare
  v_on date := coalesce(p_completed_on,(now() at time zone 'America/Sao_Paulo')::date);
  v_at timestamptz := ((coalesce(p_completed_on,(now() at time zone 'America/Sao_Paulo')::date))::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo';
  v_customer_id uuid;
  v_sale_id uuid;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para concluir eventos'; end if;

  case p_source_type
    when 'task' then
      update public.operational_tasks
      set status='completed',completed_at=v_at,cancelled_at=null,
          notes=case when nullif(btrim(p_notes),'') is null then notes else concat_ws(E'\n',notes,'Concluído: '||btrim(p_notes)) end
      where id=p_source_id and status='planned';
    when 'interaction' then
      select customer_id,sale_id into v_customer_id,v_sale_id from public.customer_interactions where id=p_source_id and status='planned';
      if not found then raise exception 'Retorno não encontrado ou já concluído'; end if;
      perform public.register_customer_interaction(v_customer_id,'contact',v_on,'Outro',coalesce(nullif(btrim(p_outcome),''),'Concluído pela Agenda'),p_notes,v_sale_id,null,p_source_id);
      return p_source_id;
    when 'sale_payment' then
      if p_payment_method is null then raise exception 'Informe a forma de pagamento'; end if;
      perform public.mark_sale_received(p_source_id,v_on,p_payment_method);
      return p_source_id;
    when 'sale_delivery' then
      perform public.mark_sale_delivered(p_source_id,v_on);
      return p_source_id;
    when 'sale_post_sale' then
      select customer_id into v_customer_id from public.sales where id=p_source_id and record_type='sale';
      if not found then raise exception 'Venda não encontrada'; end if;
      if v_customer_id is not null then
        perform public.register_customer_interaction(v_customer_id,'post_sale',v_on,'Outro',coalesce(nullif(btrim(p_outcome),''),'Pós-venda concluído pela Agenda'),p_notes,p_source_id,null,null);
      end if;
      update public.sales set post_sale_status='completed',updated_at=now() where id=p_source_id;
    when 'purchase_order' then
      raise exception 'Receba os itens do pedido para concluí-lo';
    else raise exception 'Tipo de evento inválido';
  end case;
  if not found then raise exception 'Evento não encontrado ou já concluído'; end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('operational_event',p_source_id,'completed',jsonb_build_object('source_type',p_source_type,'completed_on',v_on));
  return p_source_id;
end $$;

create or replace function public.cancel_operational_event(
  p_source_type text,
  p_source_id uuid,
  p_reason text default null
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_customer_id uuid;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para cancelar eventos'; end if;
  case p_source_type
    when 'task' then
      update public.operational_tasks set status='cancelled',cancelled_at=now(),notes=concat_ws(E'\n',notes,nullif(btrim(p_reason),'')) where id=p_source_id and status='planned';
    when 'interaction' then
      update public.customer_interactions set status='cancelled',completed_at=now(),notes=concat_ws(E'\n',notes,nullif(btrim(p_reason),'')) where id=p_source_id and status='planned' returning customer_id into v_customer_id;
      update public.customers c set
        next_contact_at=(select min(ci.due_at) from public.customer_interactions ci where ci.customer_id=c.id and ci.status='planned'),
        crm_status=case when exists(select 1 from public.customer_interactions ci where ci.customer_id=c.id and ci.status='planned') then 'follow_up' else 'active' end,
        updated_at=now()
      where c.id=v_customer_id;
    when 'sale_post_sale' then
      update public.sales set post_sale_status='cancelled',updated_at=now(),notes=concat_ws(E'\n',notes,nullif(btrim(p_reason),'')) where id=p_source_id;
    else raise exception 'Este tipo de compromisso não pode ser cancelado pela Agenda';
  end case;
  if not found then raise exception 'Evento não encontrado ou já concluído'; end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('operational_event',p_source_id,'cancelled',jsonb_build_object('source_type',p_source_type,'reason',p_reason));
  return p_source_id;
end $$;

create or replace function public.append_operational_event_note(
  p_source_type text,
  p_source_id uuid,
  p_note text
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_note text;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para adicionar observações'; end if;
  v_note := nullif(btrim(p_note),'');
  if v_note is null then raise exception 'Digite uma observação'; end if;
  v_note := to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') || ' · ' || v_note;

  case p_source_type
    when 'task' then update public.operational_tasks set notes=concat_ws(E'\n',notes,v_note) where id=p_source_id;
    when 'interaction' then update public.customer_interactions set notes=concat_ws(E'\n',notes,v_note) where id=p_source_id;
    when 'sale_payment','sale_delivery','sale_post_sale' then update public.sales set notes=concat_ws(E'\n',notes,v_note),updated_at=now() where id=p_source_id;
    when 'purchase_order' then update public.purchase_orders set notes=concat_ws(E'\n',notes,v_note),updated_at=now() where id=p_source_id;
    else raise exception 'Tipo de evento inválido';
  end case;
  if not found then raise exception 'Evento não encontrado'; end if;
  return p_source_id;
end $$;

grant select,insert,update,delete on public.operational_tasks to authenticated;
grant select on public.operational_calendar_events, public.operational_agenda_summary to authenticated;
grant execute on function public.create_operational_task(text,text,timestamptz,text,uuid,uuid,uuid,uuid,text) to authenticated;
grant execute on function public.reschedule_operational_event(text,uuid,timestamptz) to authenticated;
grant execute on function public.complete_operational_event(text,uuid,date,text,text,text) to authenticated;
grant execute on function public.cancel_operational_event(text,uuid,text) to authenticated;
grant execute on function public.append_operational_event_note(text,uuid,text) to authenticated;
