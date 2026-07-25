-- Evita congelar custo zero quando os perfis ainda não possuem insumos.
create or replace function public.operational_cost_rules_exist(
  p_operation_scope text,
  p_sale_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_channel text;
  v_profile_id uuid;
begin
  if p_operation_scope='supplements' then
    select case when partner_id is not null then 'partner' else 'retail' end
    into v_channel
    from public.sales
    where id=p_sale_id;
  elsif p_operation_scope='fitness' then
    select case when source_consignment_id is not null then 'consignment' else 'retail' end
    into v_channel
    from public.fitness_sales
    where id=p_sale_id;
  else
    return false;
  end if;

  select id into v_profile_id
  from public.operational_cost_profiles
  where operation_scope=p_operation_scope
    and channel=v_channel and active and is_default
  limit 1;

  if v_profile_id is null then
    select id into v_profile_id
    from public.operational_cost_profiles
    where operation_scope=p_operation_scope
      and channel='retail' and active and is_default
    limit 1;
  end if;

  return
    exists(
      select 1
      from public.operational_cost_profile_items i
      join public.operational_supplies s on s.id=i.supply_id and s.active
      where i.profile_id=v_profile_id
    )
    or exists(
      select 1
      from public.product_operational_supply_requirements r
      where r.operation_scope=p_operation_scope and r.active
        and (
          (p_operation_scope='supplements' and exists(
            select 1 from public.sale_items si
            where si.sale_id=p_sale_id and si.product_id=r.product_id
          ))
          or
          (p_operation_scope='fitness' and exists(
            select 1
            from public.fitness_sale_items fsi
            join public.fitness_variants fv on fv.id=fsi.variant_id
            where fsi.sale_id=p_sale_id
              and fv.product_id=r.fitness_product_id
          ))
        )
    );
end;
$$;

create or replace function public.handle_supplement_sale_cost_status()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.general_status<>'cancelled' and new.general_status='cancelled' then
    perform public.reverse_sale_operational_costs('supplements',new.id);
    return new;
  end if;

  if old.delivery_status<>'delivered' and new.delivery_status='delivered'
     and new.general_status<>'cancelled'
  then
    update public.sale_items si
    set unit_cost=p.cost_price
    from public.products p
    where si.sale_id=new.id and p.id=si.product_id;

    if public.operational_cost_rules_exist('supplements',new.id) then
      perform public.apply_sale_operational_costs('supplements',new.id);
    else
      update public.sales
      set cost_snapshot_status='pending',updated_at=now()
      where id=new.id and cost_snapshot_status<>'finalized';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.handle_fitness_sale_cost_status()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.general_status<>'cancelled' and new.general_status='cancelled' then
    perform public.reverse_sale_operational_costs('fitness',new.id);
    return new;
  end if;

  if old.delivery_status<>'delivered' and new.delivery_status='delivered'
     and new.general_status<>'cancelled'
  then
    update public.fitness_sale_items si
    set unit_cost=fv.cost_price
    from public.fitness_variants fv
    where si.sale_id=new.id and fv.id=si.variant_id;

    if public.operational_cost_rules_exist('fitness',new.id) then
      perform public.apply_sale_operational_costs('fitness',new.id);
    else
      update public.fitness_sales
      set cost_snapshot_status='pending',updated_at=now()
      where id=new.id and cost_snapshot_status<>'finalized';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.apply_supplement_cost_after_item_deferred()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if public.operational_cost_rules_exist('supplements',new.sale_id) then
    perform public.apply_sale_operational_costs('supplements',new.sale_id);
  elsif exists(
    select 1 from public.sales
    where id=new.sale_id and delivery_status='delivered'
      and general_status<>'cancelled'
  ) then
    update public.sales
    set cost_snapshot_status='pending',updated_at=now()
    where id=new.sale_id and cost_snapshot_status<>'finalized';
  end if;
  return null;
end;
$$;

create or replace function public.apply_fitness_cost_after_item_deferred()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if public.operational_cost_rules_exist('fitness',new.sale_id) then
    perform public.apply_sale_operational_costs('fitness',new.sale_id);
  elsif exists(
    select 1 from public.fitness_sales
    where id=new.sale_id and delivery_status='delivered'
      and general_status<>'cancelled'
  ) then
    update public.fitness_sales
    set cost_snapshot_status='pending',updated_at=now()
    where id=new.sale_id and cost_snapshot_status<>'finalized';
  end if;
  return null;
end;
$$;

revoke all on function public.operational_cost_rules_exist(text,uuid)
from public,anon,authenticated;
grant execute on function public.operational_cost_rules_exist(text,uuid)
to service_role;
