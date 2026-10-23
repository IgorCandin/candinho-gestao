begin;
-- Cadastro rápido do item e pedido no mesmo commit: qualquer erro reverte ambos.
create or replace function public.create_company_purchase_order_with_products_v1(
  p_operation text,
  p_supplier_id uuid,
  p_supplier_name text,
  p_ordered_on date,
  p_expected_on date,
  p_destination_location_id uuid,
  p_freight numeric,
  p_responsible text,
  p_items jsonb,
  p_notes text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_draft jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_order_id uuid;
  v_name text;
  v_size text;
  v_color text;
  v_created jsonb := '{}'::jsonb;
  v_key text; v_flavors jsonb; v_flavor_id uuid; v_flavor_name text;
begin
  if p_operation not in ('supplements', 'fitness') then raise exception 'Operação inválida'; end if;
  if p_operation = 'supplements' and not public.can_write() then raise exception 'Sem permissão para cadastrar Suplementos'; end if;
  if p_operation = 'fitness' and not public.can_write_fitness() then raise exception 'Sem permissão para cadastrar Fitness'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Informe de 1 a 50 itens';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_draft := v_item->'draft_product';
    if v_draft is not null and jsonb_typeof(v_draft) <> 'null' then
      v_name := nullif(btrim(v_draft->>'name'), '');
      if v_name is null then raise exception 'Informe o nome do novo produto'; end if;
      if p_operation = 'supplements' then
        v_key := coalesce(nullif(v_draft->>'draft_key',''),nullif(v_item->>'product_id',''),gen_random_uuid()::text);
        v_flavors := coalesce(v_draft->'flavors','[]'::jsonb);
        if jsonb_typeof(v_flavors)<>'array' or jsonb_array_length(v_flavors)>20 then raise exception 'Informe até 20 sabores'; end if;
        if exists(select 1 from jsonb_array_elements(v_flavors) f where jsonb_typeof(f)<>'string' or nullif(btrim(f#>>'{}'),'') is null or char_length(btrim(f#>>'{}'))>80) then raise exception 'Informe nomes válidos para os sabores'; end if;
        if (select count(*)<>count(distinct lower(btrim(f#>>'{}'))) from jsonb_array_elements(v_flavors) f) then raise exception 'Não repita sabores'; end if;
        if v_created ? v_key then
          if v_created->v_key->'draft' <> v_draft then raise exception 'Cadastro provisório divergente entre itens'; end if;
          v_product_id := (v_created->v_key->>'id')::uuid;
        else
          v_product_id := public.create_product_record_v2(
            p_name => v_name,
            p_category => coalesce(nullif(btrim(v_draft->>'category'),''),'Sem categoria'),
            p_cost_price => coalesce((v_item->>'unit_cost')::numeric,0),
            p_enable_flavors => jsonb_array_length(v_flavors)>0,
            p_flavors => (select coalesce(jsonb_agg(jsonb_build_object('name',btrim(f#>>'{}'),'active',true,'display_order',ord-1)),'[]'::jsonb) from jsonb_array_elements(v_flavors) with ordinality x(f,ord)),
            p_flavor_allocations => '[]'::jsonb
          );
          v_created := v_created || jsonb_build_object(v_key,jsonb_build_object('id',v_product_id,'draft',v_draft));
        end if;
        v_flavor_name := nullif(btrim(v_item->>'draft_flavor'),'');
        v_flavor_id := null;
        if jsonb_array_length(v_flavors)>0 then
          select id into v_flavor_id from public.product_flavors where product_id=v_product_id and active and lower(btrim(name))=lower(v_flavor_name);
          if v_flavor_id is null then raise exception 'Selecione um sabor do novo produto'; end if;
        elsif v_flavor_name is not null then raise exception 'Produto provisório sem controle de sabor'; end if;
        if exists(select 1 from jsonb_array_elements(v_items) i where i->>'product_id'=v_product_id::text and (i->>'flavor_id') is not distinct from v_flavor_id::text) then raise exception 'Mesmo produto e sabor duplicados no pedido'; end if;
        v_item := jsonb_set(jsonb_set(v_item - 'draft_product' - 'draft_flavor','{product_id}',to_jsonb(v_product_id::text)),'{flavor_id}',coalesce(to_jsonb(v_flavor_id::text),'null'::jsonb));
      else
        v_size := coalesce(nullif(btrim(v_draft->>'size'), ''), 'Único');
        v_color := coalesce(nullif(btrim(v_draft->>'color'), ''), 'Sem cor');
        v_product_id := public.save_fitness_product_v2(
          null, v_name,
          coalesce(nullif(btrim(v_draft->>'category'), ''), 'Vestuário'),
          null, null, true, null,
          jsonb_build_array(jsonb_build_object('size', v_size, 'color', v_color,
            'cost_price', coalesce((v_item->>'unit_cost')::numeric, 0), 'sale_price', 0, 'active', true))
        );
        select id into v_variant_id from public.fitness_variants
        where product_id = v_product_id and size = v_size and color = v_color;
        if v_variant_id is null then raise exception 'Não foi possível criar a variação Fitness'; end if;
        v_item := jsonb_set(v_item - 'draft_product', '{variant_id}', to_jsonb(v_variant_id::text));
      end if;
    end if;
    v_items := v_items || jsonb_build_array(v_item);
  end loop;

  if p_operation = 'supplements' then
    v_order_id := public.create_purchase_order(p_supplier_id, p_ordered_on, p_destination_location_id, v_items, p_notes);
    if p_expected_on is not null then
      perform public.reschedule_operational_event('purchase_order', v_order_id, (p_expected_on::text || 'T12:00:00-03:00')::timestamptz);
    end if;
  else
    v_order_id := public.create_fitness_purchase_order_v2(p_supplier_id, p_supplier_name, p_ordered_on,
      p_expected_on, p_freight, p_responsible, v_items, p_notes);
  end if;
  return v_order_id;
end;
$$;

revoke all on function public.create_company_purchase_order_with_products_v1(text,uuid,text,date,date,uuid,numeric,text,jsonb,text) from public, anon;
grant execute on function public.create_company_purchase_order_with_products_v1(text,uuid,text,date,date,uuid,numeric,text,jsonb,text) to authenticated, service_role;

commit;
