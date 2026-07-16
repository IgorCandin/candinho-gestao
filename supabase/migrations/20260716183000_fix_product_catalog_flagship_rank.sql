-- Revisão do catálogo comercial:
-- "Creatina Candinho" é o único carro-chefe. Combos que citam o nome não podem herdar prioridade 0.

create or replace view public.product_catalog_commercial_sort as
with sold as (
  select
    si.product_id,
    coalesce(sum(si.quantity), 0)::integer as total_sold
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  where s.record_type = 'sale'
    and s.general_status <> 'cancelled'
  group by si.product_id
)
select
  pc.*,
  coalesce(sold.total_sold, 0)::integer as total_sold,
  case
    when lower(btrim(pc.name)) = 'creatina candinho' then 0
    else 1
  end as flagship_rank,
  case
    when not pc.active then 3
    when pc.available_quantity > 0 then 0
    when pc.incoming_quantity > 0 then 1
    else 2
  end as availability_rank,
  case
    when lower(pc.category) like 'força%' or lower(pc.category) like 'forca%' then 0
    when lower(pc.category) like 'energia%' then 1
    when lower(pc.category) like 'emagrec%' then 2
    when lower(pc.category) like 'massa%' then 3
    when lower(pc.category) like 'saúde%' or lower(pc.category) like 'saude%' then 4
    when lower(pc.category) like 'sono%' then 5
    when lower(pc.category) like 'acess%' then 6
    when lower(pc.category) like 'restrit%' then 7
    else 8
  end as category_rank
from public.product_catalog pc
left join sold on sold.product_id = pc.id;

grant select on public.product_catalog_commercial_sort to authenticated, service_role;
