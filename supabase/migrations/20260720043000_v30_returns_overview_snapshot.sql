drop view if exists public.return_cases_overview;

create view public.return_cases_overview
with (security_invoker=true)
as
select
  rc.id,
  rc.case_number,
  rc.operation,
  rc.case_type,
  rc.original_sale_id,
  rc.original_fitness_sale_id,
  rc.customer_id,
  rc.customer_name,
  rc.customer_phone,
  rc.reason,
  rc.status,
  rc.resolution,
  rc.financial_status,
  rc.refund_amount,
  rc.bank_charge_id,
  rc.requested_on,
  rc.received_on,
  rc.resolved_on,
  rc.notes,
  rc.created_at,
  rc.updated_at,
  count(rci.id)::integer as item_lines,
  coalesce(sum(rci.quantity_requested),0)::integer as units_requested,
  coalesce(sum(rci.quantity_received),0)::integer as units_received,
  coalesce(sum(rci.restocked_quantity),0)::integer as units_restocked,
  coalesce(sum(rci.quantity_received*rci.unit_price),0)::numeric(12,2)
    as received_value,
  string_agg(
    rci.item_name
    ||case
      when nullif(rci.variant_label,'') is null
        then ''
      else ' · '||rci.variant_label
    end
    ||' ×'
    ||rci.quantity_requested::text,
    ', '
    order by rci.created_at
  ) as item_summary,
  greatest(
    (
      (now() at time zone 'America/Sao_Paulo')::date
      -rc.requested_on
    ),
    0
  )::integer as days_open,
  bc.status as bank_charge_status,
  bc.due_date as refund_due_date,
  bc.paid_on as refund_paid_on,
  case
    when rc.bank_charge_id is not null
      and bc.status='paid'
      then 'settled'
    else rc.financial_status
  end as effective_financial_status
from public.return_cases rc
left join public.return_case_items rci
  on rci.case_id=rc.id
left join public.bank_charges bc
  on bc.id=rc.bank_charge_id
group by
  rc.id,
  bc.status,
  bc.due_date,
  bc.paid_on;

grant select
on public.return_cases_overview
to authenticated,service_role;

create or replace function public.returns_center_snapshot(
  p_operation text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_cases jsonb;
  v_summary jsonb;
begin
  select *
  into v_profile
  from public.profiles
  where id=auth.uid()
    and active=true;

  if not found then
    raise exception 'Acesso negado';
  end if;

  if p_operation='supplements'
     and not (
       v_profile.role='admin'
       or v_profile.can_access_supplements
     )
  then
    raise exception 'Acesso negado';
  end if;

  if p_operation='fitness'
     and not (
       v_profile.role='admin'
       or v_profile.can_access_fitness
     )
  then
    raise exception 'Acesso negado';
  end if;

  if p_operation is null
     and not (
       v_profile.role='admin'
       or v_profile.can_access_supplements
       or v_profile.can_access_fitness
     )
  then
    raise exception 'Acesso negado';
  end if;

  select jsonb_build_object(
    'open_cases',
      count(*) filter(
        where status not in (
          'resolved',
          'rejected',
          'cancelled'
        )
      ),
    'awaiting_receipt',
      count(*) filter(
        where status='requested'
      ),
    'in_inspection',
      count(*) filter(
        where status in (
          'received',
          'inspection'
        )
      ),
    'refund_pending',
      count(*) filter(
        where effective_financial_status
          in ('pending','scheduled')
      ),
    'refund_amount_pending',
      coalesce(
        sum(refund_amount) filter(
          where effective_financial_status
            in ('pending','scheduled')
        ),
        0
      ),
    'resolved_this_month',
      count(*) filter(
        where status='resolved'
          and resolved_on>=
            date_trunc(
              'month',
              (
                now()
                at time zone 'America/Sao_Paulo'
              )::date
            )::date
      )
  )
  into v_summary
  from public.return_cases_overview
  where (
      p_operation is null
      or operation=p_operation
    )
    and (
      (
        operation='supplements'
        and (
          v_profile.role='admin'
          or v_profile.can_access_supplements
        )
      )
      or
      (
        operation='fitness'
        and (
          v_profile.role='admin'
          or v_profile.can_access_fitness
        )
      )
    );

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by
        case
          when x.status in (
            'resolved',
            'rejected',
            'cancelled'
          )
            then 1
          else 0
        end,
        x.requested_on desc,
        x.case_number desc
    ),
    '[]'::jsonb
  )
  into v_cases
  from (
    select *
    from public.return_cases_overview
    where (
        p_operation is null
        or operation=p_operation
      )
      and (
        (
          operation='supplements'
          and (
            v_profile.role='admin'
            or v_profile.can_access_supplements
          )
        )
        or
        (
          operation='fitness'
          and (
            v_profile.role='admin'
            or v_profile.can_access_fitness
          )
        )
      )
    order by
      requested_on desc,
      case_number desc
    limit 150
  ) x;

  return jsonb_build_object(
    'summary',
      coalesce(
        v_summary,
        '{}'::jsonb
      ),
    'cases',
      v_cases
  );
end;
$$;

revoke all
on function public.returns_center_snapshot(text)
from public,anon;

grant execute
on function public.returns_center_snapshot(text)
to authenticated,service_role;
