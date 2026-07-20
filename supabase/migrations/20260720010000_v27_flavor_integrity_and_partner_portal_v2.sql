begin;

create or replace view public.product_flavor_integrity_overview
with (security_invoker = true)
as
with active_flavors as (
  select
    product_id,
    count(*)::integer as active_flavor_count
  from public.product_flavors
  where active
  group by product_id
),
aggregate_stock as (
  select
    sb.product_id,
    coalesce(sum(sb.quantity),0)::integer
      as aggregate_physical
  from public.stock_balances sb
  join public.locations l on l.id=sb.location_id
  where l.active
    and l.tracks_inventory
  group by sb.product_id
),
flavor_stock as (
  select
    pf.product_id,
    coalesce(sum(pfsb.quantity),0)::integer
      as flavor_physical
  from public.product_flavors pf
  join public.product_flavor_stock_balances pfsb
    on pfsb.flavor_id=pf.id
  join public.locations l on l.id=pfsb.location_id
  where pf.active
    and l.active
    and l.tracks_inventory
  group by pf.product_id
),
aggregate_reserved as (
  select
    product_id,
    coalesce(sum(quantity_reserved),0)::integer
      as aggregate_reserved
  from public.stock_reservations
  where status in ('reserved','partial')
  group by product_id
),
flavor_reserved as (
  select
    sr.product_id,
    coalesce(sum(sr.quantity_reserved),0)::integer
      as flavor_reserved
  from public.stock_reservations sr
  where sr.status in ('reserved','partial')
    and sr.flavor_id is not null
  group by sr.product_id
),
aggregate_incoming as (
  select
    poi.product_id,
    coalesce(
      sum(
        greatest(
          poi.quantity_ordered-
          poi.quantity_received,
          0
        )
      ),
      0
    )::integer as aggregate_incoming
  from public.purchase_order_items poi
  join public.purchase_orders po
    on po.id=poi.purchase_order_id
  where po.status in ('pending','partial')
    and poi.quantity_received<
      poi.quantity_ordered
  group by poi.product_id
),
flavor_incoming as (
  select
    poi.product_id,
    coalesce(
      sum(
        greatest(
          poi.quantity_ordered-
          poi.quantity_received,
          0
        )
      ),
      0
    )::integer as flavor_incoming
  from public.purchase_order_items poi
  join public.purchase_orders po
    on po.id=poi.purchase_order_id
  where po.status in ('pending','partial')
    and poi.quantity_received<
      poi.quantity_ordered
    and poi.flavor_id is not null
  group by poi.product_id
),
historical as (
  select
    product_id,
    count(*)::integer
      as historical_pending_count
  from public.product_flavor_history_pending
  group by product_id
)
select
  p.id as product_id,
  p.name as product_name,
  coalesce(
    af.active_flavor_count,
    0
  )::integer as active_flavor_count,
  coalesce(
    ast.aggregate_physical,
    0
  )::integer as aggregate_physical,
  coalesce(
    fs.flavor_physical,
    0
  )::integer as flavor_physical,
  (
    coalesce(fs.flavor_physical,0)-
    coalesce(ast.aggregate_physical,0)
  )::integer as physical_difference,
  coalesce(
    ar.aggregate_reserved,
    0
  )::integer as aggregate_reserved,
  coalesce(
    fr.flavor_reserved,
    0
  )::integer as flavor_reserved,
  (
    coalesce(fr.flavor_reserved,0)-
    coalesce(ar.aggregate_reserved,0)
  )::integer as reserved_difference,
  coalesce(
    ai.aggregate_incoming,
    0
  )::integer as aggregate_incoming,
  coalesce(
    fi.flavor_incoming,
    0
  )::integer as flavor_incoming,
  (
    coalesce(fi.flavor_incoming,0)-
    coalesce(ai.aggregate_incoming,0)
  )::integer as incoming_difference,
  coalesce(
    h.historical_pending_count,
    0
  )::integer as historical_pending_count,
  case
    when coalesce(
      af.active_flavor_count,
      0
    )=0
      then 'no_active_flavors'
    when coalesce(
      fs.flavor_physical,
      0
    )<>coalesce(
      ast.aggregate_physical,
      0
    )
      then 'physical_mismatch'
    when coalesce(
      fr.flavor_reserved,
      0
    )<>coalesce(
      ar.aggregate_reserved,
      0
    )
      then 'reserved_mismatch'
    when coalesce(
      fi.flavor_incoming,
      0
    )<>coalesce(
      ai.aggregate_incoming,
      0
    )
      then 'incoming_mismatch'
    when coalesce(
      h.historical_pending_count,
      0
    )>0
      then 'history_pending'
    else 'healthy'
  end as integrity_status
from public.products p
left join active_flavors af
  on af.product_id=p.id
left join aggregate_stock ast
  on ast.product_id=p.id
left join flavor_stock fs
  on fs.product_id=p.id
left join aggregate_reserved ar
  on ar.product_id=p.id
left join flavor_reserved fr
  on fr.product_id=p.id
left join aggregate_incoming ai
  on ai.product_id=p.id
left join flavor_incoming fi
  on fi.product_id=p.id
left join historical h
  on h.product_id=p.id
where p.active
  and p.flavor_tracking_enabled;

grant select
on public.product_flavor_integrity_overview
to authenticated,service_role;

create or replace function
public.partner_portal_get_stock_v2()
returns table(
  product_id uuid,
  product_name text,
  flavor_id uuid,
  flavor_name text,
  brand text,
  category text,
  sale_price numeric,
  installment_price numeric,
  image_url text,
  quantity integer,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
  with partner_location as (
    select linked_location_id
    from public.partners
    where id=public.current_partner_id()
      and linked_location_id is not null
  )
  select
    pr.id,
    pr.name,
    null::uuid,
    null::text,
    pr.brand,
    pr.category,
    pr.sale_price,
    pr.installment_price,
    pr.image_url,
    coalesce(sb.quantity,0)::integer,
    sb.updated_at
  from partner_location pl
  join public.products pr
    on pr.active=true
   and not pr.flavor_tracking_enabled
  join public.stock_balances sb
    on sb.product_id=pr.id
   and sb.location_id=
     pl.linked_location_id
  where coalesce(sb.quantity,0)<>0

  union all

  select
    pr.id,
    pr.name,
    pf.id,
    pf.name,
    pr.brand,
    pr.category,
    pr.sale_price,
    pr.installment_price,
    pr.image_url,
    coalesce(
      pfsb.quantity,
      0
    )::integer,
    pfsb.updated_at
  from partner_location pl
  join public.products pr
    on pr.active=true
   and pr.flavor_tracking_enabled
  join public.product_flavors pf
    on pf.product_id=pr.id
   and pf.active
  join public.product_flavor_stock_balances pfsb
    on pfsb.flavor_id=pf.id
   and pfsb.location_id=
     pl.linked_location_id
  where coalesce(
    pfsb.quantity,
    0
  )<>0

  order by 2,4 nulls first;
$$;

create or replace function
public.partner_portal_get_sales_v2(
  p_from date default null,
  p_to date default null
)
returns table(
  sale_id uuid,
  sold_at timestamptz,
  general_status text,
  payment_status text,
  delivery_status text,
  product_id uuid,
  product_name text,
  flavor_summary text,
  quantity integer,
  unit_price numeric,
  total_price numeric
)
language sql
stable
security definer
set search_path=public
as $$
  select
    s.id,
    s.quoted_at,
    s.general_status::text,
    s.payment_status::text,
    s.delivery_status::text,
    si.product_id,
    pr.name,
    fd.flavor_summary,
    si.quantity,
    si.unit_price,
    coalesce(
      si.total_price,
      si.unit_price*si.quantity
    )
  from public.sales s
  join public.sale_items si
    on si.sale_id=s.id
  join public.products pr
    on pr.id=si.product_id
  left join public.sale_item_flavor_display fd
    on fd.sale_item_id=si.id
  join public.partners p
    on p.id=public.current_partner_id()
  where s.cancelled_at is null
    and (
      s.partner_id=p.id
      or (
        p.linked_location_id is not null
        and s.location_id=
          p.linked_location_id
      )
    )
    and (
      p_from is null
      or s.quoted_at::date>=p_from
    )
    and (
      p_to is null
      or s.quoted_at::date<=p_to
    )
  order by s.quoted_at desc,pr.name;
$$;

revoke all
on function public.partner_portal_get_stock_v2()
from public,anon;

revoke all
on function public.partner_portal_get_sales_v2(
  date,
  date
)
from public,anon;

grant execute
on function public.partner_portal_get_stock_v2()
to authenticated,service_role;

grant execute
on function public.partner_portal_get_sales_v2(
  date,
  date
)
to authenticated,service_role;

create or replace function
public.partner_portal_dashboard(
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_partner uuid:=
    public.current_partner_id();
  v_profile jsonb;
  v_summary jsonb;
  v_stock jsonb;
  v_sales jsonb;
begin
  if v_partner is null then
    raise exception 'Acesso negado';
  end if;

  select to_jsonb(x)
  into v_profile
  from (
    select *
    from public.partner_portal_get_profile()
    limit 1
  ) x;

  select to_jsonb(x)
  into v_summary
  from (
    select *
    from public.partner_portal_get_summary(
      p_from,
      p_to
    )
    limit 1
  ) x;

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by product_name,
      flavor_name nulls first
    ),
    '[]'::jsonb
  )
  into v_stock
  from (
    select *
    from public.partner_portal_get_stock_v2()
  ) x;

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by sold_at desc
    ),
    '[]'::jsonb
  )
  into v_sales
  from (
    select *
    from public.partner_portal_get_sales_v2(
      p_from,
      p_to
    )
    limit 30
  ) x;

  return jsonb_build_object(
    'profile',v_profile,
    'summary',v_summary,
    'stock',v_stock,
    'recent_sales',v_sales
  );
end;
$$;

create or replace function
public.inventory_workspace_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_summary jsonb;
  v_locations jsonb;
  v_attention jsonb;
  v_flavor_summary jsonb;
  v_flavor_items jsonb;
begin
  select *
  into v_profile
  from public.profiles
  where id=auth.uid()
    and active=true;

  if not found
     or not (
       v_profile.role='admin'
       or v_profile.can_access_supplements
     )
  then
    raise exception 'Acesso negado';
  end if;

  select to_jsonb(x)
  into v_summary
  from (
    select *
    from public.inventory_control_summary
    limit 1
  ) x;

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by location_name
    ),
    '[]'::jsonb
  )
  into v_locations
  from public.inventory_workspace_locations x;

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by attention_type,title
    ),
    '[]'::jsonb
  )
  into v_attention
  from public.inventory_workspace_attention x;

  select jsonb_build_object(
    'enabled_products',
      count(*),
    'active_flavors',
      coalesce(
        sum(active_flavor_count),
        0
      ),
    'healthy_products',
      count(*) filter(
        where integrity_status='healthy'
      ),
    'attention_products',
      count(*) filter(
        where integrity_status<>'healthy'
      ),
    'inconsistent_products',
      count(*) filter(
        where integrity_status in (
          'no_active_flavors',
          'physical_mismatch',
          'reserved_mismatch',
          'incoming_mismatch'
        )
      ),
    'historical_pending_items',
      coalesce(
        sum(historical_pending_count),
        0
      )
  )
  into v_flavor_summary
  from public.product_flavor_integrity_overview;

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by
        case
          when integrity_status='healthy'
          then 1
          else 0
        end,
        product_name
    ),
    '[]'::jsonb
  )
  into v_flavor_items
  from public.product_flavor_integrity_overview x;

  return jsonb_build_object(
    'summary',v_summary,
    'locations',v_locations,
    'attention',v_attention,
    'flavor_health',
      jsonb_build_object(
        'summary',
          coalesce(
            v_flavor_summary,
            '{}'::jsonb
          ),
        'items',v_flavor_items
      )
  );
end;
$$;

commit;
