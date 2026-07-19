-- V25 · Pós-venda consolidado por cliente e janela de compras.
-- Versão canônica final, segura para replay: não apaga lotes planejados existentes.

create table if not exists public.post_sale_batches (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  due_on date not null,
  anchor_due_on date not null,
  status text not null default 'planned'
    check (status in ('planned','completed','cancelled')),
  notes text,
  ai_last_message text,
  ai_last_generated_at timestamptz,
  ai_metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_sale_batch_sales (
  batch_id uuid not null references public.post_sale_batches(id) on delete cascade,
  sale_id uuid not null unique references public.sales(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(batch_id,sale_id)
);

alter table public.post_sale_batches
  add column if not exists anchor_due_on date;

update public.post_sale_batches
set anchor_due_on=due_on
where anchor_due_on is null;

alter table public.post_sale_batches
  alter column anchor_due_on set not null;

create index if not exists post_sale_batches_customer_status_due_idx
  on public.post_sale_batches(customer_id,status,due_on);

create index if not exists post_sale_batches_due_open_idx
  on public.post_sale_batches(due_on)
  where status='planned';

create index if not exists post_sale_batch_sales_batch_idx
  on public.post_sale_batch_sales(batch_id);

alter table public.post_sale_batches enable row level security;
alter table public.post_sale_batch_sales enable row level security;

drop policy if exists post_sale_batches_read on public.post_sale_batches;
create policy post_sale_batches_read
  on public.post_sale_batches
  for select
  to authenticated
  using ((select public.can_access_operation('supplements')));

drop policy if exists post_sale_batch_sales_read on public.post_sale_batch_sales;
create policy post_sale_batch_sales_read
  on public.post_sale_batch_sales
  for select
  to authenticated
  using ((select public.can_access_operation('supplements')));

revoke all on public.post_sale_batches,public.post_sale_batch_sales
from anon,authenticated;

grant select on public.post_sale_batches,public.post_sale_batch_sales
to authenticated,service_role;

grant all on public.post_sale_batches,public.post_sale_batch_sales
to service_role;

create or replace function public.post_sale_status_is_open(p_status text)
returns boolean
language sql
immutable
set search_path=public
as $$
  select lower(coalesce(btrim(p_status),'')) not in (
    'completed','concluído','concluido',
    'cancelled','cancelado','contato perdido'
  );
$$;

revoke all on function public.post_sale_status_is_open(text)
from public,anon,authenticated;

create or replace function public.sync_post_sale_batch_for_sale(p_sale_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_sale public.sales%rowtype;
  v_customer_name text;
  v_batch uuid;
  v_existing uuid;
begin
  select * into v_sale
  from public.sales
  where id=p_sale_id;

  if not found then return null; end if;

  if v_sale.record_type<>'sale'
     or v_sale.general_status='cancelled'
     or v_sale.customer_id is null
     or v_sale.post_sale_due_at is null
     or not public.post_sale_status_is_open(v_sale.post_sale_status)
  then
    return null;
  end if;

  select name into v_customer_name
  from public.customers
  where id=v_sale.customer_id;

  if lower(btrim(coalesce(v_customer_name,'')))='igor candinho'
     or lower(btrim(coalesce(v_customer_name,''))) like 'brinde%'
  then
    return null;
  end if;

  select batch_id into v_existing
  from public.post_sale_batch_sales
  where sale_id=p_sale_id;

  if v_existing is not null then
    select id into v_batch
    from public.post_sale_batches
    where id=v_existing
      and status='planned';

    if v_batch is not null then
      return v_batch;
    end if;
  end if;

  -- A janela é medida pela primeira data do lote (anchor_due_on).
  -- Assim novas compras não empurram indefinidamente o primeiro pós-venda.
  select id into v_batch
  from public.post_sale_batches
  where customer_id=v_sale.customer_id
    and status='planned'
    and abs(anchor_due_on-v_sale.post_sale_due_at)<=14
  order by abs(anchor_due_on-v_sale.post_sale_due_at),anchor_due_on desc
  limit 1
  for update;

  if v_batch is null then
    insert into public.post_sale_batches(
      customer_id,due_on,anchor_due_on,created_by
    )
    values(
      v_sale.customer_id,
      v_sale.post_sale_due_at,
      v_sale.post_sale_due_at,
      v_sale.created_by
    )
    returning id into v_batch;
  else
    update public.post_sale_batches
    set due_on=greatest(due_on,v_sale.post_sale_due_at),
        updated_at=now()
    where id=v_batch;
  end if;

  insert into public.post_sale_batch_sales(batch_id,sale_id)
  values(v_batch,p_sale_id)
  on conflict(sale_id) do update
    set batch_id=excluded.batch_id;

  return v_batch;
end;
$$;

revoke all on function public.sync_post_sale_batch_for_sale(uuid)
from public,anon,authenticated;

create or replace function public.sync_post_sale_batch_trigger()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.record_type='sale'
     and new.customer_id is not null
     and new.post_sale_due_at is not null
     and new.general_status<>'cancelled'
     and public.post_sale_status_is_open(new.post_sale_status)
  then
    perform public.sync_post_sale_batch_for_sale(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists sync_post_sale_batch_after_sale
on public.sales;

create trigger sync_post_sale_batch_after_sale
after insert or update of customer_id,post_sale_due_at,post_sale_status,general_status
on public.sales
for each row
execute function public.sync_post_sale_batch_trigger();

-- Backfill idempotente dos pós-vendas ainda abertos.
do $$
declare r record;
begin
  for r in
    select s.id
    from public.sales s
    join public.customers c on c.id=s.customer_id
    where s.record_type='sale'
      and s.general_status<>'cancelled'
      and s.customer_id is not null
      and s.post_sale_due_at is not null
      and public.post_sale_status_is_open(s.post_sale_status)
      and lower(btrim(coalesce(c.name,'')))<>'igor candinho'
      and lower(btrim(coalesce(c.name,''))) not like 'brinde%'
    order by s.customer_id,s.post_sale_due_at,s.created_at
  loop
    perform public.sync_post_sale_batch_for_sale(r.id);
  end loop;
end
$$;

create or replace view public.post_sale_batch_overview
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
)
select
  b.id,b.customer_id,
  c.name customer_name,c.phone customer_phone,c.city,c.reference,
  b.due_on,b.status,b.notes,
  b.ai_last_message,b.ai_last_generated_at,b.ai_metadata,
  b.completed_at,b.cancelled_at,b.created_by,b.created_at,b.updated_at,
  count(m.sale_id)::integer sale_count,
  coalesce(sum(s.total_amount),0)::numeric(12,2) total_amount,
  max(coalesce(s.delivered_at,s.quoted_at)) last_purchase_at,
  (array_agg(
    s.id
    order by coalesce(s.delivered_at,s.quoted_at) desc nulls last
  ))[1] latest_sale_id,
  string_agg(
    distinct coalesce(sp.product_summary,'Venda'),
    ' | ' order by coalesce(sp.product_summary,'Venda')
  ) product_summary
from public.post_sale_batches b
join public.customers c on c.id=b.customer_id
join public.post_sale_batch_sales m on m.batch_id=b.id
join public.sales s on s.id=m.sale_id
left join sale_products sp on sp.sale_id=s.id
group by b.id,c.id;

grant select on public.post_sale_batch_overview
to authenticated,service_role;

create or replace view public.post_sale_batch_summary
with (security_invoker=true)
as
select
  count(*) filter(where status='planned')::integer open_count,
  count(*) filter(
    where status='planned'
      and due_on<(now() at time zone 'America/Sao_Paulo')::date
  )::integer overdue_count,
  count(*) filter(
    where status='planned'
      and due_on=(now() at time zone 'America/Sao_Paulo')::date
  )::integer today_count,
  count(*) filter(
    where status='planned'
      and due_on>(now() at time zone 'America/Sao_Paulo')::date
      and due_on<=(now() at time zone 'America/Sao_Paulo')::date+7
  )::integer next_seven_days_count
from public.post_sale_batches;

grant select on public.post_sale_batch_summary
to authenticated,service_role;
