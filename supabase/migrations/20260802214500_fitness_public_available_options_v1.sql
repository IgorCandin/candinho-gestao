create or replace function public.public_fitness_available_options_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(product_id::text, options order by product_id::text),
    '{}'::jsonb
  )
  from (
    select
      product_id,
      jsonb_agg(
        jsonb_build_object(
          'size', size,
          'color', color,
          'available_quantity', available_quantity
        )
        order by
          case
            when lower(btrim(color)) in ('preto','preta','black') then 0
            else 1
          end,
          color,
          size
      ) as options
    from public.fitness_stock_operational
    where product_active = true
      and variant_active = true
      and available_quantity > 0
    group by product_id
  ) grouped;
$$;

revoke all on function public.public_fitness_available_options_v1() from public;
grant execute on function public.public_fitness_available_options_v1()
to anon, authenticated, service_role;
