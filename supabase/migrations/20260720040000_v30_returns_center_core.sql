begin;

create table if not exists public.return_cases (
  id uuid primary key default gen_random_uuid(),
  case_number bigint generated always as identity unique,
  operation text not null check (operation in ('supplements','fitness')),
  case_type text not null check (case_type in ('exchange','return','warranty','wrong_item','damage','other')),
  original_sale_id uuid references public.sales(id) on delete restrict,
  original_fitness_sale_id uuid references public.fitness_sales(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  reason text not null,
  status text not null default 'requested'
    check (status in ('requested','received','inspection','resolved','rejected','cancelled')),
  resolution text check (resolution in ('exchange','refund','replacement','no_action')),
  financial_status text not null default 'not_applicable'
    check (financial_status in ('not_applicable','pending','scheduled','settled')),
  refund_amount numeric(12,2) not null default 0 check (refund_amount>=0),
  bank_charge_id uuid references public.bank_charges(id) on delete set null,
  requested_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  received_on date,
  resolved_on date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (operation='supplements' and original_sale_id is not null and original_fitness_sale_id is null)
    or
    (operation='fitness' and original_fitness_sale_id is not null and original_sale_id is null)
  )
);

create table if not exists public.return_case_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.return_cases(id) on delete cascade,
  sale_item_id uuid references public.sale_items(id) on delete restrict,
  fitness_sale_item_id uuid references public.fitness_sale_items(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  flavor_id uuid references public.product_flavors(id) on delete restrict,
  variant_id uuid references public.fitness_variants(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  item_name text not null,
  variant_label text,
  quantity_sold integer not null check (quantity_sold>0),
  quantity_requested integer not null check (quantity_requested>0),
  quantity_received integer not null default 0 check (quantity_received>=0),
  unit_cost numeric(12,2) not null default 0,
  unit_price numeric(12,2) not null default 0,
  item_condition text not null default 'pending'
    check (item_condition in ('pending','sealed','unused','opened','used','damaged','defective','wrong_item')),
  disposition text not null default 'pending'
    check (disposition in ('pending','restock','quarantine','discard','return_supplier')),
  restocked_quantity integer not null default 0 check (restocked_quantity>=0),
  notes text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (sale_item_id is not null and fitness_sale_item_id is null and product_id is not null and variant_id is null)
    or
    (fitness_sale_item_id is not null and sale_item_id is null and variant_id is not null and product_id is null)
  )
);

create table if not exists public.return_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.return_cases(id) on delete cascade,
  event_type text not null,
  description text,
  details jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists return_cases_operation_status_idx
  on public.return_cases(operation,status,requested_on desc);
create index if not exists return_cases_original_sale_idx
  on public.return_cases(original_sale_id)
  where original_sale_id is not null;
create index if not exists return_cases_original_fitness_sale_idx
  on public.return_cases(original_fitness_sale_id)
  where original_fitness_sale_id is not null;
create index if not exists return_case_items_case_idx
  on public.return_case_items(case_id);
create index if not exists return_case_events_case_idx
  on public.return_case_events(case_id,created_at desc);

alter table public.return_cases enable row level security;
alter table public.return_case_items enable row level security;
alter table public.return_case_events enable row level security;

drop policy if exists return_cases_read on public.return_cases;
create policy return_cases_read
on public.return_cases
for select
to authenticated
using (
  case operation
    when 'supplements' then (select public.can_access_operation('supplements'))
    when 'fitness' then (select public.can_access_operation('fitness'))
    else false
  end
);

drop policy if exists return_case_items_read on public.return_case_items;
create policy return_case_items_read
on public.return_case_items
for select
to authenticated
using (
  exists(
    select 1
    from public.return_cases rc
    where rc.id=case_id
      and (
        (rc.operation='supplements' and (select public.can_access_operation('supplements')))
        or
        (rc.operation='fitness' and (select public.can_access_operation('fitness')))
      )
  )
);

drop policy if exists return_case_events_read on public.return_case_events;
create policy return_case_events_read
on public.return_case_events
for select
to authenticated
using (
  exists(
    select 1
    from public.return_cases rc
    where rc.id=case_id
      and (
        (rc.operation='supplements' and (select public.can_access_operation('supplements')))
        or
        (rc.operation='fitness' and (select public.can_access_operation('fitness')))
      )
  )
);

revoke insert,update,delete,truncate on public.return_cases from authenticated,anon;
revoke insert,update,delete,truncate on public.return_case_items from authenticated,anon;
revoke insert,update,delete,truncate on public.return_case_events from authenticated,anon;

grant select
on public.return_cases,public.return_case_items,public.return_case_events
to authenticated,service_role;

create or replace view public.return_eligible_sale_items
with (security_invoker=true)
as
with supplement_returned as (
  select
    rci.sale_item_id,
    coalesce(sum(rci.quantity_requested),0)::integer as quantity_returned_or_open
  from public.return_case_items rci
  join public.return_cases rc on rc.id=rci.case_id
  where rci.sale_item_id is not null
    and rc.status not in ('rejected','cancelled')
  group by rci.sale_item_id
),
fitness_returned as (
  select
    rci.fitness_sale_item_id,
    coalesce(sum(rci.quantity_requested),0)::integer as quantity_returned_or_open
  from public.return_case_items rci
  join public.return_cases rc on rc.id=rci.case_id
  where rci.fitness_sale_item_id is not null
    and rc.status not in ('rejected','cancelled')
  group by rci.fitness_sale_item_id
)
select
  'supplements'::text as operation,
  s.id as sale_id,
  s.quoted_at::date as sale_on,
  s.delivered_at::date as delivered_on,
  s.customer_id,
  coalesce(c.name,s.reference,'Cliente') as customer_name,
  coalesce(c.phone,s.phone) as customer_phone,
  si.id as item_id,
  si.product_id,
  null::uuid as variant_id,
  si.flavor_id,
  p.name as item_name,
  pf.name as variant_label,
  si.quantity as quantity_sold,
  coalesce(sr.quantity_returned_or_open,0)::integer as quantity_returned_or_open,
  greatest(si.quantity-coalesce(sr.quantity_returned_or_open,0),0)::integer as quantity_available,
  si.unit_cost,
  si.unit_price
from public.sales s
join public.sale_items si on si.sale_id=s.id
join public.products p on p.id=si.product_id
left join public.product_flavors pf on pf.id=si.flavor_id
left join public.customers c on c.id=s.customer_id
left join supplement_returned sr on sr.sale_item_id=si.id
where s.record_type='sale'
  and s.general_status<>'cancelled'
  and s.delivery_status='delivered'

union all

select
  'fitness'::text,
  fs.id,
  fs.quoted_on,
  fs.delivered_on,
  fs.customer_id,
  fs.customer_name,
  fs.customer_phone,
  fsi.id,
  null::uuid,
  fsi.variant_id,
  null::uuid,
  fp.name,
  concat_ws(' · ',fv.color,fv.size),
  fsi.quantity,
  coalesce(fr.quantity_returned_or_open,0)::integer,
  greatest(fsi.quantity-coalesce(fr.quantity_returned_or_open,0),0)::integer,
  fsi.unit_cost,
  fsi.unit_price
from public.fitness_sales fs
join public.fitness_sale_items fsi on fsi.sale_id=fs.id
join public.fitness_variants fv on fv.id=fsi.variant_id
join public.fitness_products fp on fp.id=fv.product_id
left join fitness_returned fr on fr.fitness_sale_item_id=fsi.id
where fs.general_status<>'cancelled'
  and fs.delivery_status='delivered';

grant select on public.return_eligible_sale_items to authenticated,service_role;

commit;
