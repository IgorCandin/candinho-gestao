create table if not exists public.product_combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  installment_price numeric(12,2) not null default 0 check (installment_price >= 0),
  image_url text,
  active boolean not null default true,
  legacy_product_id uuid unique references public.products(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references public.product_combos(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique(combo_id, product_id)
);

create index if not exists product_combo_items_combo_idx on public.product_combo_items(combo_id);
create index if not exists product_combo_items_product_idx on public.product_combo_items(product_id);

alter table public.product_combos enable row level security;
alter table public.product_combo_items enable row level security;

drop policy if exists product_combos_read on public.product_combos;
create policy product_combos_read on public.product_combos for select to authenticated using (public.can_access_operation('supplements'));
drop policy if exists product_combos_write on public.product_combos;
create policy product_combos_write on public.product_combos for all to authenticated using (public.can_write()) with check (public.can_write());

drop policy if exists product_combo_items_read on public.product_combo_items;
create policy product_combo_items_read on public.product_combo_items for select to authenticated using (public.can_access_operation('supplements'));
drop policy if exists product_combo_items_write on public.product_combo_items;
create policy product_combo_items_write on public.product_combo_items for all to authenticated using (public.can_write()) with check (public.can_write());

grant select, insert, update, delete on public.product_combos to authenticated;
grant select, insert, update, delete on public.product_combo_items to authenticated;

create or replace function public.set_product_combo_updated_at()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_combos_set_updated_at on public.product_combos;
create trigger product_combos_set_updated_at before update on public.product_combos for each row execute function public.set_product_combo_updated_at();

create or replace view public.product_combo_overview
with (security_invoker = true)
as
with item_rollup as (
  select
    c.id as combo_id,
    count(i.id)::integer as component_count,
    coalesce(sum(p.cost_price * i.quantity),0)::numeric(12,2) as calculated_cost,
    string_agg(p.name || ' ×' || i.quantity::text, ' + ' order by p.name) as component_summary,
    case when count(i.id)=0 then 0 else min(floor(coalesce(inv.available_quantity,0)::numeric / i.quantity))::integer end as available_quantity,
    case when count(i.id)=0 then 0 else greatest(
      min(floor((coalesce(inv.available_quantity,0)+coalesce(inv.incoming_quantity,0))::numeric / i.quantity))::integer
      - min(floor(coalesce(inv.available_quantity,0)::numeric / i.quantity))::integer,
      0
    ) end as incoming_quantity
  from public.product_combos c
  left join public.product_combo_items i on i.combo_id=c.id
  left join public.products p on p.id=i.product_id
  left join public.inventory_control_overview inv on inv.product_id=i.product_id
  group by c.id
)
select
  c.id,
  c.name,
  c.description,
  c.sale_price,
  c.installment_price,
  c.image_url,
  c.active,
  c.legacy_product_id,
  c.created_at,
  c.updated_at,
  coalesce(r.component_count,0) as component_count,
  coalesce(r.calculated_cost,0)::numeric(12,2) as calculated_cost,
  r.component_summary,
  coalesce(r.available_quantity,0) as available_quantity,
  coalesce(r.incoming_quantity,0) as incoming_quantity,
  case when coalesce(r.component_count,0)=0 then 'needs_setup'
       when coalesce(r.available_quantity,0)>0 then 'available'
       when coalesce(r.incoming_quantity,0)>0 then 'incoming'
       else 'out_of_stock' end as stock_status
from public.product_combos c
left join item_rollup r on r.combo_id=c.id;

grant select on public.product_combo_overview to authenticated, service_role;

create or replace function public.save_product_combo(
  p_combo_id uuid,
  p_name text,
  p_description text,
  p_sale_price numeric,
  p_installment_price numeric,
  p_image_url text,
  p_active boolean,
  p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_combo_id uuid;
  v_item record;
  v_count integer := 0;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para salvar combos'; end if;
  if nullif(btrim(p_name),'') is null then raise exception 'Informe o nome do combo'; end if;
  if coalesce(p_sale_price,0) < 0 or coalesce(p_installment_price,p_sale_price,0) < 0 then raise exception 'Os preços não podem ser negativos'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Informe os produtos do combo'; end if;

  select count(*) into v_count from jsonb_array_elements(p_items);
  if v_count < 2 then raise exception 'Um combo precisa ter pelo menos 2 produtos'; end if;
  if v_count > 20 then raise exception 'Um combo pode ter no máximo 20 produtos'; end if;
  if exists(
    select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    group by product_id having count(*) > 1
  ) then raise exception 'O mesmo produto não pode aparecer duas vezes no combo'; end if;

  for v_item in select product_id, quantity from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer) loop
    if v_item.product_id is null or coalesce(v_item.quantity,0) <= 0 then raise exception 'Revise os produtos e quantidades do combo'; end if;
    if not exists(select 1 from public.products p where p.id=v_item.product_id and p.active and lower(p.name) not like '%combo%') then
      raise exception 'Produto inválido, inativo ou outro combo não pode ser usado como componente';
    end if;
  end loop;

  if p_combo_id is null then
    if exists(select 1 from public.product_combos where lower(btrim(name))=lower(btrim(p_name))) then raise exception 'Já existe um combo com este nome'; end if;
    insert into public.product_combos(name,description,sale_price,installment_price,image_url,active)
    values(btrim(p_name),nullif(btrim(p_description),''),coalesce(p_sale_price,0),coalesce(p_installment_price,p_sale_price,0),nullif(btrim(p_image_url),''),coalesce(p_active,true))
    returning id into v_combo_id;
  else
    if not exists(select 1 from public.product_combos where id=p_combo_id) then raise exception 'Combo não encontrado'; end if;
    if exists(select 1 from public.product_combos where id<>p_combo_id and lower(btrim(name))=lower(btrim(p_name))) then raise exception 'Já existe outro combo com este nome'; end if;
    update public.product_combos set
      name=btrim(p_name), description=nullif(btrim(p_description),''), sale_price=coalesce(p_sale_price,0),
      installment_price=coalesce(p_installment_price,p_sale_price,0), image_url=nullif(btrim(p_image_url),''), active=coalesce(p_active,true)
    where id=p_combo_id;
    v_combo_id := p_combo_id;
    delete from public.product_combo_items where combo_id=v_combo_id;
  end if;

  insert into public.product_combo_items(combo_id,product_id,quantity)
  select v_combo_id, x.product_id, x.quantity
  from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer);

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('product_combo',v_combo_id,case when p_combo_id is null then 'created' else 'updated' end,
    jsonb_build_object('name',btrim(p_name),'sale_price',p_sale_price,'component_count',v_count));

  return v_combo_id;
end;
$$;

grant execute on function public.save_product_combo(uuid,text,text,numeric,numeric,text,boolean,jsonb) to authenticated;

insert into public.product_combos(name,description,sale_price,installment_price,image_url,active,legacy_product_id)
select p.name,p.description,p.sale_price,coalesce(p.installment_price,p.sale_price),p.image_url,p.active,p.id
from public.products p
where lower(p.name) like '%combo%'
on conflict (legacy_product_id) do update set
  name=excluded.name,
  description=excluded.description,
  sale_price=excluded.sale_price,
  installment_price=excluded.installment_price,
  image_url=excluded.image_url,
  active=excluded.active,
  updated_at=now();
