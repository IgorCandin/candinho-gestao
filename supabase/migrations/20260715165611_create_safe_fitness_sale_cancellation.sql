create or replace function public.cancel_fitness_sale(p_sale_id uuid,p_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_sale public.fitness_sales%rowtype;v_item record;v_released integer:=0;v_restored integer:=0;
begin
 if not public.can_write_fitness() then raise exception 'Usuário sem permissão para cancelar vendas Fitness';end if;
 select * into v_sale from public.fitness_sales where id=p_sale_id for update;if not found then raise exception 'Venda Fitness não encontrada';end if;if v_sale.general_status='cancelled' then return p_sale_id;end if;
 if v_sale.delivery_status='delivered' then for v_item in select id,variant_id,quantity from public.fitness_sale_items where sale_id=p_sale_id loop insert into public.fitness_inventory_movements(variant_id,movement_type,quantity_delta,sale_id,notes,idempotency_key) values(v_item.variant_id,'cancellation',v_item.quantity,p_sale_id,'Estorno do cancelamento da venda Fitness '||p_sale_id,'fitness:cancel:'||p_sale_id||':item:'||v_item.id) on conflict(idempotency_key) do nothing;v_restored:=v_restored+v_item.quantity;end loop;
 else update public.fitness_stock_reservations set status='cancelled',quantity_reserved=0,updated_at=now(),notes=case when nullif(btrim(notes),'') is null then 'Reserva cancelada com a venda' else notes||' | Reserva cancelada com a venda' end where sale_id=p_sale_id and status in ('reserved','partial','awaiting_stock');get diagnostics v_released=row_count;end if;
 update public.fitness_sales set general_status='cancelled',updated_at=now(),notes=case when nullif(btrim(p_reason),'') is null then notes when nullif(btrim(notes),'') is null then 'Cancelamento: '||btrim(p_reason) else notes||' | Cancelamento: '||btrim(p_reason) end where id=p_sale_id;
 insert into public.audit_events(entity_type,entity_id,action,details) values('fitness_sale',p_sale_id,'cancelled',jsonb_build_object('reason',p_reason,'restored_units',v_restored,'released_reservations',v_released));return p_sale_id;
end;$$;
grant execute on function public.cancel_fitness_sale(uuid,text) to authenticated;
