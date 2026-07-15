create or replace function public.cancel_sale(p_sale_id uuid,p_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_sale public.sales%rowtype;v_item public.sale_items%rowtype;v_released integer:=0;v_restored integer:=0;
begin
 if not public.can_write() then raise exception 'Usuário sem permissão para cancelar vendas';end if;
 select * into v_sale from public.sales where id=p_sale_id and record_type='sale' for update;
 if not found then raise exception 'Venda não encontrada';end if;if v_sale.general_status='cancelled' then return v_sale.id;end if;
 if v_sale.stock_deducted then for v_item in select * from public.sale_items where sale_id=p_sale_id loop insert into public.inventory_movements(product_id,location_id,movement_type,quantity_delta,sale_id,notes,idempotency_key) values(v_item.product_id,v_sale.location_id,'cancellation',v_item.quantity,v_sale.id,'Estorno do cancelamento da venda '||v_sale.id,'cancel:'||v_sale.id||':item:'||v_item.id) on conflict(idempotency_key) do nothing;v_restored:=v_restored+v_item.quantity;end loop;
 else update public.stock_reservations set status='released',quantity_reserved=0,released_at=now(),updated_at=now(),notes=case when nullif(btrim(notes),'') is null then 'Reserva liberada por cancelamento da venda' else notes||' | Reserva liberada por cancelamento da venda' end where sale_id=p_sale_id and status in ('reserved','partial','awaiting_stock');get diagnostics v_released=row_count;end if;
 update public.sales set general_status='cancelled',cancelled_at=now(),cancellation_reason=nullif(btrim(p_reason),''),stock_deducted=false,updated_at=now() where id=p_sale_id;
 update public.deliveries set status=case when status='Entregue' then status else 'Cancelado' end where sale_id=p_sale_id;
 insert into public.audit_events(entity_type,entity_id,action,details) values('sale',p_sale_id,'cancelled',jsonb_build_object('reason',p_reason,'stock_was_deducted',v_sale.stock_deducted,'restored_units',v_restored,'released_reservations',v_released));return p_sale_id;
end;$$;
