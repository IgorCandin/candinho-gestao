begin;
create or replace function public.adjust_pending_sale_discount_v1(p_sale_id uuid,p_discount_amount numeric,p_reason text default null)
returns numeric language plpgsql security definer set search_path=public as $$
declare v_sale public.sales%rowtype; v_total numeric(12,2); v_cost numeric(12,2); v_installments integer;
begin
 if not public.can_write() then raise exception 'Usuário sem permissão para ajustar a venda'; end if;
 if p_discount_amount is null or p_discount_amount < 0 then raise exception 'Desconto inválido'; end if;
 select * into v_sale from public.sales where id=p_sale_id for update;
 if not found or v_sale.record_type <> 'sale' then raise exception 'Venda não encontrada'; end if;
 select count(*) into v_installments from public.sale_payment_installments where sale_id=p_sale_id;
 if v_sale.general_status='cancelled' or v_sale.payment_status='received' or v_sale.delivery_status='delivered' or v_installments>0 then raise exception 'O desconto só pode ser alterado antes de receber, parcelar ou entregar'; end if;
 if p_discount_amount > coalesce(v_sale.gross_amount,0) then raise exception 'O desconto não pode superar o valor dos itens'; end if;
 v_total:=greatest(coalesce(v_sale.gross_amount,0)-p_discount_amount+coalesce(v_sale.agreed_markup_amount,0),0)::numeric(12,2);
 select coalesce(sum(total_cost),0)+coalesce(v_sale.gift_quantity,0)*coalesce(v_sale.gift_unit_cost,0) into v_cost from public.sale_items where sale_id=p_sale_id;
 update public.sales set discount_amount=p_discount_amount,total_amount=v_total,total_cost=v_cost,total_profit=(v_total-v_cost)::numeric(12,2),price_condition=case when p_discount_amount>0 then 'Desconto' else price_condition end,updated_at=now() where id=p_sale_id;
 update public.sales_quotes set discount_amount=p_discount_amount,total_amount=v_total,updated_at=now() where sale_id=p_sale_id and status='confirmed';
 insert into public.audit_events(entity_type,entity_id,action,details) values('sale',p_sale_id,'pending_discount_adjusted_v1',jsonb_build_object('old_discount',v_sale.discount_amount,'new_discount',p_discount_amount,'old_total',v_sale.total_amount,'new_total',v_total,'reason',nullif(btrim(p_reason),'')));
 return v_total;
end; $$;
revoke all on function public.adjust_pending_sale_discount_v1(uuid,numeric,text) from public,anon;
grant execute on function public.adjust_pending_sale_discount_v1(uuid,numeric,text) to authenticated,service_role;
commit;
