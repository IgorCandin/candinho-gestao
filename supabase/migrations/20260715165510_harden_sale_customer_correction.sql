create or replace function public.change_sale_customer(p_sale_id uuid, p_customer_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_sale public.sales%rowtype; v_old_customer public.customers%rowtype; v_new_customer public.customers%rowtype;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para corrigir vendas'; end if;
  select * into v_sale from public.sales where id=p_sale_id and record_type='sale' for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  select * into v_new_customer from public.customers where id=p_customer_id and active;
  if not found then raise exception 'Cliente não encontrado ou inativo'; end if;
  if v_sale.customer_id is not null then select * into v_old_customer from public.customers where id=v_sale.customer_id; end if;
  if v_sale.customer_id=p_customer_id then return p_sale_id; end if;
  update public.sales set customer_id=p_customer_id,phone=v_new_customer.phone,city=v_new_customer.city,reference=v_new_customer.reference,updated_at=now() where id=p_sale_id;
  update public.deliveries set city=v_new_customer.city,reference=v_new_customer.reference where sale_id=p_sale_id;
  insert into public.audit_events(entity_type,entity_id,action,details) values('sale',p_sale_id,'customer_changed',jsonb_build_object('old_customer_id',v_sale.customer_id,'old_customer_name',v_old_customer.name,'new_customer_id',v_new_customer.id,'new_customer_name',v_new_customer.name,'snapshot_updated',true));
  return p_sale_id;
end;$$;
