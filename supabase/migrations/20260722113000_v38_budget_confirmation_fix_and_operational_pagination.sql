begin;

do $fix$
declare
  v_oid oid;
  v_def text;
begin
  v_oid := to_regprocedure(
    'public.save_budget_quote_v2(uuid,uuid,date,date,jsonb,numeric,uuid,integer,text,date,text,date,boolean,date,date,boolean,date,text,uuid,uuid)'
  );

  if v_oid is null then
    raise exception 'save_budget_quote_v2 não encontrada';
  end if;

  select pg_get_functiondef(v_oid)
    into v_def;

  v_def := replace(
    v_def,
    'delete from public.sales_quote_items where quote_id=v_quote_id;',
    'delete from public.sales_quote_items qi where qi.quote_id=v_quote_id;'
  );

  execute v_def;
end
$fix$;

do $rename$
begin
  if to_regprocedure('public.confirm_budget_quote_v2_core(uuid)') is null then
    alter function public.confirm_budget_quote_v2(uuid)
      rename to confirm_budget_quote_v2_core;
  end if;
end
$rename$;

create or replace function public.confirm_budget_quote_v2(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_status text;
  v_sale_id uuid;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para confirmar orçamentos';
  end if;

  select status::text, sale_id
    into v_status, v_sale_id
  from public.sales_quotes
  where id = p_quote_id;

  if not found then
    raise exception 'Orçamento não encontrado';
  end if;

  if v_status = 'confirmed' and v_sale_id is not null then
    return v_sale_id;
  end if;

  return public.confirm_budget_quote_v2_core(p_quote_id);
end;
$function$;

revoke all
on function public.confirm_budget_quote_v2(uuid)
from anon, public;

grant execute
on function public.confirm_budget_quote_v2(uuid)
to authenticated, service_role;

revoke all
on function public.confirm_budget_quote_v2_core(uuid)
from anon, public, authenticated;

grant execute
on function public.confirm_budget_quote_v2_core(uuid)
to service_role;

create or replace function public.auto_confirm_saved_budget_quote_v2()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_quote record;
begin
  if new.entity_type = 'quote'
     and new.action = 'saved_v2'
  then
    select
      q.id,
      q.status::text as status,
      q.delivered,
      q.delivery_due_on,
      q.schedule_post_sale
    into v_quote
    from public.sales_quotes q
    where q.id = new.entity_id;

    if found
       and v_quote.status = 'quoted'
       and (
         coalesce(v_quote.delivered, false)
         or v_quote.delivery_due_on is not null
         or coalesce(v_quote.schedule_post_sale, false)
       )
    then
      perform public.confirm_budget_quote_v2(v_quote.id);
    end if;
  end if;

  return new;
end;
$function$;

revoke all
on function public.auto_confirm_saved_budget_quote_v2()
from anon, public;

drop trigger if exists trg_auto_confirm_saved_budget_quote_v2
on public.audit_events;

create trigger trg_auto_confirm_saved_budget_quote_v2
after insert on public.audit_events
for each row
execute function public.auto_confirm_saved_budget_quote_v2();

create or replace view public.erp_inventory_movements_overview
with (security_invoker = true)
as
select
  m.id,
  m.created_at,
  m.movement_type,
  m.quantity_delta,
  m.notes,
  m.product_id,
  p.name as product_name,
  m.location_id,
  l.code as location_code,
  l.name as location_name
from public.inventory_movements m
join public.products p on p.id = m.product_id
join public.locations l on l.id = m.location_id;

create or replace view public.erp_fitness_inventory_movements_overview
with (security_invoker = true)
as
select
  m.id,
  m.created_at,
  m.movement_type,
  case m.movement_type
    when 'purchase' then 'Compra'
    when 'sale' then 'Venda'
    when 'conversion_in' then 'Conversão de entrada'
    when 'conversion_out' then 'Conversão de saída'
    else m.movement_type
  end as movement_label,
  m.quantity_delta,
  m.notes,
  m.variant_id,
  v.product_id,
  p.name as product_name,
  v.size,
  v.color,
  v.sku
from public.fitness_inventory_movements m
join public.fitness_variants v on v.id = m.variant_id
join public.fitness_products p on p.id = v.product_id;

grant select
on public.erp_inventory_movements_overview
to authenticated, service_role;

grant select
on public.erp_fitness_inventory_movements_overview
to authenticated, service_role;

commit;
