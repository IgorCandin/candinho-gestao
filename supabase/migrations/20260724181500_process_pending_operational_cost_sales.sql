create or replace function public.process_pending_operational_cost_sales(
  p_operation_scope text,
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row record;
  v_processed integer:=0;
  v_limit integer:=least(greatest(coalesce(p_limit,100),1),500);
begin
  if not public.can_manage_operational_costs() then
    raise exception 'Usuário sem permissão para processar custos pendentes';
  end if;
  if p_operation_scope not in ('supplements','fitness') then
    raise exception 'Operação inválida';
  end if;

  if p_operation_scope='supplements' then
    for v_row in
      select id
      from public.sales
      where record_type='sale'
        and general_status<>'cancelled'
        and delivery_status='delivered'
        and cost_snapshot_status='pending'
      order by delivered_at,created_at,id
      limit v_limit
    loop
      if public.operational_cost_rules_exist('supplements',v_row.id) then
        perform public.apply_sale_operational_costs('supplements',v_row.id);
        v_processed:=v_processed+1;
      end if;
    end loop;
  else
    for v_row in
      select id
      from public.fitness_sales
      where general_status<>'cancelled'
        and delivery_status='delivered'
        and cost_snapshot_status='pending'
      order by delivered_on,created_at,id
      limit v_limit
    loop
      if public.operational_cost_rules_exist('fitness',v_row.id) then
        perform public.apply_sale_operational_costs('fitness',v_row.id);
        v_processed:=v_processed+1;
      end if;
    end loop;
  end if;

  return v_processed;
end;
$$;

revoke all on function public.process_pending_operational_cost_sales(text,integer)
from public,anon;
grant execute on function public.process_pending_operational_cost_sales(text,integer)
to authenticated,service_role;
