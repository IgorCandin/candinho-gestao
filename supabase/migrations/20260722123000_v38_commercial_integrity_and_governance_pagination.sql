begin;

create index if not exists audit_events_entity_created_idx
  on public.audit_events(entity_type, created_at desc);

create or replace function public.central_governance_audit_page(
  p_page integer default 1,
  p_page_size integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_page integer := greatest(coalesce(p_page,1),1);
  v_size integer := least(greatest(coalesce(p_page_size,30),10),100);
  v_offset integer;
  v_total bigint;
  v_items jsonb;
begin
  if not (
    public.can_manage_users()
    or public.current_user_role()='admin'
  ) then
    raise exception 'Acesso negado';
  end if;

  v_offset := (v_page-1)*v_size;

  select count(*)
    into v_total
  from public.audit_events ae
  where ae.entity_type in (
    'partner_user_link',
    'central_integration',
    'ui_feature_flag',
    'partner_portal_invite',
    'inventory_reconciliation'
  );

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by x.created_at desc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select
      ae.id,
      ae.entity_type,
      ae.entity_id,
      ae.action,
      ae.details,
      ae.created_by,
      p.full_name as created_by_name,
      ae.created_at
    from public.audit_events ae
    left join public.profiles p
      on p.id=ae.created_by
    where ae.entity_type in (
      'partner_user_link',
      'central_integration',
      'ui_feature_flag',
      'partner_portal_invite',
      'inventory_reconciliation'
    )
    order by ae.created_at desc
    offset v_offset
    limit v_size
  ) x;

  return jsonb_build_object(
    'items',v_items,
    'page',v_page,
    'page_size',v_size,
    'total',v_total,
    'total_pages',
      greatest(
        ceil(v_total::numeric/v_size)::integer,
        1
      )
  );
end;
$function$;

revoke all
on function public.central_governance_audit_page(integer,integer)
from anon, public;

grant execute
on function public.central_governance_audit_page(integer,integer)
to authenticated, service_role;

create or replace function public.erp_commercial_integrity_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_cutover date;
  v_result jsonb;
  v_critical integer;
  v_attention integer;
begin
  if not (
    public.can_manage_users()
    or public.current_user_role()='admin'
  ) then
    raise exception 'Acesso negado';
  end if;

  select coalesce(
    min(created_at)::date,
    '2026-07-13'::date
  )
  into v_cutover
  from public.sale_payment_entries;

  with item_totals as (
    select
      sale_id,
      coalesce(sum(total_price),0)::numeric
        as item_amount,
      coalesce(sum(total_cost),0)::numeric
        as item_cost
    from public.sale_items
    group by sale_id
  ),
  metrics as (
    select jsonb_build_object(
      'active_sales_without_items',(
        select count(*)
        from public.sales s
        where s.record_type='sale'
          and s.general_status<>'cancelled'
          and not exists(
            select 1
            from public.sale_items i
            where i.sale_id=s.id
          )
      ),
      'confirmed_quotes_without_sale',(
        select count(*)
        from public.sales_quotes q
        where q.status='confirmed'
          and q.sale_id is null
      ),
      'quoted_quotes_with_sale',(
        select count(*)
        from public.sales_quotes q
        where q.status='quoted'
          and q.sale_id is not null
      ),
      'cancelled_sales_active_reservations',(
        select count(distinct s.id)
        from public.sales s
        join public.stock_reservations r
          on r.sale_id=s.id
         and r.status in (
           'reserved',
           'partial',
           'awaiting_stock'
         )
        where s.general_status='cancelled'
      ),
      'delivered_without_stock_deducted',(
        select count(*)
        from public.sales s
        where s.record_type='sale'
          and s.delivery_status='delivered'
          and s.general_status<>'cancelled'
          and not s.stock_deducted
      ),
      'finalized_not_paid_or_delivered',(
        select count(*)
        from public.sales s
        where s.record_type='sale'
          and s.general_status='finalized'
          and (
            s.payment_status<>'received'
            or s.delivery_status<>'delivered'
          )
      ),
      'negative_stock_balances',(
        select count(*)
        from public.stock_balances
        where quantity<0
      ),
      'negative_flavor_stock',(
        select count(*)
        from public.product_flavor_stock_balances
        where quantity<0
      ),
      'reserved_gt_physical',(
        select count(*)
        from public.sale_stock_availability
        where reserved_quantity>physical_quantity
      ),
      'fitness_negative_stock',(
        select count(*)
        from public.fitness_stock_balances
        where quantity<0
      ),
      'sales_total_mismatch',(
        select count(*)
        from public.sales s
        join item_totals i
          on i.sale_id=s.id
        where s.record_type='sale'
          and s.general_status<>'cancelled'
          and abs(
            s.total_amount
            - greatest(
                i.item_amount
                - coalesce(
                    s.discount_amount,
                    0
                  ),
                0
              )
          )>0.01
      ),
      'sales_cost_mismatch',(
        select count(*)
        from public.sales s
        join item_totals i
          on i.sale_id=s.id
        where s.record_type='sale'
          and s.general_status<>'cancelled'
          and abs(
            s.total_cost
            - (
                i.item_cost
                + coalesce(
                    s.gift_quantity,
                    0
                  )
                  * coalesce(
                      s.gift_unit_cost,
                      0
                    )
              )
          )>0.01
      ),
      'sales_profit_mismatch',(
        select count(*)
        from public.sales s
        where s.record_type='sale'
          and s.general_status<>'cancelled'
          and abs(
            s.total_profit
            - (
                s.total_amount
                - s.total_cost
              )
          )>0.01
      ),
      'confirmed_quote_total_mismatch',(
        select count(*)
        from public.sales_quotes q
        join public.sales s
          on s.id=q.sale_id
        where q.status='confirmed'
          and s.general_status<>'cancelled'
          and abs(
            q.total_amount
            - s.total_amount
          )>0.01
      ),
      'recent_received_without_payment_entry',(
        select count(*)
        from public.sales s
        where s.record_type='sale'
          and s.payment_status='received'
          and s.general_status<>'cancelled'
          and s.quoted_at::date>=v_cutover
          and not exists(
            select 1
            from public.sale_payment_entries e
            where e.sale_id=s.id
          )
      ),
      'legacy_received_without_payment_entry',(
        select count(*)
        from public.sales s
        where s.record_type='sale'
          and s.payment_status='received'
          and s.general_status<>'cancelled'
          and s.quoted_at::date<v_cutover
          and not exists(
            select 1
            from public.sale_payment_entries e
            where e.sale_id=s.id
          )
      ),
      'calendar_pending',(
        select count(*)
        from public.central_calendar_sync_queue
        where status='pending'
      ),
      'calendar_processing',(
        select count(*)
        from public.central_calendar_sync_queue
        where status='processing'
      ),
      'calendar_errors',(
        select count(*)
        from public.central_calendar_sync_queue
        where status='error'
      ),
      'calendar_stuck',(
        select count(*)
        from public.central_calendar_sync_queue
        where status in (
          'pending',
          'processing'
        )
          and updated_at
            < now()-interval '1 hour'
      ),
      'partner_sales_with_inactive_partner',(
        select count(*)
        from public.sales s
        join public.partners p
          on p.id=s.partner_id
        where s.record_type='sale'
          and s.general_status<>'cancelled'
          and not coalesce(
            p.active,
            true
          )
      ),
      'post_sale_planned_without_sale',(
        select count(*)
        from public.post_sale_batches b
        where b.status='planned'
          and not exists(
            select 1
            from public.post_sale_batch_sales m
            where m.batch_id=b.id
          )
      ),
      'post_sale_completed_sales_open',(
        select count(*)
        from public.sales s
        where s.record_type='sale'
          and s.post_sale_status='completed'
          and exists(
            select 1
            from public.post_sale_batch_sales m
            join public.post_sale_batches b
              on b.id=m.batch_id
            where m.sale_id=s.id
              and b.status='planned'
          )
      )
    ) as data
  )
  select data
    into v_result
  from metrics;

  v_critical :=
    coalesce(
      (
        v_result
        ->>'active_sales_without_items'
      )::integer,
      0
    )
    + coalesce(
        (
          v_result
          ->>'confirmed_quotes_without_sale'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'quoted_quotes_with_sale'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'cancelled_sales_active_reservations'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'delivered_without_stock_deducted'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'finalized_not_paid_or_delivered'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'negative_stock_balances'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'negative_flavor_stock'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'reserved_gt_physical'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'fitness_negative_stock'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'sales_total_mismatch'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'sales_cost_mismatch'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'sales_profit_mismatch'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'confirmed_quote_total_mismatch'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'recent_received_without_payment_entry'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'calendar_errors'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'calendar_stuck'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'partner_sales_with_inactive_partner'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'post_sale_planned_without_sale'
        )::integer,
        0
      )
    + coalesce(
        (
          v_result
          ->>'post_sale_completed_sales_open'
        )::integer,
        0
      );

  v_attention :=
    coalesce(
      (
        v_result
        ->>'calendar_pending'
      )::integer,
      0
    )
    + coalesce(
        (
          v_result
          ->>'calendar_processing'
        )::integer,
        0
      );

  return jsonb_build_object(
    'generated_at',
      now(),
    'payment_entry_cutover',
      v_cutover,
    'status',
      case
        when v_critical>0
          then 'critical'
        when v_attention>0
          then 'attention'
        else 'healthy'
      end,
    'critical_count',
      v_critical,
    'attention_count',
      v_attention,
    'metrics',
      v_result
  );
end;
$function$;

revoke all
on function public.erp_commercial_integrity_snapshot()
from anon, public;

grant execute
on function public.erp_commercial_integrity_snapshot()
to authenticated, service_role;

commit;
