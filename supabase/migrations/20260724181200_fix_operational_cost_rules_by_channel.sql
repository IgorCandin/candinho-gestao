-- Corrige a seleção da receita pelo canal real da venda.
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
