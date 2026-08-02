begin;

-- =========================================================
-- 0. BASE DO CADASTRO FITNESS V3 (bucket + fotos por variação)
-- =========================================================

insert into storage.buckets(
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values(
  'fitness-product-images',
  'fitness-product-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists fitness_product_images_insert_v1 on storage.objects;
create policy fitness_product_images_insert_v1
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'fitness-product-images'
  and public.can_write_fitness()
);

drop policy if exists fitness_product_images_update_v1 on storage.objects;
create policy fitness_product_images_update_v1
on storage.objects
for update
to authenticated
using (
  bucket_id = 'fitness-product-images'
  and public.can_write_fitness()
)
with check (
  bucket_id = 'fitness-product-images'
  and public.can_write_fitness()
);

drop policy if exists fitness_product_images_delete_v1 on storage.objects;
create policy fitness_product_images_delete_v1
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'fitness-product-images'
  and public.can_write_fitness()
);

create or replace function public.save_fitness_product_v2(
  p_product_id uuid,
  p_name text,
  p_category text,
  p_description text,
  p_image_url text,
  p_active boolean,
  p_default_supplier_id uuid,
  p_variants jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_product_id uuid;
  v_variant record;
begin
  if not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para alterar a operação Fitness';
  end if;

  if nullif(btrim(p_name),'') is null then
    raise exception 'Informe o nome do produto';
  end if;

  if p_variants is null
     or jsonb_typeof(p_variants) <> 'array'
     or jsonb_array_length(p_variants) = 0 then
    raise exception 'Adicione pelo menos uma variação';
  end if;

  if p_default_supplier_id is not null
     and not exists(
       select 1
       from public.fitness_suppliers
       where id = p_default_supplier_id
         and active
     ) then
    raise exception 'Fornecedor padrão inválido';
  end if;

  if p_product_id is null then
    insert into public.fitness_products(
      name, category, description, image_url, active
    )
    values(
      btrim(p_name),
      coalesce(nullif(btrim(p_category),''),'Vestuário'),
      nullif(btrim(p_description),''),
      nullif(btrim(p_image_url),''),
      coalesce(p_active,true)
    )
    returning id into v_product_id;
  else
    update public.fitness_products
    set
      name = btrim(p_name),
      category = coalesce(nullif(btrim(p_category),''),'Vestuário'),
      description = nullif(btrim(p_description),''),
      image_url = nullif(btrim(p_image_url),''),
      active = coalesce(p_active,true)
    where id = p_product_id
    returning id into v_product_id;

    if v_product_id is null then
      raise exception 'Produto Fitness não encontrado';
    end if;
  end if;

  for v_variant in
    select *
    from jsonb_to_recordset(p_variants) as x(
      id uuid,
      size text,
      color text,
      sku text,
      cost_price numeric,
      sale_price numeric,
      active boolean,
      minimum_stock integer,
      reorder_target integer,
      image_url text
    )
  loop
    if nullif(btrim(v_variant.size),'') is null
       or nullif(btrim(v_variant.color),'') is null then
      raise exception 'Informe tamanho e cor de todas as variações';
    end if;

    if coalesce(v_variant.cost_price,0) < 0
       or coalesce(v_variant.sale_price,0) < 0
       or coalesce(v_variant.minimum_stock,0) < 0
       or coalesce(v_variant.reorder_target,0) < 0 then
      raise exception 'Revise preços e estoques';
    end if;

    if v_variant.id is null then
      insert into public.fitness_variants(
        product_id, size, color, sku, cost_price, sale_price, active,
        minimum_stock, reorder_target, default_supplier_id, image_url
      )
      values(
        v_product_id,
        btrim(v_variant.size),
        btrim(v_variant.color),
        nullif(btrim(v_variant.sku),''),
        coalesce(v_variant.cost_price,0),
        coalesce(v_variant.sale_price,0),
        coalesce(v_variant.active,true),
        coalesce(v_variant.minimum_stock,0),
        greatest(
          coalesce(v_variant.reorder_target,0),
          coalesce(v_variant.minimum_stock,0)
        ),
        p_default_supplier_id,
        nullif(btrim(v_variant.image_url),'')
      );
    else
      update public.fitness_variants
      set
        size = btrim(v_variant.size),
        color = btrim(v_variant.color),
        sku = nullif(btrim(v_variant.sku),''),
        cost_price = coalesce(v_variant.cost_price,0),
        sale_price = coalesce(v_variant.sale_price,0),
        active = coalesce(v_variant.active,true),
        minimum_stock = coalesce(v_variant.minimum_stock,0),
        reorder_target = greatest(
          coalesce(v_variant.reorder_target,0),
          coalesce(v_variant.minimum_stock,0)
        ),
        default_supplier_id = p_default_supplier_id,
        image_url = nullif(btrim(v_variant.image_url),'')
      where id = v_variant.id
        and product_id = v_product_id;
    end if;
  end loop;

  return v_product_id;
end;
$function$;

-- =========================================================
-- 1. IDENTIDADE DE CLIENTE COMPARTILHADA
-- =========================================================

alter table public.fitness_customers
  add column if not exists core_customer_id uuid
  references public.customers(id) on delete set null;

create unique index if not exists fitness_customers_core_customer_uidx
  on public.fitness_customers(core_customer_id)
  where core_customer_id is not null;

-- Liga por telefone quando o telefone identifica um único cliente Company.
with phone_candidates as (
  select
    fc.id as fitness_customer_id,
    (array_agg(c.id order by c.updated_at desc))[1] as core_customer_id
  from public.fitness_customers fc
  join public.customers c
    on regexp_replace(coalesce(fc.phone,''), '\D', '', 'g') <> ''
   and regexp_replace(coalesce(fc.phone,''), '\D', '', 'g')
       = regexp_replace(coalesce(c.phone,''), '\D', '', 'g')
  where fc.core_customer_id is null
  group by fc.id
  having count(*) = 1
)
update public.fitness_customers fc
set core_customer_id = pc.core_customer_id
from phone_candidates pc
where fc.id = pc.fitness_customer_id
  and not exists (
    select 1
    from public.fitness_customers other
    where other.core_customer_id = pc.core_customer_id
      and other.id <> fc.id
  );

-- Fallback conservador: nome + cidade iguais e únicos.
with name_candidates as (
  select
    fc.id as fitness_customer_id,
    (array_agg(c.id order by c.updated_at desc))[1] as core_customer_id
  from public.fitness_customers fc
  join public.customers c
    on lower(btrim(fc.name)) = lower(btrim(c.name))
   and lower(btrim(coalesce(fc.city,''))) = lower(btrim(coalesce(c.city,'')))
  where fc.core_customer_id is null
  group by fc.id
  having count(*) = 1
)
update public.fitness_customers fc
set core_customer_id = nc.core_customer_id
from name_candidates nc
where fc.id = nc.fitness_customer_id
  and not exists (
    select 1
    from public.fitness_customers other
    where other.core_customer_id = nc.core_customer_id
      and other.id <> fc.id
  );

-- Clientes que existiam somente na Fitness ganham identidade Company.
do $$
declare
  r record;
  v_core_id uuid;
begin
  for r in
    select *
    from public.fitness_customers
    where core_customer_id is null
    order by created_at
  loop
    v_core_id := null;

    if regexp_replace(coalesce(r.phone,''), '\D', '', 'g') <> '' then
      select c.id
      into v_core_id
      from public.customers c
      where regexp_replace(coalesce(c.phone,''), '\D', '', 'g')
          = regexp_replace(coalesce(r.phone,''), '\D', '', 'g')
      order by c.updated_at desc
      limit 1;
    end if;

    if v_core_id is null then
      select c.id
      into v_core_id
      from public.customers c
      where lower(btrim(c.name)) = lower(btrim(r.name))
        and lower(btrim(coalesce(c.city,'')))
          = lower(btrim(coalesce(r.city,'')))
      order by c.updated_at desc
      limit 1;
    end if;

    if v_core_id is null then
      insert into public.customers(
        name,
        phone,
        city,
        notes,
        active
      )
      values(
        btrim(r.name),
        nullif(btrim(r.phone),''),
        nullif(btrim(r.city),''),
        nullif(btrim(r.notes),''),
        true
      )
      returning id into v_core_id;
    end if;

    if not exists (
      select 1
      from public.fitness_customers x
      where x.core_customer_id = v_core_id
        and x.id <> r.id
    ) then
      update public.fitness_customers
      set core_customer_id = v_core_id
      where id = r.id;
    end if;
  end loop;
end $$;

create or replace function public.sync_core_customer_to_fitness_profile_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.fitness_customers
  set
    name = new.name,
    phone = new.phone,
    city = new.city,
    updated_at = now()
  where core_customer_id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_sync_core_customer_to_fitness_profile_v1
on public.customers;

create trigger trg_sync_core_customer_to_fitness_profile_v1
after insert or update of name, phone, city
on public.customers
for each row
execute function public.sync_core_customer_to_fitness_profile_v1();

create or replace function public.fitness_resolve_customer(
  p_customer_id uuid,
  p_name text,
  p_phone text default null,
  p_instagram text default null,
  p_city text default null,
  p_source text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fitness_id uuid;
  v_core_id uuid;
  v_name text;
begin
  if not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para alterar clientes Fitness';
  end if;

  -- O ID recebido pode ser um perfil Fitness OU um cliente Company.
  if p_customer_id is not null then
    select fc.id, fc.core_customer_id, fc.name
    into v_fitness_id, v_core_id, v_name
    from public.fitness_customers fc
    where fc.id = p_customer_id
      and fc.active
    limit 1;

    if v_fitness_id is null then
      select c.id, c.name
      into v_core_id, v_name
      from public.customers c
      where c.id = p_customer_id
        and c.active
      limit 1;

      if v_core_id is null then
        raise exception 'Cliente inválido';
      end if;

      select fc.id
      into v_fitness_id
      from public.fitness_customers fc
      where fc.core_customer_id = v_core_id
      limit 1;

      if v_fitness_id is null then
        insert into public.fitness_customers(
          name,
          phone,
          instagram,
          city,
          source,
          active,
          core_customer_id
        )
        select
          c.name,
          c.phone,
          nullif(btrim(p_instagram),''),
          c.city,
          coalesce(nullif(btrim(p_source),''),'Candinho Company'),
          true,
          c.id
        from public.customers c
        where c.id = v_core_id
        returning id into v_fitness_id;
      end if;
    end if;
  end if;

  -- Sem seleção: tenta resolver pela base Company antes de criar.
  if v_fitness_id is null then
    if nullif(btrim(p_name),'') is null then
      raise exception 'Informe o cliente';
    end if;

    if regexp_replace(coalesce(p_phone,''), '\D', '', 'g') <> '' then
      select c.id
      into v_core_id
      from public.customers c
      where c.active
        and regexp_replace(coalesce(c.phone,''), '\D', '', 'g')
          = regexp_replace(coalesce(p_phone,''), '\D', '', 'g')
      order by c.updated_at desc
      limit 1;
    end if;

    if v_core_id is null then
      select c.id
      into v_core_id
      from public.customers c
      where c.active
        and lower(btrim(c.name)) = lower(btrim(p_name))
        and (
          nullif(btrim(coalesce(p_city,'')),'') is null
          or lower(btrim(coalesce(c.city,'')))
            = lower(btrim(coalesce(p_city,'')))
        )
      order by c.updated_at desc
      limit 1;
    end if;

    if v_core_id is null then
      insert into public.customers(
        name,
        phone,
        city,
        active
      )
      values(
        btrim(p_name),
        nullif(btrim(p_phone),''),
        nullif(btrim(p_city),''),
        true
      )
      returning id into v_core_id;
    end if;

    select fc.id
    into v_fitness_id
    from public.fitness_customers fc
    where fc.core_customer_id = v_core_id
    limit 1;

    if v_fitness_id is null then
      insert into public.fitness_customers(
        name,
        phone,
        instagram,
        city,
        source,
        active,
        core_customer_id
      )
      select
        c.name,
        coalesce(nullif(btrim(p_phone),''), c.phone),
        nullif(btrim(p_instagram),''),
        coalesce(nullif(btrim(p_city),''), c.city),
        coalesce(nullif(btrim(p_source),''),'Candinho Company'),
        true,
        c.id
      from public.customers c
      where c.id = v_core_id
      returning id into v_fitness_id;
    end if;
  end if;

  select core_customer_id
  into v_core_id
  from public.fitness_customers
  where id = v_fitness_id;

  if v_core_id is null then
    insert into public.customers(
      name,
      phone,
      city,
      active
    )
    select
      fc.name,
      fc.phone,
      fc.city,
      true
    from public.fitness_customers fc
    where fc.id = v_fitness_id
    returning id into v_core_id;

    update public.fitness_customers
    set core_customer_id = v_core_id
    where id = v_fitness_id;
  end if;

  -- Campos comuns ficam sincronizados na identidade Company.
  update public.customers
  set
    name = coalesce(nullif(btrim(p_name),''), name),
    phone = coalesce(nullif(btrim(p_phone),''), phone),
    city = coalesce(nullif(btrim(p_city),''), city),
    updated_at = now()
  where id = v_core_id;

  -- Campos específicos da Fitness permanecem no perfil Fitness.
  update public.fitness_customers
  set
    name = coalesce(nullif(btrim(p_name),''), name),
    phone = coalesce(nullif(btrim(p_phone),''), phone),
    instagram = coalesce(nullif(btrim(p_instagram),''), instagram),
    city = coalesce(nullif(btrim(p_city),''), city),
    source = coalesce(nullif(btrim(p_source),''), source),
    updated_at = now()
  where id = v_fitness_id;

  return v_fitness_id;
end;
$$;

create or replace function public.save_fitness_customer(
  p_customer_id uuid,
  p_name text,
  p_phone text default null,
  p_instagram text default null,
  p_city text default null,
  p_source text default null,
  p_notes text default null,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para alterar clientes Fitness';
  end if;

  v_id := public.fitness_resolve_customer(
    p_customer_id,
    p_name,
    p_phone,
    p_instagram,
    p_city,
    p_source
  );

  update public.fitness_customers
  set
    notes = nullif(btrim(p_notes),''),
    active = coalesce(p_active,true),
    updated_at = now()
  where id = v_id;

  return v_id;
end;
$$;

create or replace function public.create_fitness_sale_v2(
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_instagram text,
  p_city text,
  p_customer_source text,
  p_quoted_on date,
  p_items jsonb,
  p_payment_mode text default 'receivable',
  p_paid_on date default null,
  p_payment_method text default null,
  p_payment_due_on date default null,
  p_delivered boolean default false,
  p_delivered_on date default null,
  p_responsible text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_sale_id uuid;
begin
  if not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para registrar vendas Fitness';
  end if;

  v_customer_id := public.fitness_resolve_customer(
    p_customer_id,
    p_customer_name,
    p_customer_phone,
    p_customer_instagram,
    p_city,
    p_customer_source
  );

  select public.create_fitness_sale(
    (select name from public.fitness_customers where id=v_customer_id),
    coalesce(
      nullif(btrim(p_customer_phone),''),
      (select phone from public.fitness_customers where id=v_customer_id)
    ),
    coalesce(
      nullif(btrim(p_city),''),
      (select city from public.fitness_customers where id=v_customer_id)
    ),
    p_quoted_on,
    p_items,
    p_payment_mode,
    p_paid_on,
    p_payment_method,
    p_payment_due_on,
    p_delivered,
    p_delivered_on,
    p_notes
  )
  into v_sale_id;

  update public.fitness_sales
  set
    customer_id = v_customer_id,
    responsible = nullif(btrim(p_responsible),'')
  where id = v_sale_id;

  return v_sale_id;
end;
$$;

drop view if exists public.fitness_company_customer_directory_v1;
create view public.fitness_company_customer_directory_v1 as
select
  fco.id as id,
  fco.id as fitness_customer_id,
  fc.core_customer_id,
  fco.name,
  fco.phone,
  fco.instagram,
  fco.city,
  fco.source,
  fco.active,
  fco.total_purchases,
  fco.total_spent,
  fco.last_purchase_on,
  true as has_fitness_profile
from public.fitness_customer_overview fco
join public.fitness_customers fc on fc.id = fco.id

union all

select
  c.id as id,
  null::uuid as fitness_customer_id,
  c.id as core_customer_id,
  c.name,
  c.phone,
  null::text as instagram,
  c.city,
  'Candinho Company'::text as source,
  c.active,
  0::integer as total_purchases,
  0::numeric(12,2) as total_spent,
  null::date as last_purchase_on,
  false as has_fitness_profile
from public.customers c
where c.active
  and not exists (
    select 1
    from public.fitness_customers fc
    where fc.core_customer_id = c.id
  );

grant select on public.fitness_company_customer_directory_v1 to authenticated;

-- =========================================================
-- 2. GALERIA FITNESS + MÍDIA GERADA PELO NEXUS
-- =========================================================

create table if not exists public.fitness_product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.fitness_products(id) on delete cascade,
  variant_id uuid references public.fitness_variants(id) on delete set null,
  color text,
  media_type text not null default 'model_ai'
    check (media_type in ('model_ai','lifestyle','extra')),
  source_image_url text,
  image_url text not null,
  public_visible boolean not null default false,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists fitness_product_media_product_idx
  on public.fitness_product_media(product_id, public_visible, sort_order, created_at);

alter table public.fitness_product_media enable row level security;

drop policy if exists fitness_product_media_read_v1 on public.fitness_product_media;
create policy fitness_product_media_read_v1
on public.fitness_product_media
for select
to authenticated
using (
  exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active
      and (p.role='admin' or p.can_access_fitness)
  )
);

drop policy if exists fitness_product_media_write_v1 on public.fitness_product_media;
create policy fitness_product_media_write_v1
on public.fitness_product_media
for all
to authenticated
using (public.can_write_fitness())
with check (public.can_write_fitness());

grant select, insert, update, delete
on public.fitness_product_media
to authenticated;

-- =========================================================
-- 3. CONJUNTOS DIVISÍVEIS
-- =========================================================

alter table public.fitness_products
  add column if not exists is_splittable_set boolean not null default false;

create table if not exists public.fitness_set_components (
  id uuid primary key default gen_random_uuid(),
  set_product_id uuid not null references public.fitness_products(id) on delete cascade,
  component_product_id uuid not null references public.fitness_products(id) on delete restrict,
  component_role text not null check (component_role in ('top','bottom','other')),
  component_label text not null,
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  cost_share_pct numeric(7,4) not null default 50
    check (cost_share_pct > 0 and cost_share_pct <= 100),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  created_at timestamptz not null default now(),
  unique(set_product_id, component_role)
);

alter table public.fitness_set_components enable row level security;

drop policy if exists fitness_set_components_read_v1 on public.fitness_set_components;
create policy fitness_set_components_read_v1
on public.fitness_set_components
for select
to authenticated
using (
  exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active
      and (p.role='admin' or p.can_access_fitness)
  )
);

drop policy if exists fitness_set_components_write_v1 on public.fitness_set_components;
create policy fitness_set_components_write_v1
on public.fitness_set_components
for all
to authenticated
using (public.can_write_fitness())
with check (public.can_write_fitness());

grant select, insert, update, delete
on public.fitness_set_components
to authenticated;

create or replace function public.configure_fitness_split_set_v1(
  p_set_product_id uuid,
  p_top_label text,
  p_top_sale_price numeric,
  p_bottom_label text,
  p_bottom_sale_price numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_set public.fitness_products%rowtype;
  v_top_product uuid;
  v_bottom_product uuid;
  v_total numeric;
  v_top_share numeric;
  v_bottom_share numeric;
begin
  if not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para configurar conjuntos';
  end if;

  select *
  into v_set
  from public.fitness_products
  where id = p_set_product_id
  for update;

  if not found then
    raise exception 'Produto não encontrado';
  end if;

  if nullif(btrim(p_top_label),'') is null
     or nullif(btrim(p_bottom_label),'') is null then
    raise exception 'Informe o nome das duas partes do conjunto';
  end if;

  if coalesce(p_top_sale_price,0) < 0
     or coalesce(p_bottom_sale_price,0) < 0 then
    raise exception 'Preço inválido';
  end if;

  select component_product_id
  into v_top_product
  from public.fitness_set_components
  where set_product_id = p_set_product_id
    and component_role = 'top';

  if v_top_product is null then
    insert into public.fitness_products(
      name,
      category,
      description,
      image_url,
      active
    )
    values(
      v_set.name || ' · ' || btrim(p_top_label),
      'Top',
      'Parte avulsa do conjunto ' || v_set.name,
      v_set.image_url,
      true
    )
    returning id into v_top_product;
  end if;

  select component_product_id
  into v_bottom_product
  from public.fitness_set_components
  where set_product_id = p_set_product_id
    and component_role = 'bottom';

  if v_bottom_product is null then
    insert into public.fitness_products(
      name,
      category,
      description,
      image_url,
      active
    )
    values(
      v_set.name || ' · ' || btrim(p_bottom_label),
      case
        when lower(p_bottom_label) like '%short%' then 'Short'
        when lower(p_bottom_label) like '%legging%' then 'Legging'
        else 'Calça'
      end,
      'Parte avulsa do conjunto ' || v_set.name,
      v_set.image_url,
      true
    )
    returning id into v_bottom_product;
  end if;

  v_total := greatest(
    coalesce(p_top_sale_price,0) + coalesce(p_bottom_sale_price,0),
    0.01
  );
  v_top_share := greatest(1, least(99, (coalesce(p_top_sale_price,0) / v_total) * 100));
  v_bottom_share := 100 - v_top_share;

  insert into public.fitness_set_components(
    set_product_id,
    component_product_id,
    component_role,
    component_label,
    sale_price,
    cost_share_pct,
    active
  )
  values(
    p_set_product_id,
    v_top_product,
    'top',
    btrim(p_top_label),
    coalesce(p_top_sale_price,0),
    v_top_share,
    true
  )
  on conflict (set_product_id, component_role)
  do update set
    component_product_id = excluded.component_product_id,
    component_label = excluded.component_label,
    sale_price = excluded.sale_price,
    cost_share_pct = excluded.cost_share_pct,
    active = true;

  insert into public.fitness_set_components(
    set_product_id,
    component_product_id,
    component_role,
    component_label,
    sale_price,
    cost_share_pct,
    active
  )
  values(
    p_set_product_id,
    v_bottom_product,
    'bottom',
    btrim(p_bottom_label),
    coalesce(p_bottom_sale_price,0),
    v_bottom_share,
    true
  )
  on conflict (set_product_id, component_role)
  do update set
    component_product_id = excluded.component_product_id,
    component_label = excluded.component_label,
    sale_price = excluded.sale_price,
    cost_share_pct = excluded.cost_share_pct,
    active = true;

  update public.fitness_products
  set
    is_splittable_set = true,
    updated_at = now()
  where id = p_set_product_id;

  return jsonb_build_object(
    'ok', true,
    'set_product_id', p_set_product_id,
    'top_product_id', v_top_product,
    'bottom_product_id', v_bottom_product
  );
end;
$$;

create or replace function public.split_fitness_set_variant_v1(
  p_set_variant_id uuid,
  p_quantity integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent public.fitness_variants%rowtype;
  v_set public.fitness_products%rowtype;
  v_available integer;
  v_group uuid := gen_random_uuid();
  v_component record;
  v_child_variant uuid;
  v_component_count integer := 0;
begin
  if not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para separar conjuntos';
  end if;

  if coalesce(p_quantity,0) <= 0 then
    raise exception 'Quantidade inválida';
  end if;

  select *
  into v_parent
  from public.fitness_variants
  where id = p_set_variant_id
    and active
  for share;

  if not found then
    raise exception 'Variação do conjunto inválida';
  end if;

  select *
  into v_set
  from public.fitness_products
  where id = v_parent.product_id
    and active
    and is_splittable_set;

  if not found then
    raise exception 'Esse produto ainda não foi configurado como conjunto divisível';
  end if;

  select available_quantity
  into v_available
  from public.fitness_stock_operational
  where variant_id = p_set_variant_id;

  if coalesce(v_available,0) < p_quantity then
    raise exception 'Estoque disponível insuficiente para separar o conjunto';
  end if;

  select count(*)
  into v_component_count
  from public.fitness_set_components
  where set_product_id = v_set.id
    and active;

  if v_component_count < 2 then
    raise exception 'Configure as duas partes do conjunto antes de separar';
  end if;

  insert into public.fitness_inventory_movements(
    variant_id,
    movement_type,
    quantity_delta,
    transfer_group_id,
    notes,
    idempotency_key
  )
  values(
    v_parent.id,
    'conversion_out',
    -p_quantity,
    v_group,
    'Desmembramento do conjunto ' || v_set.name,
    'fitness:set-split:out:' || v_group::text
  );

  for v_component in
    select *
    from public.fitness_set_components
    where set_product_id = v_set.id
      and active
    order by case component_role when 'top' then 0 when 'bottom' then 1 else 2 end
  loop
    select id
    into v_child_variant
    from public.fitness_variants
    where product_id = v_component.component_product_id
      and lower(btrim(size)) = lower(btrim(v_parent.size))
      and lower(btrim(color)) = lower(btrim(v_parent.color))
    order by active desc, created_at
    limit 1;

    if v_child_variant is null then
      insert into public.fitness_variants(
        product_id,
        size,
        color,
        sku,
        cost_price,
        sale_price,
        active,
        minimum_stock,
        reorder_target,
        default_supplier_id,
        image_url
      )
      values(
        v_component.component_product_id,
        v_parent.size,
        v_parent.color,
        null,
        round(v_parent.cost_price * (v_component.cost_share_pct / 100.0), 2),
        v_component.sale_price,
        true,
        0,
        0,
        v_parent.default_supplier_id,
        v_parent.image_url
      )
      returning id into v_child_variant;
    else
      update public.fitness_variants
      set
        active = true,
        sale_price = v_component.sale_price,
        cost_price = round(v_parent.cost_price * (v_component.cost_share_pct / 100.0), 2),
        default_supplier_id = coalesce(default_supplier_id, v_parent.default_supplier_id),
        image_url = coalesce(image_url, v_parent.image_url),
        updated_at = now()
      where id = v_child_variant;
    end if;

    insert into public.fitness_inventory_movements(
      variant_id,
      movement_type,
      quantity_delta,
      transfer_group_id,
      notes,
      idempotency_key
    )
    values(
      v_child_variant,
      'conversion_in',
      p_quantity,
      v_group,
      'Parte avulsa gerada do conjunto ' || v_set.name,
      'fitness:set-split:in:' || v_group::text || ':' || v_component.id::text
    );
  end loop;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'fitness_product',
    v_set.id,
    'split_set_variant_v1',
    jsonb_build_object(
      'variant_id', v_parent.id,
      'quantity', p_quantity,
      'transfer_group_id', v_group
    )
  );

  return jsonb_build_object(
    'ok', true,
    'product_id', v_set.id,
    'variant_id', v_parent.id,
    'quantity', p_quantity,
    'transfer_group_id', v_group
  );
end;
$$;

grant execute on function public.configure_fitness_split_set_v1(uuid,text,numeric,text,numeric)
to authenticated;

grant execute on function public.split_fitness_set_variant_v1(uuid,integer)
to authenticated;

-- =========================================================
-- 4. VITRINE ENRIQUECIDA: OBSERVAÇÕES + GALERIA FITNESS
-- =========================================================

create or replace function public.public_storefront_snapshot(
  p_limit integer default 300
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 300), 1), 500);
  v_supplements jsonb;
  v_fitness jsonb;
  v_promotions_supplements jsonb;
  v_promotions_fitness jsonb;
  v_supplement_categories jsonb;
  v_fitness_categories jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.name), '[]'::jsonb)
  into v_supplements
  from (
    select
      pc.id::text as id,
      'supplements'::text as operation,
      pc.name,
      pc.category,
      coalesce(pc.thumbnail_url, pc.image_url) as image_url,
      pc.sale_price::numeric as price_from,
      pc.sale_price::numeric as price_to,
      true as available,
      p.description as notes,
      case
        when coalesce(pc.thumbnail_url, pc.image_url) is null then '[]'::jsonb
        else jsonb_build_array(
          jsonb_build_object(
            'url', coalesce(pc.thumbnail_url, pc.image_url),
            'color', null,
            'label', null,
            'kind', 'product',
            'available_quantity', pc.available_quantity
          )
        )
      end as images
    from public.product_catalog_commercial_sort pc
    join public.products p on p.id = pc.id
    where pc.active = true
      and p.restricted = false
      and coalesce(upper(p.sales_category), '') <> 'Z'
      and pc.available_quantity > 0
      and upper(pc.name) not like '%COMBO%'
    order by pc.flagship_rank, pc.availability_rank, pc.category_rank, pc.total_sold desc, pc.name
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.name), '[]'::jsonb)
  into v_fitness
  from (
    select
      fp.id::text as id,
      'fitness'::text as operation,
      fp.name,
      fp.category,
      coalesce(gallery.first_image, fp.image_url) as image_url,
      fp.min_sale_price::numeric as price_from,
      fp.max_sale_price::numeric as price_to,
      true as available,
      p.description as notes,
      coalesce(gallery.images, '[]'::jsonb) as images
    from public.fitness_product_catalog_v2 fp
    join public.fitness_products p on p.id = fp.id
    left join lateral (
      with available_colors as (
        select
          v.color,
          max(nullif(btrim(v.image_url),'')) as image_url,
          sum(coalesce(s.available_quantity,0))::integer as available_quantity
        from public.fitness_variants v
        join public.fitness_stock_operational s on s.variant_id = v.id
        where v.product_id = fp.id
          and v.active
        group by v.color
        having sum(coalesce(s.available_quantity,0)) > 0
      ),
      media_rows as (
        select
          m.image_url as url,
          m.color,
          coalesce(nullif(btrim(m.color),''),'Lifestyle') as label,
          m.media_type as kind,
          case
            when nullif(btrim(m.color),'') is null then fp.available_quantity
            else coalesce((
              select ac.available_quantity
              from available_colors ac
              where lower(btrim(ac.color)) = lower(btrim(m.color))
              limit 1
            ),0)
          end as available_quantity,
          50 + m.sort_order as sort_order
        from public.fitness_product_media m
        where m.product_id = fp.id
          and m.public_visible
          and (
            nullif(btrim(m.color),'') is null
            or exists(
              select 1
              from available_colors ac
              where lower(btrim(ac.color)) = lower(btrim(m.color))
            )
          )
      ),
      all_images as (
        select
          ac.image_url as url,
          ac.color,
          ac.color as label,
          'color'::text as kind,
          ac.available_quantity,
          case
            when lower(ac.color) in ('preto','preta','black') then 0
            else 10
          end as sort_order
        from available_colors ac
        where ac.image_url is not null

        union all

        select
          mr.url,
          mr.color,
          mr.label,
          mr.kind,
          mr.available_quantity,
          mr.sort_order
        from media_rows mr
      ),
      dedup as (
        select distinct on (url)
          url,
          color,
          label,
          kind,
          available_quantity,
          sort_order
        from all_images
        where url is not null
          and btrim(url) <> ''
        order by url, sort_order, label
      )
      select
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'url', url,
              'color', color,
              'label', label,
              'kind', kind,
              'available_quantity', available_quantity
            )
            order by sort_order,
              case when lower(coalesce(color,'')) in ('preto','preta','black') then 0 else 1 end,
              label
          ),
          case
            when fp.image_url is null then '[]'::jsonb
            else jsonb_build_array(
              jsonb_build_object(
                'url', fp.image_url,
                'color', null,
                'label', 'Produto',
                'kind', 'product',
                'available_quantity', fp.available_quantity
              )
            )
          end
        ) as images,
        coalesce(
          (
            select d.url
            from dedup d
            order by
              case when lower(coalesce(d.color,'')) in ('preto','preta','black') then 0 else 1 end,
              d.sort_order,
              d.label
            limit 1
          ),
          fp.image_url
        ) as first_image
      from dedup
    ) gallery on true
    where fp.active = true
      and fp.available_quantity > 0
    order by fp.category, fp.name
    limit v_limit
  ) x;

  with promo as (
    select
      i.id::text as id,
      i.promotion_id::text as promotion_id,
      i.supplement_product_id::text as product_id,
      'supplements'::text as operation,
      i.item_label as name,
      i.category,
      i.image_url,
      i.current_price::numeric as current_price,
      coalesce(
        i.promotional_price,
        case
          when coalesce(i.discount_pct,0) > 0
          then i.current_price * (1 - i.discount_pct / 100.0)
          else i.current_price
        end
      )::numeric as promotional_price,
      coalesce(i.discount_pct,0)::numeric as discount_pct,
      p.name as promotion_name,
      p.effective_status as promotion_status,
      p.starts_on,
      p.ends_on,
      coalesce(i.available_quantity,0)::integer as available_quantity,
      case
        when coalesce(i.available_quantity,0)>0 then 'available'
        else 'sold_out'
      end::text as stock_status
    from public.central_promotion_items_overview i
    join public.central_promotions_overview p on p.id = i.promotion_id
    join public.product_catalog_commercial_sort pc on pc.id = i.supplement_product_id
    join public.products prod on prod.id = pc.id
    where i.operation_scope = 'supplements'
      and p.effective_status in ('active','scheduled')
      and pc.active = true
      and prod.restricted = false
      and coalesce(upper(prod.sales_category), '') <> 'Z'
  )
  select coalesce(
    jsonb_agg(to_jsonb(promo) order by promotion_status, starts_on nulls last, name),
    '[]'::jsonb
  )
  into v_promotions_supplements
  from promo;

  with promo as (
    select distinct on (i.id)
      i.id::text as id,
      i.promotion_id::text as promotion_id,
      fs.product_id::text as product_id,
      'fitness'::text as operation,
      i.item_label as name,
      i.category,
      i.image_url,
      i.current_price::numeric as current_price,
      coalesce(
        i.promotional_price,
        case
          when coalesce(i.discount_pct,0) > 0
          then i.current_price * (1 - i.discount_pct / 100.0)
          else i.current_price
        end
      )::numeric as promotional_price,
      coalesce(i.discount_pct,0)::numeric as discount_pct,
      p.name as promotion_name,
      p.effective_status as promotion_status,
      p.starts_on,
      p.ends_on,
      coalesce(fs.available_quantity,0)::integer as available_quantity,
      case
        when coalesce(fs.available_quantity,0)>0 then 'available'
        else 'sold_out'
      end::text as stock_status
    from public.central_promotion_items_overview i
    join public.central_promotions_overview p on p.id = i.promotion_id
    join public.fitness_stock_overview fs on fs.variant_id = i.fitness_variant_id
    where i.operation_scope = 'fitness'
      and p.effective_status in ('active','scheduled')
      and fs.product_active = true
      and fs.variant_active = true
    order by i.id, fs.product_name
  )
  select coalesce(
    jsonb_agg(to_jsonb(promo) order by promotion_status, starts_on nulls last, name),
    '[]'::jsonb
  )
  into v_promotions_fitness
  from promo;

  select coalesce(jsonb_agg(category order by category), '[]'::jsonb)
  into v_supplement_categories
  from (
    select distinct pc.category
    from public.product_catalog_commercial_sort pc
    join public.products p on p.id = pc.id
    where pc.active = true
      and p.restricted = false
      and coalesce(upper(p.sales_category), '') <> 'Z'
      and pc.available_quantity > 0
      and pc.category is not null
      and btrim(pc.category) <> ''
  ) c;

  select coalesce(jsonb_agg(category order by category), '[]'::jsonb)
  into v_fitness_categories
  from (
    select distinct fp.category
    from public.fitness_product_catalog_v2 fp
    where fp.active = true
      and fp.available_quantity > 0
      and fp.category is not null
      and btrim(fp.category) <> ''
  ) c;

  return jsonb_build_object(
    'products', jsonb_build_object(
      'supplements', v_supplements,
      'fitness', v_fitness
    ),
    'promotions', jsonb_build_object(
      'supplements', v_promotions_supplements,
      'fitness', v_promotions_fitness
    ),
    'categories', jsonb_build_object(
      'supplements', v_supplement_categories,
      'fitness', v_fitness_categories
    ),
    'generated_at', now()
  );
end;
$$;

commit;
