create or replace view public.fitness_post_sale_cycle_sales
with (security_invoker = true)
as
select
  s.id as sale_id,
  s.customer_id,
  s.quoted_on,
  s.total_amount,
  s.notes,
  coalesce(string_agg(distinct fp.name, ', '), 'Produtos da Fitness') as product_summary
from public.fitness_sales s
left join public.fitness_post_sale_state st on st.customer_id = s.customer_id
left join public.fitness_sale_items si on si.sale_id = s.id
left join public.fitness_variants fv on fv.id = si.variant_id
left join public.fitness_products fp on fp.id = fv.product_id
where s.customer_id is not null
  and coalesce(s.general_status, '') <> 'cancelled'
  and s.quoted_on > coalesce(st.completed_through_on, date '1900-01-01')
group by s.id, s.customer_id, s.quoted_on, s.total_amount, s.notes;

grant select on public.fitness_post_sale_cycle_sales to authenticated;
