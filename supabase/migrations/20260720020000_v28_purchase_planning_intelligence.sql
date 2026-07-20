-- Candinho Company V28
-- Planejador Inteligente de Compras e Reposição
-- Estado final consolidado das migrations já aplicadas em produção.

begin;

alter table public.suppliers
  add column if not exists lead_time_days integer not null default 7,
  add column if not exists target_cover_days integer not null default 30,
  add column if not exists minimum_order_amount numeric(12,2) not null default 0,
  add column if not exists free_shipping_threshold numeric(12,2) not null default 0,
  add column if not exists payment_terms text,
  add column if not exists freight_notes text;

alter table public.suppliers
  drop constraint if exists suppliers_lead_time_days_check;

alter table public.suppliers
  add constraint suppliers_lead_time_days_check
  check (lead_time_days between 0 and 365);

alter table public.suppliers
  drop constraint if exists suppliers_target_cover_days_check;

alter table public.suppliers
  add constraint suppliers_target_cover_days_check
  check (target_cover_days between 1 and 365);

alter table public.suppliers
  drop constraint if exists suppliers_minimum_order_amount_check;

alter table public.suppliers
  add constraint suppliers_minimum_order_amount_check
  check (minimum_order_amount >= 0);

alter table public.suppliers
  drop constraint if exists suppliers_free_shipping_threshold_check;

alter table public.suppliers
  add constraint suppliers_free_shipping_threshold_check
  check (free_shipping_threshold >= 0);

create or replace view public.purchase_planning_overview
with (security_invoker = true)
as
with demand as (
  select
    si.product_id,
    coalesce(sum(si.quantity) filter (
      where s.quoted_at >= now() - interval '30 days'
    ),0)::integer as sold_30d,
    coalesce(sum(si.quantity) filter (
      where s.quoted_at >= now() - interval '60 days'
    ),0)::integer as sold_60d,
    coalesce(sum(si.quantity) filter (
      where s.quoted_at >= now() - interval '90 days'
    ),0)::integer as sold_90d,
    max(s.quoted_at) as last_sale_at,
    count(distinct s.id) filter (
      where s.quoted_at >= now() - interval '90 days'
    )::integer as sales_90d_count
  from public.sale_items si
  join public.sales s
    on s.id=si.sale_id
  where s.record_type='sale'
    and s.general_status<>'cancelled'
    and s.quoted_at >= now() - interval '90 days'
  group by si.product_id
),
stock as (
  select
    ilo.product_id,
    coalesce(sum(ilo.physical_quantity),0)::integer
      as physical_quantity,
    coalesce(sum(ilo.reserved_quantity),0)::integer
      as reserved_quantity,
    coalesce(sum(ilo.available_quantity),0)::integer
      as available_quantity,
    coalesce(sum(ilo.incoming_quantity),0)::integer
      as incoming_quantity
  from public.inventory_location_overview ilo
  join public.locations l
    on l.id=ilo.location_id
  where l.active
    and l.tracks_inventory
    and l.counts_for_replenishment
  group by ilo.product_id
),
backlog as (
  select
    sr.product_id,
    coalesce(sum(
      greatest(
        sr.quantity_requested-
        sr.quantity_reserved,
        0
      )
    ),0)::integer as backlog_quantity
  from public.stock_reservations sr
  join public.locations l
    on l.id=sr.location_id
  where sr.status in ('awaiting_stock','partial')
    and l.active
    and l.tracks_inventory
    and l.counts_for_replenishment
  group by sr.product_id
),
virtual_combo_products as (
  select legacy_product_id as product_id
  from public.product_combos
  where legacy_product_id is not null
),
base as (
  select
    p.id as product_id,
    p.name as product_name,
    p.category,
    p.brand,
    p.image_url,
    p.cost_price,
    p.sale_price,
    p.min_stock,
    coalesce(
      nullif(p.ideal_stock,0),
      p.min_stock,
      0
    )::integer as ideal_stock,
    p.default_supplier_id as supplier_id,
    s.name as supplier_name,
    coalesce(s.lead_time_days,7)::integer
      as lead_time_days,
    coalesce(s.target_cover_days,30)::integer
      as target_cover_days,
    coalesce(s.minimum_order_amount,0)::numeric(12,2)
      as minimum_order_amount,
    coalesce(s.free_shipping_threshold,0)::numeric(12,2)
      as free_shipping_threshold,
    s.payment_terms,
    s.freight_notes,
    p.flavor_tracking_enabled,
    coalesce(d.sold_30d,0)::integer as sold_30d,
    coalesce(d.sold_60d,0)::integer as sold_60d,
    coalesce(d.sold_90d,0)::integer as sold_90d,
    d.last_sale_at,
    coalesce(d.sales_90d_count,0)::integer
      as sales_90d_count,
    coalesce(st.physical_quantity,0)::integer
      as physical_quantity,
    coalesce(st.reserved_quantity,0)::integer
      as reserved_quantity,
    coalesce(st.available_quantity,0)::integer
      as available_quantity,
    coalesce(st.incoming_quantity,0)::integer
      as incoming_quantity,
    coalesce(b.backlog_quantity,0)::integer
      as backlog_quantity,
    (
      greatest(coalesce(d.sold_30d,0),0)::numeric / 30 * 0.60
      + greatest(
          coalesce(d.sold_60d,0)-
          coalesce(d.sold_30d,0),
          0
        )::numeric / 30 * 0.25
      + greatest(
          coalesce(d.sold_90d,0)-
          coalesce(d.sold_60d,0),
          0
        )::numeric / 30 * 0.15
    )::numeric(12,4) as weighted_daily_demand
  from public.products p
  left join public.suppliers s
    on s.id=p.default_supplier_id
   and s.active
  left join demand d
    on d.product_id=p.id
  left join stock st
    on st.product_id=p.id
  left join backlog b
    on b.product_id=p.id
  left join virtual_combo_products vc
    on vc.product_id=p.id
  where p.active
    and vc.product_id is null
),
calculated as (
  select
    b.*,
    case
      when b.weighted_daily_demand>0
        then round(
          b.available_quantity::numeric /
          b.weighted_daily_demand,
          1
        )
      else null
    end as coverage_days,
    greatest(
      b.ideal_stock,
      ceil(
        b.weighted_daily_demand *
        (
          b.lead_time_days+
          b.target_cover_days
        )
      )::integer
    )::integer as target_units
  from base b
)
select
  c.*,
  greatest(
    c.target_units+
    c.backlog_quantity-
    c.available_quantity-
    c.incoming_quantity,
    0
  )::integer as suggested_order_quantity,
  (
    greatest(
      c.target_units+
      c.backlog_quantity-
      c.available_quantity-
      c.incoming_quantity,
      0
    ) * c.cost_price
  )::numeric(12,2) as estimated_order_cost,
  (
    greatest(
      c.target_units+
      c.backlog_quantity-
      c.available_quantity-
      c.incoming_quantity,
      0
    ) * c.sale_price
  )::numeric(12,2) as estimated_order_sale_value,
  (
    greatest(
      c.target_units+
      c.backlog_quantity-
      c.available_quantity-
      c.incoming_quantity,
      0
    ) *
    greatest(
      c.sale_price-
      c.cost_price,
      0
    )
  )::numeric(12,2)
    as estimated_order_potential_profit,
  case
    when c.backlog_quantity>0
      then 'critical'
    when c.weighted_daily_demand>0
      and c.available_quantity=0
      then 'critical'
    when c.weighted_daily_demand>0
      and coalesce(c.coverage_days,0)
        <= c.lead_time_days
      then 'urgent'
    when c.weighted_daily_demand>0
      and coalesce(c.coverage_days,0)
        <= c.lead_time_days+15
      then 'attention'
    when c.weighted_daily_demand=0
      and c.available_quantity<=c.min_stock
      and c.min_stock>0
      then 'monitor'
    else 'ok'
  end as purchase_priority,
  case
    when c.weighted_daily_demand>0
      and c.coverage_days is not null
      then (
        (now() at time zone 'America/Sao_Paulo')::date
        + ceil(c.coverage_days)::integer
      )
    else null
  end as estimated_stockout_on,
  case
    when c.last_sale_at is null
      then null
    else greatest(
      (
        (now() at time zone 'America/Sao_Paulo')::date
        - (
          c.last_sale_at
          at time zone 'America/Sao_Paulo'
        )::date
      ),
      0
    )::integer
  end as days_since_last_sale,
  c.flavor_tracking_enabled
    as needs_flavor_distribution
from calculated c;

grant select
on public.purchase_planning_overview
to authenticated,service_role;

create or replace function public.purchase_planning_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_rows jsonb;
  v_suppliers jsonb;
  v_summary jsonb;
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

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by
        case x.purchase_priority
          when 'critical' then 0
          when 'urgent' then 1
          when 'attention' then 2
          when 'monitor' then 3
          else 4
        end,
        x.estimated_order_cost desc,
        x.product_name
    ),
    '[]'::jsonb
  )
  into v_rows
  from public.purchase_planning_overview x;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',s.id,
        'name',s.name,
        'notes',s.notes,
        'lead_time_days',s.lead_time_days,
        'target_cover_days',s.target_cover_days,
        'minimum_order_amount',
          s.minimum_order_amount,
        'free_shipping_threshold',
          s.free_shipping_threshold,
        'payment_terms',s.payment_terms,
        'freight_notes',s.freight_notes,
        'suggested_products',
          coalesce(g.suggested_products,0),
        'suggested_units',
          coalesce(g.suggested_units,0),
        'suggested_order_cost',
          coalesce(g.suggested_order_cost,0),
        'critical_products',
          coalesce(g.critical_products,0),
        'urgent_products',
          coalesce(g.urgent_products,0),
        'gap_to_minimum_order',
          greatest(
            s.minimum_order_amount-
            coalesce(g.suggested_order_cost,0),
            0
          ),
        'gap_to_free_shipping',
          greatest(
            s.free_shipping_threshold-
            coalesce(g.suggested_order_cost,0),
            0
          )
      )
      order by s.name
    ),
    '[]'::jsonb
  )
  into v_suppliers
  from public.suppliers s
  left join lateral (
    select
      count(*) filter(
        where p.suggested_order_quantity>0
      )::integer as suggested_products,
      coalesce(
        sum(p.suggested_order_quantity),
        0
      )::integer as suggested_units,
      coalesce(
        sum(p.estimated_order_cost),
        0
      )::numeric(12,2) as suggested_order_cost,
      count(*) filter(
        where p.purchase_priority='critical'
      )::integer as critical_products,
      count(*) filter(
        where p.purchase_priority='urgent'
      )::integer as urgent_products
    from public.purchase_planning_overview p
    where p.supplier_id=s.id
  ) g on true
  where s.active;

  select jsonb_build_object(
    'critical_products',
      count(*) filter(
        where purchase_priority='critical'
      ),
    'urgent_products',
      count(*) filter(
        where purchase_priority='urgent'
      ),
    'attention_products',
      count(*) filter(
        where purchase_priority='attention'
      ),
    'suggested_products',
      count(*) filter(
        where suggested_order_quantity>0
      ),
    'suggested_units',
      coalesce(
        sum(suggested_order_quantity),
        0
      ),
    'suggested_investment',
      coalesce(
        sum(estimated_order_cost),
        0
      ),
    'suggested_sale_value',
      coalesce(
        sum(estimated_order_sale_value),
        0
      ),
    'suggested_potential_profit',
      coalesce(
        sum(estimated_order_potential_profit),
        0
      ),
    'without_supplier',
      count(*) filter(
        where supplier_id is null
          and suggested_order_quantity>0
      )
  )
  into v_summary
  from public.purchase_planning_overview;

  return jsonb_build_object(
    'generated_at',now(),
    'summary',
      coalesce(v_summary,'{}'::jsonb),
    'rows',v_rows,
    'suppliers',v_suppliers
  );
end;
$$;

revoke all
on function public.purchase_planning_snapshot()
from public,anon;

grant execute
on function public.purchase_planning_snapshot()
to authenticated,service_role;

create or replace function
public.update_supplier_planning_settings(
  p_supplier_id uuid,
  p_lead_time_days integer,
  p_target_cover_days integer,
  p_minimum_order_amount numeric default 0,
  p_free_shipping_threshold numeric default 0,
  p_payment_terms text default null,
  p_freight_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.can_write() then
    raise exception
      'Usuário sem permissão para editar fornecedor';
  end if;

  if p_lead_time_days is null
     or p_lead_time_days<0
     or p_lead_time_days>365
  then
    raise exception
      'Prazo do fornecedor inválido';
  end if;

  if p_target_cover_days is null
     or p_target_cover_days<1
     or p_target_cover_days>365
  then
    raise exception
      'Cobertura alvo inválida';
  end if;

  if coalesce(
       p_minimum_order_amount,
       0
     )<0
     or coalesce(
       p_free_shipping_threshold,
       0
     )<0
  then
    raise exception
      'Valores de pedido mínimo e frete grátis não podem ser negativos';
  end if;

  update public.suppliers
  set lead_time_days=p_lead_time_days,
      target_cover_days=p_target_cover_days,
      minimum_order_amount=
        coalesce(
          p_minimum_order_amount,
          0
        ),
      free_shipping_threshold=
        coalesce(
          p_free_shipping_threshold,
          0
        ),
      payment_terms=
        nullif(
          btrim(p_payment_terms),
          ''
        ),
      freight_notes=
        nullif(
          btrim(p_freight_notes),
          ''
        ),
      updated_at=now()
  where id=p_supplier_id
    and active;

  if not found then
    raise exception
      'Fornecedor não encontrado ou inativo';
  end if;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'supplier',
    p_supplier_id,
    'planning_settings_updated',
    jsonb_build_object(
      'lead_time_days',
        p_lead_time_days,
      'target_cover_days',
        p_target_cover_days,
      'minimum_order_amount',
        coalesce(
          p_minimum_order_amount,
          0
        ),
      'free_shipping_threshold',
        coalesce(
          p_free_shipping_threshold,
          0
        )
    )
  );

  return p_supplier_id;
end;
$$;

revoke all
on function public.update_supplier_planning_settings(
  uuid,
  integer,
  integer,
  numeric,
  numeric,
  text,
  text
)
from public,anon;

grant execute
on function public.update_supplier_planning_settings(
  uuid,
  integer,
  integer,
  numeric,
  numeric,
  text,
  text
)
to authenticated,service_role;

commit;
