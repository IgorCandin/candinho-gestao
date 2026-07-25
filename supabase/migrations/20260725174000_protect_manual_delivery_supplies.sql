-- Evita dupla contagem: materiais escolhidos na entrega e materiais de recebimento
-- não podem entrar também nas receitas automáticas.

create or replace function public.save_operational_cost_profile(p_profile_id uuid,p_operation_scope text,p_channel text,p_name text,p_is_default boolean,p_active boolean,p_items jsonb,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_item record;
begin
 if not public.can_manage_operational_costs() then raise exception 'Usuário sem permissão para configurar custos';end if;
 if p_operation_scope not in ('supplements','fitness') then raise exception 'Operação inválida';end if;
 if p_channel not in ('retail','delivery','partner','consignment') then raise exception 'Canal inválido';end if;
 if nullif(btrim(p_name),'') is null then raise exception 'Informe o nome do perfil';end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Itens do perfil inválidos';end if;
 if coalesce(p_is_default,false) then update public.operational_cost_profiles set is_default=false,updated_by=auth.uid(),updated_at=now() where operation_scope=p_operation_scope and channel=p_channel and is_default;end if;
 if p_profile_id is null then
   insert into public.operational_cost_profiles(operation_scope,channel,name,is_default,active,notes,created_by,updated_by) values(p_operation_scope,p_channel,btrim(p_name),coalesce(p_is_default,false),coalesce(p_active,true),nullif(btrim(p_notes),''),auth.uid(),auth.uid()) returning id into v_id;
 else
   update public.operational_cost_profiles set operation_scope=p_operation_scope,channel=p_channel,name=btrim(p_name),is_default=coalesce(p_is_default,false),active=coalesce(p_active,true),notes=nullif(btrim(p_notes),''),updated_by=auth.uid(),updated_at=now() where id=p_profile_id returning id into v_id;
   if v_id is null then raise exception 'Perfil não encontrado';end if;
 end if;
 delete from public.operational_cost_profile_items where profile_id=v_id;
 for v_item in select * from jsonb_to_recordset(p_items) as x(supply_id uuid,usage_basis text,quantity numeric) loop
   if v_item.supply_id is null or coalesce(v_item.quantity,0)<=0 then raise exception 'Revise o material e a quantidade do perfil';end if;
   if v_item.usage_basis not in ('per_sale','per_line','per_unit') then raise exception 'Base de consumo inválida';end if;
   if not exists(select 1 from public.operational_supplies s where s.id=v_item.supply_id and s.active and s.operation_scope in ('shared',p_operation_scope) and s.usage_stage='sale_delivery_auto') then
     raise exception 'Este material é escolhido manualmente ou usado quando o produto chega. Só materiais configurados como Entrega automática podem entrar nesta receita.';
   end if;
   insert into public.operational_cost_profile_items(profile_id,supply_id,usage_basis,quantity) values(v_id,v_item.supply_id,v_item.usage_basis,v_item.quantity);
 end loop;
 insert into public.audit_events(entity_type,entity_id,action,details) values('operational_cost_profile',v_id,'saved',jsonb_build_object('operation_scope',p_operation_scope,'channel',p_channel,'is_default',p_is_default,'item_count',jsonb_array_length(p_items)));
 return v_id;
end;
$$;

create or replace function public.save_product_operational_requirement(p_operation_scope text,p_product_id uuid,p_supply_id uuid,p_quantity_per_unit numeric,p_active boolean default true,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if not public.can_manage_operational_costs() then raise exception 'Usuário sem permissão para configurar custos do produto';end if;
 if p_operation_scope not in ('supplements','fitness') then raise exception 'Operação inválida';end if;
 if coalesce(p_quantity_per_unit,0)<=0 then raise exception 'A quantidade por unidade precisa ser maior que zero';end if;
 if not exists(select 1 from public.operational_supplies s where s.id=p_supply_id and s.active and s.operation_scope in ('shared',p_operation_scope) and s.usage_stage='sale_delivery_auto') then
   raise exception 'Para produto especial, use um material configurado como Entrega automática. Etiquetas entram no recebimento e sacolas manuais são escolhidas na entrega.';
 end if;
 if p_operation_scope='supplements' then
   if not exists(select 1 from public.products where id=p_product_id) then raise exception 'Produto não encontrado';end if;
   insert into public.product_operational_supply_requirements(operation_scope,product_id,supply_id,quantity_per_unit,active,notes,created_by,updated_by) values('supplements',p_product_id,p_supply_id,p_quantity_per_unit,coalesce(p_active,true),nullif(btrim(p_notes),''),auth.uid(),auth.uid())
   on conflict(product_id,supply_id) where operation_scope='supplements' do update set quantity_per_unit=excluded.quantity_per_unit,active=excluded.active,notes=excluded.notes,updated_by=auth.uid(),updated_at=now() returning id into v_id;
 else
   if not exists(select 1 from public.fitness_products where id=p_product_id) then raise exception 'Produto Fitness não encontrado';end if;
   insert into public.product_operational_supply_requirements(operation_scope,fitness_product_id,supply_id,quantity_per_unit,active,notes,created_by,updated_by) values('fitness',p_product_id,p_supply_id,p_quantity_per_unit,coalesce(p_active,true),nullif(btrim(p_notes),''),auth.uid(),auth.uid())
   on conflict(fitness_product_id,supply_id) where operation_scope='fitness' do update set quantity_per_unit=excluded.quantity_per_unit,active=excluded.active,notes=excluded.notes,updated_by=auth.uid(),updated_at=now() returning id into v_id;
 end if;
 return v_id;
end;
$$;
