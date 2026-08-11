begin;

-- ============================================================
-- 1. Último custo: recupera histórico real e passa a manter
--    automaticamente a partir dos próximos pedidos.
-- ============================================================

with latest as (
  select distinct on (poi.product_id)
    poi.product_id,
    poi.unit_cost,
    po.ordered_on
  from public.purchase_order_items poi
  join public.purchase_orders po
    on po.id = poi.purchase_order_id
  where coalesce(poi.unit_cost,0) > 0
    and po.status <> 'cancelled'
  order by
    poi.product_id,
    po.ordered_on desc,
    poi.created_at desc
)
update public.products p
set
  last_purchase_cost = l.unit_cost,
  last_purchase_on = l.ordered_on,
  updated_at = now()
from latest l
where p.id = l.product_id
  and (
    p.last_purchase_cost is null
    or p.last_purchase_cost <= 0
    or p.last_purchase_on is null
  );

create or replace function public.refresh_product_last_purchase_cost_v4521(
  p_product_id uuid
)
returns void
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_cost numeric;
  v_ordered_on date;
begin
  select
    poi.unit_cost,
    po.ordered_on
  into
    v_cost,
    v_ordered_on
  from public.purchase_order_items poi
  join public.purchase_orders po
    on po.id = poi.purchase_order_id
  where poi.product_id = p_product_id
    and coalesce(poi.unit_cost,0) > 0
    and po.status <> 'cancelled'
  order by
    po.ordered_on desc,
    poi.created_at desc
  limit 1;

  update public.products
  set
    last_purchase_cost = v_cost,
    last_purchase_on = v_ordered_on,
    updated_at = now()
  where id = p_product_id
    and (
      last_purchase_cost is distinct from v_cost
      or last_purchase_on is distinct from v_ordered_on
    );
end;
$$;

revoke all on function
  public.refresh_product_last_purchase_cost_v4521(uuid)
from public;

create or replace function public.purchase_item_refresh_last_cost_v4521()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_product_last_purchase_cost_v4521(
      old.product_id
    );
    return old;
  end if;

  perform public.refresh_product_last_purchase_cost_v4521(
    new.product_id
  );

  if tg_op = 'UPDATE'
    and old.product_id is distinct from new.product_id
  then
    perform public.refresh_product_last_purchase_cost_v4521(
      old.product_id
    );
  end if;

  return new;
end;
$$;

revoke all on function
  public.purchase_item_refresh_last_cost_v4521()
from public;

drop trigger if exists
  purchase_item_refresh_last_cost_v4521
on public.purchase_order_items;

create trigger purchase_item_refresh_last_cost_v4521
after insert or update or delete
on public.purchase_order_items
for each row
execute function
  public.purchase_item_refresh_last_cost_v4521();

create or replace function public.purchase_order_refresh_last_cost_v4521()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_product_id uuid;
begin
  if
    old.status is distinct from new.status
    or old.ordered_on is distinct from new.ordered_on
  then
    for v_product_id in
      select distinct product_id
      from public.purchase_order_items
      where purchase_order_id = new.id
    loop
      perform public.refresh_product_last_purchase_cost_v4521(
        v_product_id
      );
    end loop;
  end if;

  return new;
end;
$$;

revoke all on function
  public.purchase_order_refresh_last_cost_v4521()
from public;

drop trigger if exists
  purchase_order_refresh_last_cost_v4521
on public.purchase_orders;

create trigger purchase_order_refresh_last_cost_v4521
after update of status, ordered_on
on public.purchase_orders
for each row
execute function
  public.purchase_order_refresh_last_cost_v4521();

-- ============================================================
-- 2. Nexus Aprendizado: page_view deixa de significar "uso".
--    Um módulo só ganha uso quando houve navegação/ação a partir
--    dele. Entradas automáticas das operações são excluídas.
-- ============================================================

create or replace function public.nexus_personal_workspace_v1(
  p_route text default '/dashboard'::text
)
returns jsonb
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_route text;
  v_pinned jsonb := '[]'::jsonb;
  v_suggested jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_total_pins integer := 0;
  v_context_pins integer := 0;
begin
  if v_user is null then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;

  v_route :=
    public.normalize_nexus_route_v1(
      coalesce(p_route,'/dashboard')
    );

  with ranked as (
    select
      s.*,
      case when s.context_route=v_route then 0 else 1 end
        as context_rank,
      row_number() over(
        partition by s.href
        order by
          case when s.context_route=v_route then 0 else 1 end,
          s.sort_order,
          s.updated_at desc
      ) as href_rank
    from public.nexus_user_shortcuts s
    where s.user_id=v_user
      and s.context_route in ('*',v_route)
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',id,
        'label',label,
        'href',href,
        'operation_scope',operation_scope,
        'context_route',context_route,
        'source',source,
        'sort_order',sort_order,
        'use_count',use_count,
        'last_used_at',last_used_at
      )
      order by
        context_rank,
        sort_order,
        coalesce(last_used_at,created_at) desc
    ),
    '[]'::jsonb
  )
  into v_pinned
  from ranked
  where href_rank=1;

  with contextual as (
    select
      e.target_route as href,
      count(*)::integer as hits,
      count(
        distinct
        (e.created_at at time zone 'America/Sao_Paulo')::date
      )::integer as days,
      max(e.created_at) as last_seen,
      100 + count(*)*8 as score,
      'context'::text as source
    from public.nexus_activity_events e
    where e.user_id=v_user
      and e.action_kind='navigation_click'
      and e.route=v_route
      and e.target_route is not null
      and e.target_route<>v_route
      and e.created_at>=now()-interval '30 days'
      and position(':id' in e.target_route)=0
    group by e.target_route
  ),
  usage as (
    select
      e.route as href,
      count(*)::integer as hits,
      count(
        distinct
        (e.created_at at time zone 'America/Sao_Paulo')::date
      )::integer as days,
      max(e.created_at) as last_seen,
      count(*)*5
        + count(
            distinct
            (e.created_at at time zone 'America/Sao_Paulo')::date
          )*5 as score,
      'usage'::text as source
    from public.nexus_activity_events e
    where e.user_id=v_user
      and e.action_kind in ('navigation_click','action_click')
      and e.created_at>=now()-interval '30 days'
      and e.route<>v_route
      and e.route not in (
        '/dashboard',
        '/suplementos',
        '/fitness',
        '/bank',
        '/central',
        '/marketing',
        '/parceiro'
      )
      and position(':id' in e.route)=0
    group by e.route
  ),
  merged as (
    select
      href,
      sum(hits)::integer as hits,
      max(days)::integer as days,
      max(last_seen) as last_seen,
      sum(score)::integer as score,
      case
        when bool_or(source='context')
          then 'context'
        else 'usage'
      end as source
    from (
      select * from contextual
      union all
      select * from usage
    ) x
    group by href
  ),
  filtered as (
    select m.*
    from merged m
    where m.href is not null
      and left(m.href,1)='/'
      and m.href<>v_route
      and not exists (
        select 1
        from public.nexus_user_shortcuts s
        where s.user_id=v_user
          and s.href=m.href
          and s.context_route in ('*',v_route)
      )
    order by m.score desc,m.last_seen desc
    limit 8
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'href',href,
        'operation_scope',
          public.nexus_scope_from_route_v1(href),
        'source',source,
        'hits',hits,
        'distinct_days',days,
        'last_seen_at',last_seen,
        'score',score,
        'reason',
          case
            when source='context'
              then 'Você costuma agir neste caminho a partir daqui.'
            else 'Uma das telas em que você realmente executa ações.'
          end
      )
      order by score desc,last_seen desc
    ),
    '[]'::jsonb
  )
  into v_suggested
  from filtered;

  with recent as (
    select
      e.route as href,
      max(e.created_at) as last_seen_at
    from public.nexus_activity_events e
    where e.user_id=v_user
      and e.action_kind='page_view'
      and e.created_at>=now()-interval '14 days'
      and e.route<>v_route
      and e.route not in (
        '/dashboard',
        '/suplementos'
      )
      and position(':id' in e.route)=0
    group by e.route
    order by max(e.created_at) desc
    limit 6
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'href',href,
        'operation_scope',
          public.nexus_scope_from_route_v1(href),
        'last_seen_at',last_seen_at
      )
      order by last_seen_at desc
    ),
    '[]'::jsonb
  )
  into v_recent
  from recent;

  select
    count(*)::integer,
    count(*) filter(where context_route=v_route)::integer
  into
    v_total_pins,
    v_context_pins
  from public.nexus_user_shortcuts
  where user_id=v_user;

  return jsonb_build_object(
    'generated_at',now(),
    'route',v_route,
    'pinned',v_pinned,
    'suggested',v_suggested,
    'recent',v_recent,
    'stats',jsonb_build_object(
      'total_pins',coalesce(v_total_pins,0),
      'context_pins',coalesce(v_context_pins,0),
      'suggestion_count',jsonb_array_length(v_suggested),
      'recent_count',jsonb_array_length(v_recent)
    )
  );
end;
$$;

revoke all on function
  public.nexus_personal_workspace_v1(text)
from public;

grant execute on function
  public.nexus_personal_workspace_v1(text)
to authenticated;

-- ============================================================
-- 3. Nexus Agora: itens Bank de R$ 0,00 deixam de disputar
--    prioridade. Dívidas continuam válidas quando o saldo
--    remanescente é positivo, mesmo sem parcela fixa.
-- ============================================================

do $$
begin
  if
    to_regprocedure(
      'public.nexus_unified_queue_base_v45_20(integer)'
    ) is null
    and to_regprocedure(
      'public.nexus_unified_queue_v1(integer)'
    ) is not null
  then
    alter function public.nexus_unified_queue_v1(integer)
      rename to nexus_unified_queue_base_v45_20;
  end if;
end;
$$;

create or replace function public.nexus_unified_queue_v1(
  p_limit integer default 80
)
returns jsonb
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_raw jsonb;
  v_result jsonb;
  v_limit integer :=
    greatest(1,least(coalesce(p_limit,80),200));
begin
  v_raw :=
    public.nexus_unified_queue_base_v45_20(200);

  with filtered as (
    select item
    from jsonb_array_elements(
      coalesce(v_raw->'items','[]'::jsonb)
    ) as x(item)
    where not (
      item->>'source_type'='bank_invoice'
      and coalesce(
        nullif(item->'metadata'->>'amount','')::numeric,
        0
      ) <= 0
    )
    and not (
      item->>'source_type'='bank_charge'
      and coalesce(
        nullif(
          item->'metadata'->>'remaining_amount',
          ''
        )::numeric,
        nullif(item->'metadata'->>'amount','')::numeric,
        0
      ) <= 0
    )
  ),
  limited as (
    select item
    from filtered
    order by
      coalesce(
        nullif(item->>'score','')::numeric,
        0
      ) desc,
      nullif(item->>'due_at','')::timestamptz asc nulls last,
      item->>'title'
    limit v_limit
  ),
  op_counts as (
    select
      item->>'operation_scope' as operation_scope,
      count(*)::integer as total
    from filtered
    group by item->>'operation_scope'
  ),
  severity_counts as (
    select
      item->>'severity' as severity,
      count(*)::integer as total
    from filtered
    group by item->>'severity'
  )
  select jsonb_build_object(
    'generated_at',now(),
    'items',
      coalesce(
        (
          select jsonb_agg(
            item
            order by
              coalesce(
                nullif(item->>'score','')::numeric,
                0
              ) desc,
              nullif(
                item->>'due_at',
                ''
              )::timestamptz asc nulls last,
              item->>'title'
          )
          from limited
        ),
        '[]'::jsonb
      ),
    'summary',
      jsonb_build_object(
        'total',(select count(*) from filtered),
        'urgent',
          (
            select count(*)
            from filtered
            where item->>'severity'='urgent'
          ),
        'attention',
          (
            select count(*)
            from filtered
            where item->>'severity'='attention'
          ),
        'opportunity',
          (
            select count(*)
            from filtered
            where item->>'severity'='opportunity'
          ),
        'info',
          (
            select count(*)
            from filtered
            where item->>'severity'='info'
          ),
        'by_operation',
          coalesce(
            (
              select jsonb_object_agg(
                operation_scope,
                total
              )
              from op_counts
            ),
            '{}'::jsonb
          ),
        'by_severity',
          coalesce(
            (
              select jsonb_object_agg(
                severity,
                total
              )
              from severity_counts
            ),
            '{}'::jsonb
          )
      )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function
  public.nexus_unified_queue_v1(integer)
from public;

grant execute on function
  public.nexus_unified_queue_v1(integer)
to authenticated;

commit;
