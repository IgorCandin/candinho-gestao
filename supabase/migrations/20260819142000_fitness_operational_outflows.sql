begin;

alter table public.fitness_inventory_movements
  drop constraint if exists fitness_inventory_movements_movement_type_check;
alter table public.fitness_inventory_movements
  add constraint fitness_inventory_movements_movement_type_check
  check (movement_type in ('opening','purchase','sale','adjustment','cancellation','conversion_in','conversion_out','internal_use','loss_damage'));

create or replace function public.record_fitness_operational_outflow(
  p_variant_id uuid,
  p_quantity integer,
  p_reason text,
  p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_available integer; v_id uuid; v_reason text := lower(btrim(coalesce(p_reason,'')));
begin
  if not public.can_write_fitness() then raise exception 'Usuário sem permissão para baixar estoque Fitness'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Informe uma quantidade positiva'; end if;
  if v_reason not in ('internal_use','loss_damage') then raise exception 'Motivo de baixa inválido'; end if;
  select available_quantity into v_available from public.fitness_stock_overview where variant_id=p_variant_id;
  if coalesce(v_available,0) < p_quantity then raise exception 'Quantidade indisponível. Disponível: %', coalesce(v_available,0); end if;
  insert into public.fitness_inventory_movements(variant_id,movement_type,quantity_delta,notes,idempotency_key)
  values(p_variant_id,v_reason,-p_quantity,nullif(btrim(p_notes),''),'fitness:operational-outflow:'||gen_random_uuid()) returning id into v_id;
  insert into public.audit_events(entity_type,entity_id,action,details,created_by)
  values('fitness_inventory_movement',v_id,v_reason,jsonb_build_object('variant_id',p_variant_id,'quantity',p_quantity,'notes',nullif(btrim(p_notes),'')),auth.uid());
  return v_id;
end; $$;

create or replace function public.reconcile_fitness_stock(p_items jsonb,p_notes text default null)
returns integer language plpgsql security definer set search_path=public as $$
declare v_item record; v_current integer; v_committed integer; v_count integer; v_delta integer; v_changed integer := 0;
begin
  if not public.can_write_fitness() then raise exception 'Usuário sem permissão para conferir o estoque Fitness'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Itens de conferência inválidos'; end if;
  for v_item in select * from jsonb_to_recordset(p_items) as x(variant_id uuid,counted_quantity integer) loop
    if v_item.variant_id is null or v_item.counted_quantity is null or v_item.counted_quantity < 0 then raise exception 'Contagem inválida'; end if;
    insert into public.fitness_stock_balances(variant_id,quantity) values(v_item.variant_id,0) on conflict(variant_id) do nothing;
    select b.quantity,coalesce(o.reserved_quantity,0)+coalesce(o.consigned_quantity,0) into v_current,v_committed from public.fitness_stock_balances b left join public.fitness_stock_overview o on o.variant_id=b.variant_id where b.variant_id=v_item.variant_id for update;
    if not found then raise exception 'Variação não encontrada'; end if;
    if v_item.counted_quantity < v_committed then raise exception 'A contagem não pode ficar abaixo de reservas e consignações (%)', v_committed; end if;
    v_delta := v_item.counted_quantity-v_current;
    if v_delta <> 0 then
      insert into public.fitness_inventory_movements(variant_id,movement_type,quantity_delta,notes,idempotency_key)
      values(v_item.variant_id,'adjustment',v_delta,coalesce(nullif(btrim(p_notes),''),'Conferência física de estoque'),'fitness:reconciliation:'||gen_random_uuid());
      v_changed := v_changed+1;
    end if;
  end loop;
  insert into public.audit_events(entity_type,entity_id,action,details,created_by)
  values('fitness_inventory_reconciliation',coalesce(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid),'completed',jsonb_build_object('adjusted_variants',v_changed,'notes',nullif(btrim(p_notes),'')),auth.uid());
  return v_changed;
end; $$;

create or replace function public.correct_fitness_sale_to_internal_use(p_sale_id uuid,p_notes text default null)
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if not public.can_write_fitness() then raise exception 'Usuário sem permissão para corrigir venda Fitness'; end if;
  perform 1 from public.fitness_sales where id=p_sale_id for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  update public.fitness_inventory_movements set movement_type='internal_use',sale_id=null,notes=concat_ws(' | ',notes,'Reclassificada como uso interno',nullif(btrim(p_notes),'')) where sale_id=p_sale_id and movement_type='sale';
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'A venda não possui saída de estoque para reclassificar'; end if;
  update public.fitness_sales set general_status='cancelled',total_amount=0,total_profit=0,payment_method=null,payment_due_on=null,paid_on=null,delivered_on=null,notes=concat_ws(' | ',notes,'Reclassificada como uso interno; saída de estoque preservada',nullif(btrim(p_notes),'')),updated_at=now() where id=p_sale_id;
  insert into public.audit_events(entity_type,entity_id,action,details,created_by) values('fitness_sale',p_sale_id,'reclassified_internal_use',jsonb_build_object('movements',v_count,'notes',nullif(btrim(p_notes),'')),auth.uid());
  return v_count;
end; $$;

create or replace view public.fitness_inventory_movement_overview with (security_invoker=true) as
select m.id,m.variant_id,m.movement_type,m.quantity_delta,m.sale_id,m.purchase_order_item_id,m.transfer_group_id,m.notes,m.created_at,p.id product_id,p.name product_name,p.image_url,v.size,v.color,v.sku,
case m.movement_type when 'opening' then 'Saldo inicial' when 'purchase' then 'Entrada de pedido' when 'sale' then 'Venda/entrega' when 'adjustment' then 'Ajuste' when 'cancellation' then 'Estorno' when 'conversion_in' then 'Conversão - entrada' when 'conversion_out' then 'Conversão - saída' when 'internal_use' then 'Uso interno' when 'loss_damage' then 'Perda ou avaria' else m.movement_type end movement_label
from public.fitness_inventory_movements m join public.fitness_variants v on v.id=m.variant_id join public.fitness_products p on p.id=v.product_id;

create or replace view public.erp_fitness_inventory_movements_overview with (security_invoker=true) as
select m.id,m.created_at,m.movement_type,case m.movement_type when 'purchase' then 'Compra' when 'sale' then 'Venda' when 'conversion_in' then 'Conversão de entrada' when 'conversion_out' then 'Conversão de saída' when 'internal_use' then 'Uso interno' when 'loss_damage' then 'Perda ou avaria' when 'adjustment' then 'Ajuste de conferência' else m.movement_type end as movement_label,m.quantity_delta,m.notes,m.variant_id,v.product_id,p.name as product_name,v.size,v.color,v.sku
from public.fitness_inventory_movements m join public.fitness_variants v on v.id=m.variant_id join public.fitness_products p on p.id=v.product_id;

revoke all on function public.record_fitness_operational_outflow(uuid,integer,text,text) from public,anon;
revoke all on function public.reconcile_fitness_stock(jsonb,text) from public,anon;
revoke all on function public.correct_fitness_sale_to_internal_use(uuid,text) from public,anon;
grant execute on function public.record_fitness_operational_outflow(uuid,integer,text,text),public.reconcile_fitness_stock(jsonb,text),public.correct_fitness_sale_to_internal_use(uuid,text) to authenticated,service_role;

commit;
