begin;

create or replace function public.partner_portal_get_sales(
  p_from date default null,
  p_to date default null
)
returns table(
  sale_id uuid,
  sold_at timestamp with time zone,
  general_status text,
  payment_status text,
  delivery_status text,
  product_id uuid,
  product_name text,
  quantity integer,
  unit_price numeric,
  total_price numeric
)
language sql
stable security definer
set search_path to 'public'
as $function$
  with partner_ctx as (
    select p.* from public.partners p
    where p.id=public.current_partner_id()
  ), sales_base as (
    select
      s.*,
      coalesce(s.delivered_at,s.quoted_at) as effective_sold_at,
      coalesce(
        (s.delivered_at at time zone 'America/Sao_Paulo')::date,
        (s.quoted_at at time zone 'America/Sao_Paulo')::date
      ) as effective_sale_date
    from public.sales s
    join partner_ctx p on true
    where s.cancelled_at is null
      and (
        s.partner_id=p.id
        or (
          p.linked_location_id is not null
          and s.location_id=p.linked_location_id
        )
      )
  )
  select
    s.id,
    s.effective_sold_at,
    s.general_status::text,
    s.payment_status::text,
    s.delivery_status::text,
    si.product_id,
    pr.name,
    si.quantity,
    si.unit_price,
    coalesce(si.total_price,si.unit_price*si.quantity)
  from sales_base s
  join public.sale_items si on si.sale_id=s.id
  join public.products pr on pr.id=si.product_id
  where (p_from is null or s.effective_sale_date>=p_from)
    and (p_to is null or s.effective_sale_date<=p_to)
  order by s.effective_sold_at desc,pr.name;
$function$;

create or replace function public.partner_portal_get_sales_v2(
  p_from date default null,
  p_to date default null
)
returns table(
  sale_id uuid,
  sold_at timestamp with time zone,
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
stable security definer
set search_path to 'public'
as $function$
  with partner_ctx as (
    select p.* from public.partners p
    where p.id=public.current_partner_id()
  ), sales_base as (
    select
      s.*,
      coalesce(s.delivered_at,s.quoted_at) as effective_sold_at,
      coalesce(
        (s.delivered_at at time zone 'America/Sao_Paulo')::date,
        (s.quoted_at at time zone 'America/Sao_Paulo')::date
      ) as effective_sale_date
    from public.sales s
    join partner_ctx p on true
    where s.cancelled_at is null
      and (
        s.partner_id=p.id
        or (
          p.linked_location_id is not null
          and s.location_id=p.linked_location_id
        )
      )
  )
  select
    s.id,
    s.effective_sold_at,
    s.general_status::text,
    s.payment_status::text,
    s.delivery_status::text,
    si.product_id,
    pr.name,
    fd.flavor_summary,
    si.quantity,
    si.unit_price,
    coalesce(si.total_price,si.unit_price*si.quantity)
  from sales_base s
  join public.sale_items si on si.sale_id=s.id
  join public.products pr on pr.id=si.product_id
  left join public.sale_item_flavor_display fd on fd.sale_item_id=si.id
  where (p_from is null or s.effective_sale_date>=p_from)
    and (p_to is null or s.effective_sale_date<=p_to)
  order by s.effective_sold_at desc,pr.name;
$function$;

create or replace function public.partner_portal_get_summary(
  p_from date default null,
  p_to date default null
)
returns table(
  partner_id uuid,
  sales_count bigint,
  units_sold bigint,
  gross_sales numeric,
  delivered_sales_count bigint,
  delivered_gross_sales numeric,
  partnership_percent numeric,
  reward_type text,
  reward_value numeric,
  reward_description text,
  target_sales integer,
  qualifying_sales_count bigint,
  progress_percent numeric
)
language sql
stable security definer
set search_path to 'public'
as $function$
  with partner_ctx as (
    select p.* from public.partners p
    where p.id=public.current_partner_id()
  ), base_sales as (
    select distinct
      s.id,
      s.total_amount,
      s.delivery_status::text as delivery_status
    from public.sales s
    join partner_ctx p on true
    where s.cancelled_at is null
      and (
        s.partner_id=p.id
        or (
          p.linked_location_id is not null
          and s.location_id=p.linked_location_id
        )
      )
      and (
        p_from is null
        or coalesce(
          (s.delivered_at at time zone 'America/Sao_Paulo')::date,
          (s.quoted_at at time zone 'America/Sao_Paulo')::date
        )>=p_from
      )
      and (
        p_to is null
        or coalesce(
          (s.delivered_at at time zone 'America/Sao_Paulo')::date,
          (s.quoted_at at time zone 'America/Sao_Paulo')::date
        )<=p_to
      )
  ), units as (
    select coalesce(sum(si.quantity),0)::bigint as units_sold
    from public.sale_items si
    join base_sales bs on bs.id=si.sale_id
  )
  select
    p.id,
    count(bs.id),
    u.units_sold,
    coalesce(sum(bs.total_amount),0),
    count(bs.id) filter(where bs.delivery_status='delivered'),
    coalesce(sum(bs.total_amount) filter(where bs.delivery_status='delivered'),0),
    round(coalesce(p.commission_pct,0)*100,2),
    p.reward_type,
    p.reward_value,
    p.reward_description,
    p.target_sales,
    count(bs.id) filter(
      where case
        when p.counts_only_delivered then bs.delivery_status='delivered'
        else true
      end
    ),
    case
      when coalesce(p.target_sales,0)>0 then round(
        100.0*count(bs.id) filter(
          where case
            when p.counts_only_delivered then bs.delivery_status='delivered'
            else true
          end
        )/p.target_sales,
        1
      )
      else null
    end
  from partner_ctx p
  left join base_sales bs on true
  cross join units u
  group by
    p.id,p.commission_pct,p.reward_type,p.reward_value,
    p.reward_description,p.target_sales,p.counts_only_delivered,u.units_sold;
$function$;

create or replace function public.partner_portal_get_monthly_history(
  p_months integer default 12
)
returns table(
  month_start date,
  sales_count bigint,
  units_sold bigint,
  gross_sales numeric,
  delivered_sales_count bigint,
  delivered_gross_sales numeric,
  partnership_percent numeric,
  estimated_partner_share numeric
)
language sql
stable security definer
set search_path to 'public'
as $function$
  with base_context as (
    select date_trunc(
      'month',
      now() at time zone 'America/Sao_Paulo'
    )::date as current_month
  ), context as (
    select
      current_month,
      (current_month-((least(greatest(coalesce(p_months,12),1),36)-1)*interval '1 month'))::date as start_month
    from base_context
  ), partner_ctx as (
    select p.* from public.partners p
    where p.id=public.current_partner_id()
  ), months as (
    select generate_series(
      ctx.start_month,
      ctx.current_month,
      interval '1 month'
    )::date as month_start
    from context ctx
  ), sales_base as (
    select distinct
      s.id,
      date_trunc(
        'month',
        coalesce(
          (s.delivered_at at time zone 'America/Sao_Paulo')::date,
          (s.quoted_at at time zone 'America/Sao_Paulo')::date
        )::timestamp
      )::date as month_start,
      s.total_amount,
      s.delivery_status::text as delivery_status
    from public.sales s
    join partner_ctx p on true
    cross join context ctx
    where s.cancelled_at is null
      and (
        s.partner_id=p.id
        or (
          p.linked_location_id is not null
          and s.location_id=p.linked_location_id
        )
      )
      and coalesce(
        (s.delivered_at at time zone 'America/Sao_Paulo')::date,
        (s.quoted_at at time zone 'America/Sao_Paulo')::date
      )>=ctx.start_month
  ), units as (
    select
      date_trunc(
        'month',
        coalesce(
          (s.delivered_at at time zone 'America/Sao_Paulo')::date,
          (s.quoted_at at time zone 'America/Sao_Paulo')::date
        )::timestamp
      )::date as month_start,
      coalesce(sum(si.quantity),0)::bigint as units_sold
    from public.sales s
    join public.sale_items si on si.sale_id=s.id
    join partner_ctx p on true
    cross join context ctx
    where s.cancelled_at is null
      and (
        s.partner_id=p.id
        or (
          p.linked_location_id is not null
          and s.location_id=p.linked_location_id
        )
      )
      and coalesce(
        (s.delivered_at at time zone 'America/Sao_Paulo')::date,
        (s.quoted_at at time zone 'America/Sao_Paulo')::date
      )>=ctx.start_month
    group by 1
  )
  select
    m.month_start,
    count(sb.id),
    coalesce(u.units_sold,0),
    coalesce(sum(sb.total_amount),0),
    count(sb.id) filter(where sb.delivery_status='delivered'),
    coalesce(sum(sb.total_amount) filter(where sb.delivery_status='delivered'),0),
    round(coalesce(p.commission_pct,0)*100,2),
    round(
      (
        case
          when p.counts_only_delivered then
            coalesce(sum(sb.total_amount) filter(where sb.delivery_status='delivered'),0)
          else coalesce(sum(sb.total_amount),0)
        end
      )*coalesce(p.commission_pct,0),
      2
    )
  from months m
  cross join partner_ctx p
  left join sales_base sb on sb.month_start=m.month_start
  left join units u on u.month_start=m.month_start
  group by m.month_start,u.units_sold,p.commission_pct,p.counts_only_delivered
  order by m.month_start desc;
$function$;

commit;
