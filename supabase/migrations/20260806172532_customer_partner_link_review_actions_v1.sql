create table if not exists public.customer_partner_link_reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  review_status text not null check (review_status in ('ignored','snoozed')),
  notes text,
  snoozed_until timestamptz,
  reviewed_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, partner_id)
);

create index if not exists customer_partner_link_reviews_status_idx
  on public.customer_partner_link_reviews(review_status, snoozed_until);

alter table public.customer_partner_link_reviews enable row level security;

drop policy if exists customer_partner_link_reviews_authenticated_select on public.customer_partner_link_reviews;
create policy customer_partner_link_reviews_authenticated_select
on public.customer_partner_link_reviews for select to authenticated using (true);

drop policy if exists customer_partner_link_reviews_authenticated_insert on public.customer_partner_link_reviews;
create policy customer_partner_link_reviews_authenticated_insert
on public.customer_partner_link_reviews for insert to authenticated
with check (reviewed_by is null or reviewed_by = auth.uid());

drop policy if exists customer_partner_link_reviews_authenticated_update on public.customer_partner_link_reviews;
create policy customer_partner_link_reviews_authenticated_update
on public.customer_partner_link_reviews for update to authenticated
using (true) with check (true);

grant select, insert, update on public.customer_partner_link_reviews to authenticated;

create or replace function public.touch_customer_partner_link_review_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_customer_partner_link_review_updated_at on public.customer_partner_link_reviews;
create trigger trg_touch_customer_partner_link_review_updated_at
before update on public.customer_partner_link_reviews
for each row execute function public.touch_customer_partner_link_review_updated_at();

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
left join public.customer_partner_link_reviews r
  on r.customer_id = ps.customer_id
 and r.partner_id = ps.partner_id
where a.id is null
  and (
    r.id is null
    or (r.review_status = 'snoozed' and (r.snoozed_until is null or r.snoozed_until <= now()))
  );

grant select on public.customer_pending_partner_links_v1 to authenticated;
