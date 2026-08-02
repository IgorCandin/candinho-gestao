begin;

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

commit;
