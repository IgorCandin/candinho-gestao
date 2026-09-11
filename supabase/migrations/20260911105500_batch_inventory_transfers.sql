create or replace function public.transfer_inventory_batch_v1(
  p_source_location_id uuid,
  p_destination_location_id uuid,
  p_items jsonb,
  p_transferred_on date default current_date,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_item jsonb; v_results jsonb := '[]'::jsonb; v_result jsonb;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para transferir estoque'; end if;
  if p_source_location_id=p_destination_location_id then raise exception 'Origem e destino precisam ser diferentes'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Adicione pelo menos um produto'; end if;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce((v_item->>'quantity')::integer,0)<=0 then raise exception 'Informe uma quantidade válida em todos os produtos'; end if;
    v_result := public.transfer_inventory_v2(
      (v_item->>'product_id')::uuid,
      p_source_location_id,
      p_destination_location_id,
      nullif(v_item->>'flavor_id','')::uuid,
      (v_item->>'quantity')::integer,
      p_transferred_on,
      p_notes
    );
    v_results := v_results || jsonb_build_array(v_result);
  end loop;
  return jsonb_build_object('transfers',v_results,'item_count',jsonb_array_length(p_items));
end;
$$;
revoke all on function public.transfer_inventory_batch_v1(uuid,uuid,jsonb,date,text) from public,anon;
grant execute on function public.transfer_inventory_batch_v1(uuid,uuid,jsonb,date,text) to authenticated;
