-- Keep sale lifecycle and financial eligibility internally consistent.
-- Existing values changed below are copied to audit_events first.

create or replace function public.enforce_sale_lifecycle_and_financial_integrity_v1()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.record_type = 'sale' and new.general_status <> 'cancelled' then
    new.general_status := case
      when new.delivery_status = 'delivered'
       and new.payment_status = 'received'
        then 'finalized'
      else 'active'
    end;
  end if;

  if new.payment_status <> 'receivable' then
    new.payment_due_at := null;
  end if;

  if new.record_type = 'lead' and new.payment_status = 'not_applicable' then
    new.payment_method := null;
    new.payment_condition := null;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_sale_lifecycle_and_financial_integrity_v1()
from public, anon, authenticated;

insert into public.audit_events(entity_type, entity_id, action, details)
select
  'sale',
  s.id,
  'financial_residue_normalized',
  jsonb_build_object(
    'record_type', s.record_type,
    'payment_status', s.payment_status,
    'payment_due_at_before', s.payment_due_at,
    'payment_method_before', s.payment_method,
    'payment_condition_before', s.payment_condition,
    'general_status', s.general_status,
    'migration', '20260818022348_enforce_sale_and_financial_integrity'
  )
from public.sales s
where s.payment_status <> 'receivable'
  and (
    s.payment_due_at is not null
    or (
      s.record_type = 'lead'
      and (s.payment_method is not null or s.payment_condition is not null)
    )
  );

update public.sales
set
  payment_due_at = null,
  payment_method = case
    when record_type = 'lead' and payment_status = 'not_applicable' then null
    else payment_method
  end,
  payment_condition = case
    when record_type = 'lead' and payment_status = 'not_applicable' then null
    else payment_condition
  end
where payment_status <> 'receivable'
  and (
    payment_due_at is not null
    or (
      record_type = 'lead'
      and (payment_method is not null or payment_condition is not null)
    )
  );

drop trigger if exists enforce_sale_lifecycle_and_financial_integrity_v1
on public.sales;

create trigger enforce_sale_lifecycle_and_financial_integrity_v1
before insert or update of
  record_type,
  general_status,
  delivery_status,
  payment_status,
  payment_due_at,
  payment_method,
  payment_condition
on public.sales
for each row
execute function public.enforce_sale_lifecycle_and_financial_integrity_v1();

alter table public.sales
  drop constraint if exists sales_payment_due_requires_receivable;

alter table public.sales
  add constraint sales_payment_due_requires_receivable
  check (payment_due_at is null or payment_status = 'receivable')
  not valid;

alter table public.sales
  validate constraint sales_payment_due_requires_receivable;

create or replace view public.supplement_sale_receivable_schedule
with (security_invoker = true)
as
select
  ('installment:' || i.id::text)::text as receivable_key,
  i.sale_id,
  i.id as installment_id,
  i.installment_no,
  i.installment_count,
  i.outstanding_amount::numeric(12,2) as amount,
  i.due_on as due_date,
  true as has_explicit_due
from public.sale_payment_installment_overview i
join public.sales s on s.id = i.sale_id
where s.record_type = 'sale'
  and s.payment_status = 'receivable'
  and s.general_status <> 'cancelled'
  and i.outstanding_amount > 0.005
union all
select
  ('sale:' || s.id::text)::text,
  s.id,
  null::uuid,
  null::integer,
  0::integer,
  ps.outstanding_amount::numeric(12,2),
  coalesce(ps.next_payment_due_at, s.payment_due_at, s.quoted_at::date)::date,
  (s.payment_due_at is not null)
from public.sales s
join public.sale_payment_summary ps on ps.sale_id = s.id
where s.record_type = 'sale'
  and s.payment_status = 'receivable'
  and s.general_status <> 'cancelled'
  and ps.outstanding_amount > 0.005
  and ps.installment_count = 0;

revoke all on public.supplement_sale_receivable_schedule from anon;
grant select on public.supplement_sale_receivable_schedule to authenticated;

do $verification$
begin
  if exists (
    select 1
    from public.sales
    where payment_due_at is not null
      and payment_status <> 'receivable'
  ) then
    raise exception 'Financial integrity verification failed';
  end if;

  if exists (
    select 1
    from public.supplement_sale_receivable_schedule r
    join public.sales s on s.id = r.sale_id
    where s.record_type <> 'sale'
       or s.payment_status <> 'receivable'
       or s.general_status = 'cancelled'
  ) then
    raise exception 'Receivable schedule contains an ineligible record';
  end if;
end
$verification$;
