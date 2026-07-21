begin;

create or replace function public.central_promotion_suggestions(
  p_operation text default null,
  p_limit integer default 24
)
returns table(
  suggestion_key text,
  operation_scope text,
  entity_id uuid,
  entity_label text,
  category text,
  image_url text,
  current_price numeric,
  cost_price numeric,
  available_quantity integer,
  units_30d integer,
  units_90d integer,
  days_since_last_sale integer,
  score integer,
  reason text,
  recommended_action text,
  recommended_discount_pct integer,
  recommended_price numeric,
  protected_price boolean
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not public.central_can_manage_promotions() then
    raise exception 'Acesso negado';
  end if;

  if p_operation is not null and p_operation not in ('supplements','fitness','both') then
    raise exception 'Operação inválida';
  end if;

  return query
  with brazil_today as (
    select (now() at time zone 'America/Sao_Paulo')::date as today
  ), supp_source as (
    select
      'supplements'::text as operation_scope,
      io.product_id as entity_id,
      io.product_name as entity_label,
      io.category,
      io.image_url,
      io.sale_price::numeric as current_price,
      io.cost_price::numeric as cost_price,
      io.available_quantity,
      io.units_30d,
      io.units_90d,
      io.days_since_last_sale,
      upper(coalesce(p.sales_category,'')) as sales_category,
      case
        when io.expires_60_units>0 then 100
        when io.stagnant_stock_90d then 95
        when io.overstock then 90
        when io.slow_stock_60d then 80
        when upper(coalesce(p.sales_category,''))='A' and io.units_30d>=3 then 60
        else 0
      end as score,
      case
        when io.expires_60_units>0 then 'Há unidades válidas vencendo em até 60 dias.'
        when io.stagnant_stock_90d then 'Estoque parado há 90 dias ou mais.'
        when io.overstock then 'Estoque acima do alvo estimado para o giro atual.'
        when io.slow_stock_60d then 'Produto com giro lento nos últimos 60 dias.'
        when upper(coalesce(p.sales_category,''))='A' and io.units_30d>=3 then 'Produto A com bom giro: melhor como chamariz do que com desconto.'
        else null
      end as reason,
      case
        when io.expires_60_units>0 then 'Promoção curta para acelerar saída antes da validade.'
        when io.stagnant_stock_90d then 'Queima controlada para liberar capital parado.'
        when io.overstock then 'Campanha de giro ou combo com produto de maior saída.'
        when io.slow_stock_60d then 'Teste de desconto leve por 7 dias.'
        when upper(coalesce(p.sales_category,''))='A' and io.units_30d>=3 then 'Usar como produto chamariz ou cross-sell, sem reduzir preço.'
        else null
      end as recommended_action,
      case
        when upper(coalesce(p.sales_category,''))='A' and io.units_30d>=3 and not io.stagnant_stock_90d and not io.overstock and io.expires_60_units=0 then 0
        when io.expires_60_units>0 then 15
        when io.stagnant_stock_90d then 15
        when io.overstock then 12
        when io.slow_stock_60d then 10
        else 0
      end as desired_discount,
      (upper(coalesce(p.sales_category,''))='A' and io.units_30d>=3 and not io.stagnant_stock_90d and not io.overstock and io.expires_60_units=0) as protected_price
    from public.inventory_intelligence_overview io
    join public.products p on p.id=io.product_id
    where p.active
      and upper(coalesce(p.sales_category,''))<>'Z'
      and io.available_quantity>0
      and io.expired_units=0
      and io.quarantined_units=0
      and (
        io.expires_60_units>0
        or io.stagnant_stock_90d
        or io.overstock
        or io.slow_stock_60d
        or (upper(coalesce(p.sales_category,''))='A' and io.units_30d>=3)
      )
  ), fitness_sales_stats as (
    select
      fsi.variant_id,
      coalesce(sum(fsi.quantity) filter(where fs.delivered_on>=bt.today-30),0)::integer as units_30d,
      coalesce(sum(fsi.quantity) filter(where fs.delivered_on>=bt.today-90),0)::integer as units_90d,
      max(fs.delivered_on) as last_sale_on
    from public.fitness_sale_items fsi
    join public.fitness_sales fs on fs.id=fsi.sale_id
    cross join brazil_today bt
    where fs.general_status<>'cancelled'
      and fs.delivery_status='delivered'
      and fs.delivered_on is not null
    group by fsi.variant_id
  ), fitness_source as (
    select
      'fitness'::text as operation_scope,
      fso.variant_id as entity_id,
      concat_ws(' · ',fso.product_name,nullif(fso.size,''),nullif(fso.color,'')) as entity_label,
      fso.category,
      fso.image_url,
      fso.sale_price::numeric as current_price,
      fso.cost_price::numeric as cost_price,
      fso.available_quantity,
      coalesce(fss.units_30d,0) as units_30d,
      coalesce(fss.units_90d,0) as units_90d,
      case
        when fss.last_sale_on is null then null
        else greatest(bt.today-fss.last_sale_on,0)
      end::integer as days_since_last_sale,
      null::text as sales_category,
      case
        when (fss.last_sale_on is null and bt.today-(fv.created_at at time zone 'America/Sao_Paulo')::date>=90)
          or (fss.last_sale_on is not null and bt.today-fss.last_sale_on>=90) then 95
        when fso.available_quantity>greatest(coalesce(fv.reorder_target,0),2)*2 then 90
        when fss.last_sale_on is not null and bt.today-fss.last_sale_on>=60 then 80
        when coalesce(fss.units_90d,0)<=1 and fso.available_quantity>=2 then 70
        else 0
      end as score,
      case
        when (fss.last_sale_on is null and bt.today-(fv.created_at at time zone 'America/Sao_Paulo')::date>=90)
          or (fss.last_sale_on is not null and bt.today-fss.last_sale_on>=90) then 'Variação sem giro há 90 dias ou mais.'
        when fso.available_quantity>greatest(coalesce(fv.reorder_target,0),2)*2 then 'Quantidade disponível acima do alvo de reposição.'
        when fss.last_sale_on is not null and bt.today-fss.last_sale_on>=60 then 'Variação com giro lento há 60 dias ou mais.'
        when coalesce(fss.units_90d,0)<=1 and fso.available_quantity>=2 then 'Pouca saída nos últimos 90 dias para o saldo atual.'
        else null
      end as reason,
      case
        when (fss.last_sale_on is null and bt.today-(fv.created_at at time zone 'America/Sao_Paulo')::date>=90)
          or (fss.last_sale_on is not null and bt.today-fss.last_sale_on>=90) then 'Queima controlada ou combo para liberar peças paradas.'
        when fso.available_quantity>greatest(coalesce(fv.reorder_target,0),2)*2 then 'Campanha por cor/tamanho ou combo com peça de maior giro.'
        when fss.last_sale_on is not null and bt.today-fss.last_sale_on>=60 then 'Teste de desconto leve por 7 dias.'
        when coalesce(fss.units_90d,0)<=1 and fso.available_quantity>=2 then 'Destacar a variação em campanha segmentada.'
        else null
      end as recommended_action,
      case
        when (fss.last_sale_on is null and bt.today-(fv.created_at at time zone 'America/Sao_Paulo')::date>=90)
          or (fss.last_sale_on is not null and bt.today-fss.last_sale_on>=90) then 15
        when fso.available_quantity>greatest(coalesce(fv.reorder_target,0),2)*2 then 12
        when fss.last_sale_on is not null and bt.today-fss.last_sale_on>=60 then 10
        when coalesce(fss.units_90d,0)<=1 and fso.available_quantity>=2 then 8
        else 0
      end as desired_discount,
      false as protected_price
    from public.fitness_stock_overview fso
    join public.fitness_variants fv on fv.id=fso.variant_id
    left join fitness_sales_stats fss on fss.variant_id=fso.variant_id
    cross join brazil_today bt
    where fso.product_active
      and fso.variant_active
      and fso.available_quantity>0
      and fso.sale_price>0
      and (
        (fss.last_sale_on is null and bt.today-(fv.created_at at time zone 'America/Sao_Paulo')::date>=90)
        or (fss.last_sale_on is not null and bt.today-fss.last_sale_on>=60)
        or fso.available_quantity>greatest(coalesce(fv.reorder_target,0),2)*2
        or (coalesce(fss.units_90d,0)<=1 and fso.available_quantity>=2)
      )
  ), combined as (
    select * from supp_source
    union all
    select * from fitness_source
  ), scored as (
    select
      c.*,
      greatest(
        0,
        least(
          c.desired_discount,
          floor((1-(c.cost_price/nullif(c.current_price*0.85,0)))*100)::integer
        )
      )::integer as safe_discount
    from combined c
    where c.score>0
      and c.current_price>0
      and (p_operation is null or p_operation='both' or c.operation_scope=p_operation)
  )
  select
    s.operation_scope||':'||s.entity_id::text as suggestion_key,
    s.operation_scope,
    s.entity_id,
    s.entity_label,
    s.category,
    s.image_url,
    s.current_price::numeric(14,2),
    s.cost_price::numeric(14,2),
    s.available_quantity,
    s.units_30d,
    s.units_90d,
    s.days_since_last_sale,
    s.score,
    s.reason,
    s.recommended_action,
    s.safe_discount,
    round(s.current_price*(1-s.safe_discount/100.0),2)::numeric(14,2),
    s.protected_price
  from scored s
  order by s.score desc,s.available_quantity desc,s.entity_label
  limit least(greatest(coalesce(p_limit,24),1),100);
end;
$function$;

grant execute on function public.central_promotion_suggestions(text,integer) to authenticated,service_role;
revoke all on function public.central_promotion_suggestions(text,integer) from anon;

create or replace function public.central_can_manage_demand_gaps()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    coalesce(public.current_user_role()='admin',false)
    or coalesce(public.can_write(),false)
    or coalesce(public.can_write_fitness(),false);
$function$;

create table if not exists public.central_demand_gaps (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  operation_scope text not null default 'supplements'
    check (operation_scope in ('supplements','fitness','both')),
  category text,
  brand text,
  customer_name text,
  customer_phone text,
  city text,
  requested_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','extreme')),
  status text not null default 'open'
    check (status in ('open','evaluating','planned_purchase','ordered','stocked','dismissed')),
  image_url text,
  image_source_url text,
  notes text,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists central_demand_gaps_product_idx
  on public.central_demand_gaps(lower(btrim(product_name)));

create index if not exists central_demand_gaps_status_idx
  on public.central_demand_gaps(status,requested_on desc);

create or replace function public.central_demand_gaps_touch_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.updated_at:=now();
  new.updated_by:=auth.uid();
  return new;
end;
$function$;

drop trigger if exists trg_central_demand_gaps_touch_updated_at
on public.central_demand_gaps;

create trigger trg_central_demand_gaps_touch_updated_at
before update on public.central_demand_gaps
for each row execute function public.central_demand_gaps_touch_updated_at();

alter table public.central_demand_gaps enable row level security;

drop policy if exists central_demand_gaps_select on public.central_demand_gaps;
create policy central_demand_gaps_select
on public.central_demand_gaps
for select
to authenticated
using (public.central_can_manage_demand_gaps());

drop policy if exists central_demand_gaps_write on public.central_demand_gaps;
create policy central_demand_gaps_write
on public.central_demand_gaps
for all
to authenticated
using (public.central_can_manage_demand_gaps())
with check (public.central_can_manage_demand_gaps());

grant select,insert,update,delete on public.central_demand_gaps to authenticated;
revoke all on public.central_demand_gaps from anon;

create or replace view public.central_demand_gap_summary
with (security_invoker=true)
as
with ranked as (
  select
    d.*,
    lower(btrim(d.product_name)) as normalized_name,
    row_number() over (
      partition by lower(btrim(d.product_name))
      order by d.requested_on desc,d.created_at desc
    ) as rn
  from public.central_demand_gaps d
), grouped as (
  select
    normalized_name,
    max(product_name) filter(where rn=1) as product_name,
    max(operation_scope) filter(where rn=1) as operation_scope,
    max(category) filter(where rn=1) as category,
    max(brand) filter(where rn=1) as brand,
    max(image_url) filter(where rn=1) as image_url,
    count(*)::integer as requests_count,
    count(*) filter(where status in ('open','evaluating','planned_purchase','ordered'))::integer as active_requests_count,
    max(requested_on) as last_requested_on,
    max(case priority when 'extreme' then 4 when 'high' then 3 when 'medium' then 2 else 1 end)::integer as priority_rank,
    array_remove(array_agg(distinct nullif(city,'')),null) as cities
  from ranked
  group by normalized_name
)
select
  normalized_name,
  product_name,
  operation_scope,
  category,
  brand,
  image_url,
  requests_count,
  active_requests_count,
  last_requested_on,
  priority_rank,
  cities
from grouped;

grant select on public.central_demand_gap_summary to authenticated;
revoke all on public.central_demand_gap_summary from anon;

grant execute on function public.central_can_manage_demand_gaps() to authenticated,service_role;
revoke all on function public.central_can_manage_demand_gaps() from anon;

commit;
