create or replace function public.central_customer_directory_snapshot(
  p_query text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_can_supplements boolean:=
    public.can_access_operation('supplements');
  v_can_fitness boolean:=
    public.can_access_operation('fitness');
  v_rows jsonb;
  v_total integer;
  v_both integer;
  v_supp integer;
  v_fit integer;
begin
  if not (v_can_supplements or v_can_fitness) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;

  with raw as (
    select
      case
        when length(
          regexp_replace(
            coalesce(c.phone,s.phone,''),
            '\D','','g'
          )
        )>=8
          then 'phone:'||regexp_replace(
            coalesce(c.phone,s.phone,''),
            '\D','','g'
          )
        else 'supplements:'||c.id::text
      end as identity_key,
      'supplements'::text as operation,
      c.id as supplements_customer_id,
      null::uuid as fitness_customer_id,
      coalesce(c.name,s.reference,'Cliente') as customer_name,
      coalesce(c.phone,s.phone) as phone,
      coalesce(c.city,s.city) as city,
      count(*)::integer as purchase_count,
      coalesce(sum(s.total_amount),0)::numeric(14,2) as total_spent,
      max(coalesce(s.delivered_at,s.quoted_at)) as last_purchase_at
    from public.sales s
    join public.customers c
      on c.id=s.customer_id
    where v_can_supplements
      and s.record_type='sale'
      and s.general_status<>'cancelled'
    group by
      c.id,c.name,c.phone,c.city,
      s.phone,s.city,s.reference

    union all

    select
      case
        when length(
          regexp_replace(
            coalesce(fc.phone,fs.customer_phone,''),
            '\D','','g'
          )
        )>=8
          then 'phone:'||regexp_replace(
            coalesce(fc.phone,fs.customer_phone,''),
            '\D','','g'
          )
        else 'fitness:'||coalesce(fc.id::text,fs.id::text)
      end,
      'fitness'::text,
      null::uuid,
      fc.id,
      coalesce(fc.name,fs.customer_name,'Cliente'),
      coalesce(fc.phone,fs.customer_phone),
      coalesce(fc.city,fs.city),
      count(*)::integer,
      coalesce(sum(fs.total_amount),0)::numeric(14,2),
      max(fs.quoted_on::timestamp with time zone)
    from public.fitness_sales fs
    left join public.fitness_customers fc
      on fc.id=fs.customer_id
    where v_can_fitness
      and fs.general_status<>'cancelled'
    group by
      fc.id,fc.name,fc.phone,fc.city,
      fs.customer_phone,fs.city,fs.customer_name,fs.id
  ),
  grouped as (
    select
      identity_key,
      (
        array_agg(
          customer_name
          order by last_purchase_at desc nulls last
        )
      )[1] as display_name,
      (
        array_agg(
          phone
          order by last_purchase_at desc nulls last
        )
        filter(where phone is not null)
      )[1] as phone,
      (
        array_agg(
          city
          order by last_purchase_at desc nulls last
        )
        filter(where city is not null)
      )[1] as city,
      array_agg(
        distinct operation
        order by operation
      ) as operations,
      (
        array_agg(
          supplements_customer_id
          order by last_purchase_at desc nulls last
        )
        filter(where supplements_customer_id is not null)
      )[1] as supplements_customer_id,
      (
        array_agg(
          fitness_customer_id
          order by last_purchase_at desc nulls last
        )
        filter(where fitness_customer_id is not null)
      )[1] as fitness_customer_id,
      sum(purchase_count)::integer as purchase_count,
      sum(total_spent)::numeric(14,2) as total_spent,
      max(last_purchase_at) as last_purchase_at
    from raw
    group by identity_key
  ),
  filtered as (
    select *
    from grouped
    where
      nullif(btrim(p_query),'') is null
      or lower(
        coalesce(display_name,'')
        ||' '||coalesce(phone,'')
        ||' '||coalesce(city,'')
      )
      like '%'||lower(btrim(p_query))||'%'
  )
  select
    coalesce(
      jsonb_agg(
        to_jsonb(f)
        order by f.last_purchase_at desc nulls last,
                 f.display_name
      ),
      '[]'::jsonb
    ),
    count(*)::integer,
    count(*) filter(
      where array_length(f.operations,1)=2
    )::integer,
    count(*) filter(
      where 'supplements'=any(f.operations)
    )::integer,
    count(*) filter(
      where 'fitness'=any(f.operations)
    )::integer
  into
    v_rows,
    v_total,
    v_both,
    v_supp,
    v_fit
  from filtered f;

  return jsonb_build_object(
    'summary',
      jsonb_build_object(
        'total',coalesce(v_total,0),
        'both_operations',coalesce(v_both,0),
        'supplements',coalesce(v_supp,0),
        'fitness',coalesce(v_fit,0)
      ),
    'customers',
      coalesce(v_rows,'[]'::jsonb)
  );
end;
$$;

revoke all
on function public.central_customer_directory_snapshot(text)
from public,anon;

grant execute
on function public.central_customer_directory_snapshot(text)
to authenticated,service_role;
