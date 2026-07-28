create or replace view public.leads_history
with (security_invoker = true)
as
select
  s.id,
  s.customer_id,
  c.name as customer_name,
  s.location_id,
  l.code as location_code,
  l.name as location_name,
  s.quoted_at as lead_at,
  (s.quoted_at at time zone 'UTC')::date as lead_date,
  date_trunc('month', (s.quoted_at at time zone 'UTC'))::date as lead_month,
  s.lead_status,
  s.general_status,
  s.reference,
  s.city,
  s.phone,
  s.notes,
  items.product_summary,
  items.total_items,
  items.primary_product_id,
  items.primary_image_url
from public.sales s
left join public.customers c on c.id = s.customer_id
join public.locations l on l.id = s.location_id
left join lateral (
  select
    string_agg(p.name || ' ×' || si.quantity::text, ', ' order by p.name) as product_summary,
    coalesce(sum(si.quantity), 0)::integer as total_items,
    (array_agg(p.id order by si.id))[1] as primary_product_id,
    (array_agg(p.image_url order by si.id) filter (where p.image_url is not null))[1] as primary_image_url
  from public.sale_items si
  join public.products p on p.id = si.product_id
  where si.sale_id = s.id
) items on true
where s.record_type = 'lead'::public.sale_record_type
  and lower(coalesce(s.lead_status, '')) <> 'convertido';

grant select on public.leads_history to authenticated, service_role;
