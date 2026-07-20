-- Candinho Company V29
-- Snapshot do painel de lotes e validades.
-- Já aplicado diretamente no Supabase de produção.

create or replace function
public.inventory_lot_dashboard_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_summary jsonb;
  v_lots jsonb;
  v_coverage jsonb;
  v_products jsonb;
  v_trace jsonb;
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

  select jsonb_build_object(
    'tracking_products',
      (
        select count(*)
        from public.products
        where active
          and lot_tracking_enabled
      ),
    'active_lots',
      count(*) filter(
        where quantity_on_hand>0
      ),
    'tracked_units',
      coalesce(
        sum(quantity_on_hand),
        0
      ),
    'expired_units',
      coalesce(
        sum(quantity_on_hand)
        filter(
          where expiry_status='expired'
        ),
        0
      ),
    'expires_30_units',
      coalesce(
        sum(quantity_on_hand)
        filter(
          where expiry_status='expires_30'
        ),
        0
      ),
    'expires_60_units',
      coalesce(
        sum(quantity_on_hand)
        filter(
          where expiry_status='expires_60'
        ),
        0
      ),
    'expires_90_units',
      coalesce(
        sum(quantity_on_hand)
        filter(
          where expiry_status='expires_90'
        ),
        0
      ),
    'quarantined_units',
      coalesce(
        sum(quantity_on_hand)
        filter(
          where expiry_status='quarantined'
        ),
        0
      ),
    'untracked_units',
      coalesce(
        (
          select
            sum(untracked_quantity)
          from public.inventory_lot_coverage_overview
        ),
        0
      ),
    'tracking_mismatches',
      coalesce(
        (
          select count(*)
          from public.inventory_lot_coverage_overview
          where tracking_status='mismatch'
        ),
        0
      )
  )
  into v_summary
  from public.inventory_lot_overview;

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by
        case x.expiry_status
          when 'expired' then 0
          when 'quarantined' then 1
          when 'expires_30' then 2
          when 'expires_60' then 3
          when 'expires_90' then 4
          else 5
        end,
        x.expires_on nulls last,
        x.product_name,
        x.lot_number
    ),
    '[]'::jsonb
  )
  into v_lots
  from public.inventory_lot_overview x
  where x.quantity_on_hand>0;

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by
        case x.tracking_status
          when 'mismatch' then 0
          when 'legacy_untracked' then 1
          when 'fully_tracked' then 2
          else 3
        end,
        x.product_name,
        x.location_code,
        x.flavor_name nulls first
    ),
    '[]'::jsonb
  )
  into v_coverage
  from public.inventory_lot_coverage_overview x
  where x.physical_quantity<>0
     or x.tracked_quantity<>0;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
          p.id,
        'name',
          p.name,
        'category',
          p.category,
        'brand',
          p.brand,
        'lot_tracking_enabled',
          p.lot_tracking_enabled,
        'flavor_tracking_enabled',
          p.flavor_tracking_enabled,
        'physical_quantity',
          coalesce(s.quantity,0)
      )
      order by
        p.lot_tracking_enabled desc,
        p.name
    ),
    '[]'::jsonb
  )
  into v_products
  from public.products p
  left join lateral (
    select
      sum(sb.quantity)::integer
        as quantity
    from public.stock_balances sb
    join public.locations l
      on l.id=sb.location_id
    where sb.product_id=p.id
      and l.active
      and l.tracks_inventory
  ) s on true
  where p.active
    and not exists(
      select 1
      from public.product_combos pc
      where pc.legacy_product_id=p.id
    );

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by x.created_at desc
    ),
    '[]'::jsonb
  )
  into v_trace
  from (
    select *
    from public.inventory_lot_traceability
    where sale_id is not null
      and quantity_delta<0
    order by created_at desc
    limit 50
  ) x;

  return jsonb_build_object(
    'generated_at',
      now(),
    'summary',
      coalesce(
        v_summary,
        '{}'::jsonb
      ),
    'lots',
      v_lots,
    'coverage',
      v_coverage,
    'products',
      v_products,
    'recent_trace',
      v_trace
  );
end;
$$;

revoke all
on function public.inventory_lot_dashboard_snapshot()
from public,anon;

grant execute
on function public.inventory_lot_dashboard_snapshot()
to authenticated,service_role;
