alter table public.products
  add column if not exists thumbnail_url text,
  add column if not exists secondary_thumbnail_url text,
  add column if not exists default_supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists products_default_supplier_id_idx on public.products(default_supplier_id);

create or replace view public.product_catalog as
select
  p.id,
  p.name,
  p.category,
  p.brand,
  p.image_url,
  p.active,
  p.sale_price,
  coalesce(p.installment_price, p.sale_price) as installment_price,
  p.thumbnail_url,
  coalesce(inv.physical_quantity, 0)::integer as physical_quantity,
  coalesce(inv.reserved_quantity, 0)::integer as reserved_quantity,
  coalesce(inv.available_quantity, 0)::integer as available_quantity,
  coalesce(inv.incoming_quantity, 0)::integer as incoming_quantity,
  coalesce(pis.awaiting_sales_quantity, 0)::integer as awaiting_sales_quantity,
  case when not p.active then 'inactive' else coalesce(inv.stock_status, 'out_of_stock') end as stock_status
from public.products p
left join public.inventory_control_overview inv on inv.product_id = p.id
left join public.product_incoming_stock pis on pis.product_id = p.id;

create or replace view public.product_details as
select
  p.id,
  p.name,
  p.category,
  p.brand,
  p.description,
  p.objective,
  p.ideal_profile,
  p.duration_days,
  p.information,
  p.quick_message,
  p.keywords,
  p.level,
  p.sales_category,
  p.image_url,
  p.secondary_image_url,
  p.active,
  p.sale_price,
  coalesce(p.installment_price, p.sale_price) as installment_price,
  coalesce(inv.incoming_quantity, 0)::integer as incoming_quantity,
  coalesce(pis.awaiting_sales_quantity, 0)::integer as awaiting_sales_quantity,
  p.thumbnail_url,
  p.secondary_thumbnail_url,
  coalesce(inv.physical_quantity, 0)::integer as physical_quantity,
  coalesce(inv.reserved_quantity, 0)::integer as reserved_quantity,
  coalesce(inv.available_quantity, 0)::integer as available_quantity,
  case when not p.active then 'inactive' else coalesce(inv.stock_status, 'out_of_stock') end as stock_status
from public.products p
left join public.inventory_control_overview inv on inv.product_id = p.id
left join public.product_incoming_stock pis on pis.product_id = p.id;

create or replace view public.product_management_details as
select
  p.id,
  p.name,
  p.sku,
  p.category,
  p.brand,
  p.description,
  p.cost_price,
  p.sale_price,
  coalesce(p.installment_price, p.sale_price) as installment_price,
  p.min_stock,
  coalesce(p.ideal_stock, p.min_stock) as ideal_stock,
  p.image_url,
  p.thumbnail_url,
  p.secondary_image_url,
  p.secondary_thumbnail_url,
  p.active,
  p.restricted,
  p.objective,
  p.ideal_profile,
  p.duration_days,
  p.information,
  p.quick_message,
  p.keywords,
  p.level,
  p.sales_category,
  p.default_supplier_id,
  s.name as default_supplier_name,
  coalesce(inv.physical_quantity, 0)::integer as physical_quantity,
  coalesce(inv.reserved_quantity, 0)::integer as reserved_quantity,
  coalesce(inv.available_quantity, 0)::integer as available_quantity,
  coalesce(inv.incoming_quantity, 0)::integer as incoming_quantity,
  coalesce(pis.awaiting_sales_quantity, 0)::integer as awaiting_sales_quantity,
  case when not p.active then 'inactive' else coalesce(inv.stock_status, 'out_of_stock') end as stock_status,
  p.updated_at
from public.products p
left join public.suppliers s on s.id = p.default_supplier_id
left join public.inventory_control_overview inv on inv.product_id = p.id
left join public.product_incoming_stock pis on pis.product_id = p.id;

create or replace function public.create_product_record(
  p_name text,
  p_category text,
  p_brand text default null,
  p_sku text default null,
  p_cost_price numeric default 0,
  p_sale_price numeric default 0,
  p_installment_price numeric default null,
  p_min_stock integer default 0,
  p_ideal_stock integer default null,
  p_default_supplier_id uuid default null,
  p_description text default null,
  p_objective text default null,
  p_ideal_profile text default null,
  p_duration_days integer default null,
  p_information text default null,
  p_quick_message text default null,
  p_keywords text default null,
  p_level text default null,
  p_sales_category text default null,
  p_restricted boolean default false,
  p_active boolean default true
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para cadastrar produtos';
  end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Informe o nome do produto'; end if;
  if nullif(btrim(p_category), '') is null then raise exception 'Informe a categoria'; end if;
  if coalesce(p_cost_price, 0) < 0 or coalesce(p_sale_price, 0) < 0 or coalesce(p_installment_price, p_sale_price, 0) < 0 then
    raise exception 'Os preços não podem ser negativos';
  end if;
  if coalesce(p_min_stock, 0) < 0 or coalesce(p_ideal_stock, p_min_stock, 0) < 0 then
    raise exception 'Os níveis de estoque não podem ser negativos';
  end if;
  if p_duration_days is not null and p_duration_days <= 0 then
    raise exception 'A duração precisa ser maior que zero';
  end if;
  if exists(select 1 from public.products where lower(btrim(name)) = lower(btrim(p_name))) then
    raise exception 'Já existe um produto com este nome';
  end if;
  if p_default_supplier_id is not null and not exists(select 1 from public.suppliers where id = p_default_supplier_id and active) then
    raise exception 'Fornecedor padrão inválido ou inativo';
  end if;

  insert into public.products(
    name, sku, category, brand, description, cost_price, sale_price, installment_price,
    min_stock, ideal_stock, active, restricted, objective, ideal_profile, duration_days,
    information, quick_message, keywords, level, sales_category, default_supplier_id
  ) values (
    btrim(p_name), nullif(btrim(p_sku), ''), btrim(p_category), nullif(btrim(p_brand), ''), nullif(btrim(p_description), ''),
    coalesce(p_cost_price, 0), coalesce(p_sale_price, 0), coalesce(p_installment_price, p_sale_price, 0),
    coalesce(p_min_stock, 0), coalesce(p_ideal_stock, p_min_stock, 0), coalesce(p_active, true), coalesce(p_restricted, false),
    nullif(btrim(p_objective), ''), nullif(btrim(p_ideal_profile), ''), p_duration_days,
    nullif(btrim(p_information), ''), nullif(btrim(p_quick_message), ''), nullif(btrim(p_keywords), ''),
    nullif(btrim(p_level), ''), nullif(btrim(p_sales_category), ''), p_default_supplier_id
  ) returning id into v_product_id;

  insert into public.stock_balances(product_id, location_id, quantity)
  select v_product_id, l.id, 0
  from public.locations l
  where l.active and l.tracks_inventory
  on conflict(product_id, location_id) do nothing;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values ('product', v_product_id, 'created', jsonb_build_object('name', btrim(p_name), 'category', btrim(p_category), 'supplier_id', p_default_supplier_id));

  return v_product_id;
end;
$$;

create or replace function public.update_product_record(
  p_product_id uuid,
  p_name text,
  p_category text,
  p_brand text default null,
  p_sku text default null,
  p_cost_price numeric default 0,
  p_sale_price numeric default 0,
  p_installment_price numeric default null,
  p_min_stock integer default 0,
  p_ideal_stock integer default null,
  p_default_supplier_id uuid default null,
  p_description text default null,
  p_objective text default null,
  p_ideal_profile text default null,
  p_duration_days integer default null,
  p_information text default null,
  p_quick_message text default null,
  p_keywords text default null,
  p_level text default null,
  p_sales_category text default null,
  p_restricted boolean default false,
  p_active boolean default true
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para editar produtos';
  end if;
  select to_jsonb(p) into v_before from public.products p where p.id = p_product_id for update;
  if v_before is null then raise exception 'Produto não encontrado'; end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Informe o nome do produto'; end if;
  if nullif(btrim(p_category), '') is null then raise exception 'Informe a categoria'; end if;
  if coalesce(p_cost_price, 0) < 0 or coalesce(p_sale_price, 0) < 0 or coalesce(p_installment_price, p_sale_price, 0) < 0 then
    raise exception 'Os preços não podem ser negativos';
  end if;
  if coalesce(p_min_stock, 0) < 0 or coalesce(p_ideal_stock, p_min_stock, 0) < 0 then
    raise exception 'Os níveis de estoque não podem ser negativos';
  end if;
  if p_duration_days is not null and p_duration_days <= 0 then raise exception 'A duração precisa ser maior que zero'; end if;
  if exists(select 1 from public.products where id <> p_product_id and lower(btrim(name)) = lower(btrim(p_name))) then
    raise exception 'Já existe outro produto com este nome';
  end if;
  if p_default_supplier_id is not null and not exists(select 1 from public.suppliers where id = p_default_supplier_id and active) then
    raise exception 'Fornecedor padrão inválido ou inativo';
  end if;

  update public.products set
    name = btrim(p_name),
    sku = nullif(btrim(p_sku), ''),
    category = btrim(p_category),
    brand = nullif(btrim(p_brand), ''),
    description = nullif(btrim(p_description), ''),
    cost_price = coalesce(p_cost_price, 0),
    sale_price = coalesce(p_sale_price, 0),
    installment_price = coalesce(p_installment_price, p_sale_price, 0),
    min_stock = coalesce(p_min_stock, 0),
    ideal_stock = coalesce(p_ideal_stock, p_min_stock, 0),
    active = coalesce(p_active, true),
    restricted = coalesce(p_restricted, false),
    objective = nullif(btrim(p_objective), ''),
    ideal_profile = nullif(btrim(p_ideal_profile), ''),
    duration_days = p_duration_days,
    information = nullif(btrim(p_information), ''),
    quick_message = nullif(btrim(p_quick_message), ''),
    keywords = nullif(btrim(p_keywords), ''),
    level = nullif(btrim(p_level), ''),
    sales_category = nullif(btrim(p_sales_category), ''),
    default_supplier_id = p_default_supplier_id,
    updated_at = now()
  where id = p_product_id;

  insert into public.audit_events(entity_type, entity_id, action, details)
  values ('product', p_product_id, 'updated', jsonb_build_object('before', v_before, 'name', btrim(p_name), 'category', btrim(p_category), 'supplier_id', p_default_supplier_id));

  return p_product_id;
end;
$$;

create or replace function public.set_product_image(
  p_product_id uuid,
  p_slot text,
  p_image_url text,
  p_thumbnail_url text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para alterar fotos'; end if;
  if not exists(select 1 from public.products where id = p_product_id) then raise exception 'Produto não encontrado'; end if;
  if p_slot = 'primary' then
    update public.products set image_url = p_image_url, thumbnail_url = p_thumbnail_url, updated_at = now() where id = p_product_id;
  elsif p_slot = 'secondary' then
    update public.products set secondary_image_url = p_image_url, secondary_thumbnail_url = p_thumbnail_url, updated_at = now() where id = p_product_id;
  else
    raise exception 'Tipo de foto inválido';
  end if;
  insert into public.audit_events(entity_type, entity_id, action, details)
  values ('product', p_product_id, 'image_updated', jsonb_build_object('slot', p_slot, 'has_image', p_image_url is not null, 'has_thumbnail', p_thumbnail_url is not null));
  return p_product_id;
end;
$$;

revoke all on function public.create_product_record(text,text,text,text,numeric,numeric,numeric,integer,integer,uuid,text,text,text,integer,text,text,text,text,text,boolean,boolean) from public, anon;
revoke all on function public.update_product_record(uuid,text,text,text,text,numeric,numeric,numeric,integer,integer,uuid,text,text,text,integer,text,text,text,text,text,boolean,boolean) from public, anon;
revoke all on function public.set_product_image(uuid,text,text,text) from public, anon;
grant execute on function public.create_product_record(text,text,text,text,numeric,numeric,numeric,integer,integer,uuid,text,text,text,integer,text,text,text,text,text,boolean,boolean) to authenticated;
grant execute on function public.update_product_record(uuid,text,text,text,text,numeric,numeric,numeric,integer,integer,uuid,text,text,text,integer,text,text,text,text,text,boolean,boolean) to authenticated;
grant execute on function public.set_product_image(uuid,text,text,text) to authenticated;

grant select on public.product_catalog, public.product_details, public.product_management_details to authenticated;
revoke all on public.product_management_details from anon;
