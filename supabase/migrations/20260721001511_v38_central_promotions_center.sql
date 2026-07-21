begin;

create or replace function public.central_can_manage_promotions()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    coalesce(public.current_user_role()='admin',false)
    or coalesce(public.can_write(),false)
    or coalesce(public.can_write_fitness(),false)
    or coalesce(public.can_write_marketing(),false);
$function$;

create table if not exists public.central_promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  operation_scope text not null default 'both'
    check (operation_scope in ('supplements','fitness','both')),
  status text not null default 'draft'
    check (status in ('draft','scheduled','active','ended','cancelled')),
  objective text not null default 'stock_turnover'
    check (objective in ('stock_turnover','revenue','customer_acquisition','launch','cross_sell','seasonal')),
  promotion_type text not null default 'percentage'
    check (promotion_type in ('percentage','fixed_price','bundle','buy_x_pay_y','coupon','cross_sell')),
  default_discount_pct numeric(5,2) not null default 0
    check (default_discount_pct between 0 and 100),
  coupon_code text,
  starts_on date,
  ends_on date,
  channels text[] not null default '{}'::text[],
  notes text,
  result_revenue numeric(14,2),
  result_profit numeric(14,2),
  result_units integer,
  result_notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on>=starts_on)
);

create table if not exists public.central_promotion_items (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.central_promotions(id) on delete cascade,
  operation_scope text not null check (operation_scope in ('supplements','fitness')),
  supplement_product_id uuid references public.products(id) on delete restrict,
  fitness_variant_id uuid references public.fitness_variants(id) on delete restrict,
  item_role text not null default 'discounted'
    check (item_role in ('discounted','anchor','cross_sell')),
  discount_pct numeric(5,2) check (discount_pct is null or discount_pct between 0 and 100),
  promotional_price numeric(14,2) check (promotional_price is null or promotional_price>=0),
  quantity_limit integer check (quantity_limit is null or quantity_limit>0),
  created_at timestamptz not null default now(),
  check (
    (operation_scope='supplements' and supplement_product_id is not null and fitness_variant_id is null)
    or
    (operation_scope='fitness' and fitness_variant_id is not null and supplement_product_id is null)
  )
);

create unique index if not exists central_promotion_items_supp_unique
  on public.central_promotion_items(promotion_id,supplement_product_id)
  where supplement_product_id is not null;

create unique index if not exists central_promotion_items_fit_unique
  on public.central_promotion_items(promotion_id,fitness_variant_id)
  where fitness_variant_id is not null;

create index if not exists central_promotions_period_idx
  on public.central_promotions(starts_on,ends_on,status);

create index if not exists central_promotion_items_promotion_idx
  on public.central_promotion_items(promotion_id);

create or replace function public.central_promotions_touch_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.updated_at:=now();
  return new;
end;
$function$;

drop trigger if exists trg_central_promotions_touch_updated_at
on public.central_promotions;

create trigger trg_central_promotions_touch_updated_at
before update on public.central_promotions
for each row execute function public.central_promotions_touch_updated_at();

alter table public.central_promotions enable row level security;
alter table public.central_promotion_items enable row level security;

drop policy if exists central_promotions_select on public.central_promotions;
create policy central_promotions_select
on public.central_promotions
for select
to authenticated
using (public.central_can_manage_promotions());

drop policy if exists central_promotions_write on public.central_promotions;
create policy central_promotions_write
on public.central_promotions
for all
to authenticated
using (public.central_can_manage_promotions())
with check (public.central_can_manage_promotions());

drop policy if exists central_promotion_items_select on public.central_promotion_items;
create policy central_promotion_items_select
on public.central_promotion_items
for select
to authenticated
using (public.central_can_manage_promotions());

drop policy if exists central_promotion_items_write on public.central_promotion_items;
create policy central_promotion_items_write
on public.central_promotion_items
for all
to authenticated
using (public.central_can_manage_promotions())
with check (public.central_can_manage_promotions());

grant select,insert,update,delete on public.central_promotions to authenticated;
grant select,insert,update,delete on public.central_promotion_items to authenticated;
revoke all on public.central_promotions from anon;
revoke all on public.central_promotion_items from anon;

create or replace view public.central_promotions_overview
with (security_invoker=true)
as
with brazil_today as (
  select (now() at time zone 'America/Sao_Paulo')::date as today
), item_counts as (
  select
    promotion_id,
    count(*)::integer as item_count,
    count(*) filter(where operation_scope='supplements')::integer as supplement_item_count,
    count(*) filter(where operation_scope='fitness')::integer as fitness_item_count
  from public.central_promotion_items
  group by promotion_id
)
select
  p.*,
  coalesce(ic.item_count,0) as item_count,
  coalesce(ic.supplement_item_count,0) as supplement_item_count,
  coalesce(ic.fitness_item_count,0) as fitness_item_count,
  case
    when p.status='cancelled' then 'cancelled'
    when p.status='ended' then 'ended'
    when p.status='draft' then 'draft'
    when p.ends_on is not null and p.ends_on<bt.today then 'ended'
    when p.starts_on is not null and p.starts_on>bt.today then 'scheduled'
    else 'active'
  end as effective_status
from public.central_promotions p
cross join brazil_today bt
left join item_counts ic on ic.promotion_id=p.id;

create or replace view public.central_promotion_items_overview
with (security_invoker=true)
as
select
  i.id,
  i.promotion_id,
  i.operation_scope,
  i.supplement_product_id,
  i.fitness_variant_id,
  i.item_role,
  i.discount_pct,
  i.promotional_price,
  i.quantity_limit,
  i.created_at,
  case
    when i.operation_scope='supplements' then p.name
    else concat_ws(' · ',fp.name,nullif(fv.size,''),nullif(fv.color,''))
  end as item_label,
  case
    when i.operation_scope='supplements' then p.category
    else fp.category
  end as category,
  case
    when i.operation_scope='supplements' then p.image_url
    else fp.image_url
  end as image_url,
  case
    when i.operation_scope='supplements' then p.sale_price
    else fv.sale_price
  end::numeric(14,2) as current_price,
  case
    when i.operation_scope='supplements' then p.cost_price
    else fv.cost_price
  end::numeric(14,2) as cost_price
from public.central_promotion_items i
left join public.products p on p.id=i.supplement_product_id
left join public.fitness_variants fv on fv.id=i.fitness_variant_id
left join public.fitness_products fp on fp.id=fv.product_id;

grant select on public.central_promotions_overview to authenticated;
grant select on public.central_promotion_items_overview to authenticated;
revoke all on public.central_promotions_overview from anon;
revoke all on public.central_promotion_items_overview from anon;

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

grant execute on function public.central_can_manage_promotions() to authenticated;
grant execute on function public.central_promotion_suggestions(text,integer) to authenticated;
revoke all on function public.central_can_manage_promotions() from anon;
revoke all on function public.central_promotion_suggestions(text,integer) from anon;

commit;
