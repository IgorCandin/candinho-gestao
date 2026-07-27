begin;

-- Categoria Restrito: sempre sem alerta automático quando zerado.
update public.products
set sales_category = 'Z', updated_at = now()
where active
  and lower(coalesce(category,'')) like 'restrit%';

-- Produtos definidos como sob encomenda: categoria C.
update public.products
set sales_category = 'C', updated_at = now()
where active
  and not restricted
  and (
    lower(name) like '%colag%'
    or lower(name) like 'ashwagandha %'
    or lower(name) like 'moringa %'
    or lower(name) = 'kit whey protein'
    or lower(name) like 'pholia magra%'
    or lower(name) like '%pure energy%'
    or lower(name) like 'feno-grego%'
    or lower(name) like '%creagummy%'
    or lower(name) like 'creatina %health labs%'
    or lower(name) like 'uxi %'
    or lower(name) like 'testo dilated red%'
    or lower(name) like 'testo dilated blue%'
  );

-- Estado comercial explícito para diferenciar zerado crítico de sob encomenda.
create or replace view public.product_catalog_commercial_sort
with (security_invoker = true)
as
with sold as (
  select si.product_id,
         coalesce(sum(si.quantity),0)::integer as total_sold
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  where s.record_type = 'sale'::public.sale_record_type
    and s.general_status <> 'cancelled'::public.sale_general_status
  group by si.product_id
)
select
  pc.id,
  pc.name,
  pc.category,
  pc.brand,
  pc.image_url,
  pc.active,
  pc.sale_price,
  pc.installment_price,
  pc.thumbnail_url,
  pc.physical_quantity,
  pc.reserved_quantity,
  pc.available_quantity,
  pc.incoming_quantity,
  pc.awaiting_sales_quantity,
  case
    when pc.active
      and pc.available_quantity <= 0
      and pc.incoming_quantity <= 0
      and (
        p.restricted
        or upper(coalesce(p.sales_category,'')) = 'Z'
        or lower(coalesce(pc.category,'')) like 'restrit%'
      )
      then 'restricted_order'
    when pc.active
      and pc.available_quantity <= 0
      and pc.incoming_quantity <= 0
      and upper(coalesce(p.sales_category,'')) = 'C'
      then 'made_to_order'
    else pc.stock_status
  end as stock_status,
  coalesce(sold.total_sold,0) as total_sold,
  case when lower(btrim(pc.name)) = 'creatina candinho' then 0 else 1 end as flagship_rank,
  case
    when not pc.active then 4
    when pc.available_quantity > 0 then 0
    when pc.incoming_quantity > 0 then 1
    when upper(coalesce(p.sales_category,'')) in ('C','Z') or p.restricted then 3
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
join public.products p on p.id = pc.id
left join sold on sold.product_id = pc.id;

commit;
