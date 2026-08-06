create or replace view public.customer_links_overview_v1 as
select
  r.id as link_id,
  r.customer_id,
  c.name as customer_name,
  'related'::text as link_group,
  r.relation_type,
  r.relation_label,
  r.related_customer_id as target_id,
  rc.name as target_name,
  'customer'::text as target_kind,
  null::boolean as counts_for_partnership,
  null::boolean as auto_attribute_sales,
  null::boolean as is_primary,
  r.notes,
  r.active,
  r.created_at,
  r.updated_at
from public.customer_relationships r
join public.customers c on c.id = r.customer_id
join public.customers rc on rc.id = r.related_customer_id
union all
select
  a.id as link_id,
  a.customer_id,
  c.name as customer_name,
  'partner'::text as link_group,
  a.relation_type,
  a.relation_label,
  a.partner_id as target_id,
  p.name as target_name,
  'partner'::text as target_kind,
  a.counts_for_partnership,
  a.auto_attribute_sales,
  a.is_primary,
  a.notes,
  a.active,
  a.created_at,
  a.updated_at
from public.customer_partner_affiliations a
join public.customers c on c.id = a.customer_id
join public.partners p on p.id = a.partner_id;

grant select on public.customer_links_overview_v1 to authenticated;

create or replace view public.customer_pending_partner_links_v1 as
with partner_sales as (
  select
    s.customer_id,
    s.partner_id,
    count(*)::integer as sale_count,
    min(coalesce(s.delivered_at, s.quoted_at, s.created_at)) as first_sale_at,
    max(coalesce(s.delivered_at, s.quoted_at, s.created_at)) as last_sale_at,
    coalesce(sum(s.total_amount),0)::numeric(12,2) as total_sales_value
  from public.sales s
  where s.customer_id is not null
    and s.partner_id is not null
    and s.record_type = 'sale'::sale_record_type
    and s.general_status <> 'cancelled'::sale_general_status
  group by s.customer_id, s.partner_id
)
select
  ps.customer_id,
  c.name as customer_name,
  c.city as customer_city,
  ps.partner_id,
  p.name as partner_name,
  p.partner_type,
  ps.sale_count,
  ps.first_sale_at,
  ps.last_sale_at,
  ps.total_sales_value,
  'sale_with_partner_without_formal_link'::text as evidence_type,
  'Confirmar qual é o vínculo real antes de cadastrar.'::text as recommended_action
from partner_sales ps
join public.customers c on c.id = ps.customer_id and c.active
join public.partners p on p.id = ps.partner_id and p.active
left join public.customer_partner_affiliations a
  on a.customer_id = ps.customer_id
 and a.partner_id = ps.partner_id
 and a.active
where a.id is null;

grant select on public.customer_pending_partner_links_v1 to authenticated;
