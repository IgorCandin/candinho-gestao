begin;

create index if not exists sales_customer_record_quoted_idx
  on public.sales(customer_id, record_type, quoted_at desc);

create index if not exists sale_items_sale_id_idx
  on public.sale_items(sale_id);

create index if not exists customers_name_id_idx
  on public.customers(name, id);

create index if not exists fitness_customers_name_id_idx
  on public.fitness_customers(name, id);

create index if not exists fitness_products_name_id_idx
  on public.fitness_products(name, id);

create index if not exists fitness_sales_quoted_on_id_idx
  on public.fitness_sales(quoted_on desc, id desc);

create index if not exists sales_quotes_created_at_id_idx
  on public.sales_quotes(created_at desc, id desc);

create or replace function public.erp_entity_swipe_navigation(
  p_kind text,
  p_current_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path to 'public'
as $function$
declare
  v_previous uuid;
  v_next uuid;
begin
  if p_kind = 'product' then
    select q.previous_id, q.next_id
    into v_previous, v_next
    from (
      select
        id,
        lag(id) over (
          order by
            flagship_rank asc,
            availability_rank asc,
            category_rank asc,
            total_sold desc,
            name asc,
            id asc
        ) as previous_id,
        lead(id) over (
          order by
            flagship_rank asc,
            availability_rank asc,
            category_rank asc,
            total_sold desc,
            name asc,
            id asc
        ) as next_id
      from public.product_catalog_commercial_sort
      where upper(name) not like '%COMBO%'
    ) q
    where q.id = p_current_id;

  elsif p_kind = 'customer' then
    select q.previous_id, q.next_id
    into v_previous, v_next
    from (
      select
        id,
        lag(id) over (order by name asc, id asc) as previous_id,
        lead(id) over (order by name asc, id asc) as next_id
      from public.customers
    ) q
    where q.id = p_current_id;

  elsif p_kind = 'sale' then
    select q.previous_id, q.next_id
    into v_previous, v_next
    from (
      select
        id,
        lag(id) over (order by quoted_at desc, id desc) as previous_id,
        lead(id) over (order by quoted_at desc, id desc) as next_id
      from public.sales
      where record_type = 'sale'
        and general_status <> 'cancelled'
    ) q
    where q.id = p_current_id;

  elsif p_kind = 'quote' then
    select q.previous_id, q.next_id
    into v_previous, v_next
    from (
      select
        id,
        lag(id) over (order by created_at desc, id desc) as previous_id,
        lead(id) over (order by created_at desc, id desc) as next_id
      from public.sales_quotes
    ) q
    where q.id = p_current_id;

  elsif p_kind = 'partner' then
    select q.previous_id, q.next_id
    into v_previous, v_next
    from (
      select
        id,
        lag(id) over (order by name asc, id asc) as previous_id,
        lead(id) over (order by name asc, id asc) as next_id
      from public.partner_management_overview
    ) q
    where q.id = p_current_id;

  elsif p_kind = 'fitness_product' then
    select q.previous_id, q.next_id
    into v_previous, v_next
    from (
      select
        id,
        lag(id) over (order by name asc, id asc) as previous_id,
        lead(id) over (order by name asc, id asc) as next_id
      from public.fitness_products
    ) q
    where q.id = p_current_id;

  elsif p_kind = 'fitness_customer' then
    select q.previous_id, q.next_id
    into v_previous, v_next
    from (
      select
        id,
        lag(id) over (order by name asc, id asc) as previous_id,
        lead(id) over (order by name asc, id asc) as next_id
      from public.fitness_customers
    ) q
    where q.id = p_current_id;

  elsif p_kind = 'fitness_sale' then
    select q.previous_id, q.next_id
    into v_previous, v_next
    from (
      select
        id,
        lag(id) over (order by quoted_on desc, id desc) as previous_id,
        lead(id) over (order by quoted_on desc, id desc) as next_id
      from public.fitness_sales
    ) q
    where q.id = p_current_id;
  else
    raise exception 'Tipo de navegação inválido: %', p_kind;
  end if;

  return jsonb_build_object(
    'previous_id', v_previous,
    'next_id', v_next
  );
end;
$function$;

revoke all on function public.erp_entity_swipe_navigation(text, uuid)
from anon, public;

grant execute on function public.erp_entity_swipe_navigation(text, uuid)
to authenticated, service_role;

commit;
