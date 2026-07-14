create or replace function public.save_fitness_product(
  p_product_id uuid,
  p_name text,
  p_category text,
  p_description text,
  p_image_url text,
  p_active boolean,
  p_variants jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_product_id uuid; v_variant record; v_variant_id uuid;
begin
  if not public.can_write_fitness() then raise exception 'Usuário sem permissão para alterar a operação Fitness'; end if;
  if nullif(btrim(p_name),'') is null then raise exception 'Informe o nome do produto'; end if;
  if p_variants is null or jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants)=0 then raise exception 'Adicione pelo menos uma variação'; end if;

  if p_product_id is null then
    insert into public.fitness_products(name,category,description,image_url,active)
    values(btrim(p_name),coalesce(nullif(btrim(p_category),''),'Vestuário'),nullif(btrim(p_description),''),nullif(btrim(p_image_url),''),coalesce(p_active,true))
    returning id into v_product_id;
  else
    update public.fitness_products
    set name=btrim(p_name),category=coalesce(nullif(btrim(p_category),''),'Vestuário'),description=nullif(btrim(p_description),''),image_url=nullif(btrim(p_image_url),''),active=coalesce(p_active,true)
    where id=p_product_id returning id into v_product_id;
    if v_product_id is null then raise exception 'Produto Fitness não encontrado'; end if;
  end if;

  for v_variant in
    select * from jsonb_to_recordset(p_variants) as x(id uuid,size text,color text,sku text,cost_price numeric,sale_price numeric,active boolean)
  loop
    if nullif(btrim(v_variant.size),'') is null or nullif(btrim(v_variant.color),'') is null then raise exception 'Informe tamanho e cor de todas as variações'; end if;
    if coalesce(v_variant.cost_price,0)<0 or coalesce(v_variant.sale_price,0)<0 then raise exception 'Preços não podem ser negativos'; end if;
    if v_variant.id is null then
      insert into public.fitness_variants(product_id,size,color,sku,cost_price,sale_price,active)
      values(v_product_id,btrim(v_variant.size),btrim(v_variant.color),nullif(btrim(v_variant.sku),''),coalesce(v_variant.cost_price,0),coalesce(v_variant.sale_price,0),coalesce(v_variant.active,true));
    else
      update public.fitness_variants
      set size=btrim(v_variant.size),color=btrim(v_variant.color),sku=nullif(btrim(v_variant.sku),''),cost_price=coalesce(v_variant.cost_price,0),sale_price=coalesce(v_variant.sale_price,0),active=coalesce(v_variant.active,true)
      where id=v_variant.id and product_id=v_product_id;
    end if;
  end loop;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('fitness_product',v_product_id,case when p_product_id is null then 'created' else 'updated' end,jsonb_build_object('name',p_name));
  return v_product_id;
end;
$$;

create or replace function public.adjust_fitness_stock(p_variant_id uuid,p_new_quantity integer,p_notes text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_current integer; v_delta integer; v_id uuid;
begin
  if not public.can_write_fitness() then raise exception 'Usuário sem permissão para alterar o estoque Fitness'; end if;
  if p_new_quantity < 0 then raise exception 'A quantidade não pode ser negativa'; end if;
  insert into public.fitness_stock_balances(variant_id,quantity) values(p_variant_id,0) on conflict(variant_id) do nothing;
  select quantity into v_current from public.fitness_stock_balances where variant_id=p_variant_id for update;
  v_delta := p_new_quantity-v_current;
  if v_delta=0 then return null; end if;
  insert into public.fitness_inventory_movements(variant_id,movement_type,quantity_delta,notes,idempotency_key)
  values(p_variant_id,'adjustment',v_delta,nullif(btrim(p_notes),''),'fitness:adjust:'||gen_random_uuid()) returning id into v_id;
  return v_id;
end;
$$;

