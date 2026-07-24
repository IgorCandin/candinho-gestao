begin;

alter table public.bank_month_commitment_resolutions
  add column if not exists amount_override numeric(14,2);

alter table public.bank_month_commitment_resolutions
  drop constraint if exists bank_month_commitment_resolutions_resolution_check;

alter table public.bank_month_commitment_resolutions
  add constraint bank_month_commitment_resolutions_resolution_check
  check (resolution in ('paid','dismissed','adjusted'));

alter table public.bank_month_commitment_resolutions
  drop constraint if exists bank_month_commitment_resolutions_amount_override_check;

alter table public.bank_month_commitment_resolutions
  add constraint bank_month_commitment_resolutions_amount_override_check
  check (amount_override is null or amount_override >= 0);

create table if not exists public.bank_income_source_receipts (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.bank_income_sources(id) on delete cascade,
  reference_month date not null,
  received_on date not null default current_date,
  amount numeric(14,2) not null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, reference_month),
  constraint bank_income_source_receipts_reference_month_check
    check (reference_month = date_trunc('month', reference_month)::date),
  constraint bank_income_source_receipts_amount_check
    check (amount >= 0)
);

alter table public.bank_income_source_receipts enable row level security;

drop policy if exists bank_income_source_receipts_select
on public.bank_income_source_receipts;

create policy bank_income_source_receipts_select
on public.bank_income_source_receipts
for select
to authenticated
using (public.can_access_bank());

drop policy if exists bank_income_source_receipts_write
on public.bank_income_source_receipts;

create policy bank_income_source_receipts_write
on public.bank_income_source_receipts
for all
to authenticated
using (public.can_write_bank())
with check (public.can_write_bank());

grant select on public.bank_income_source_receipts
to authenticated, service_role;

revoke all on public.bank_income_source_receipts
from anon;

create or replace function public.bank_adjust_month_commitment(
  p_commitment_key text,
  p_reference_month date,
  p_amount numeric,
  p_notes text default null
)
returns public.bank_month_commitment_resolutions
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row public.bank_month_commitment_resolutions;
  v_kind text;
  v_id_text text;
  v_id uuid;
begin
  if not public.can_write_bank() then
    raise exception
      'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode='42501';
  end if;

  if p_commitment_key is null or position(':' in p_commitment_key)=0 then
    raise exception 'Compromisso inválido';
  end if;

  v_kind:=split_part(p_commitment_key,':',1);
  v_id_text:=split_part(p_commitment_key,':',2);

  if v_kind not in ('charge','invoice','subscription','debt') then
    raise exception 'Tipo de compromisso não suportado';
  end if;

  begin
    v_id:=v_id_text::uuid;
  exception when others then
    raise exception 'Identificador do compromisso inválido';
  end;

  if p_reference_month is null
     or p_reference_month<>date_trunc('month',p_reference_month)::date
  then
    raise exception 'Mês de referência inválido';
  end if;

  if p_amount is null or p_amount<0 then
    raise exception 'Informe um valor válido para este mês';
  end if;

  if v_kind='charge' and not exists(
    select 1 from public.bank_charges where id=v_id
  ) then
    raise exception 'Cobrança não encontrada';
  elsif v_kind='invoice' and not exists(
    select 1 from public.bank_card_invoices where id=v_id
  ) then
    raise exception 'Fatura não encontrada';
  elsif v_kind='subscription' and not exists(
    select 1 from public.bank_subscriptions where id=v_id
  ) then
    raise exception 'Mensalidade não encontrada';
  elsif v_kind='debt' and not exists(
    select 1 from public.bank_debts where id=v_id
  ) then
    raise exception 'Dívida não encontrada';
  end if;

  insert into public.bank_month_commitment_resolutions(
    commitment_key,
    reference_month,
    resolution,
    resolved_on,
    amount_override,
    notes,
    created_by,
    updated_at
  )
  values(
    p_commitment_key,
    p_reference_month,
    'adjusted',
    current_date,
    round(p_amount,2),
    nullif(btrim(p_notes),''),
    auth.uid(),
    now()
  )
  on conflict (commitment_key,reference_month)
  do update
  set resolution=case
        when public.bank_month_commitment_resolutions.resolution='paid'
          then 'paid'
        else 'adjusted'
      end,
      amount_override=excluded.amount_override,
      notes=coalesce(excluded.notes,public.bank_month_commitment_resolutions.notes),
      resolved_on=current_date,
      updated_at=now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.bank_adjust_month_commitment(text,date,numeric,text)
from public,anon;

grant execute on function public.bank_adjust_month_commitment(text,date,numeric,text)
to authenticated,service_role;

create or replace function public.bank_mark_income_source_received(
  p_source_id uuid,
  p_reference_month date,
  p_received_on date default current_date,
  p_amount numeric default null,
  p_notes text default null
)
returns public.bank_income_source_receipts
language plpgsql
security definer
set search_path=public
as $$
declare
  v_source public.bank_income_sources;
  v_row public.bank_income_source_receipts;
  v_amount numeric(14,2);
begin
  if not public.can_write_bank() then
    raise exception
      'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode='42501';
  end if;

  select * into v_source
  from public.bank_income_sources
  where id=p_source_id
    and is_active=true;

  if v_source.id is null then
    raise exception 'Entrada prevista não encontrada ou inativa';
  end if;

  if p_reference_month is null
     or p_reference_month<>date_trunc('month',p_reference_month)::date
  then
    raise exception 'Mês de referência inválido';
  end if;

  v_amount:=round(coalesce(p_amount,v_source.amount),2);

  if v_amount<0 then
    raise exception 'Valor recebido inválido';
  end if;

  insert into public.bank_income_source_receipts(
    source_id,
    reference_month,
    received_on,
    amount,
    notes,
    created_by,
    updated_at
  )
  values(
    p_source_id,
    p_reference_month,
    coalesce(p_received_on,current_date),
    v_amount,
    nullif(btrim(p_notes),''),
    auth.uid(),
    now()
  )
  on conflict (source_id,reference_month)
  do update
  set received_on=excluded.received_on,
      amount=excluded.amount,
      notes=coalesce(excluded.notes,public.bank_income_source_receipts.notes),
      updated_at=now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.bank_mark_income_source_received(uuid,date,date,numeric,text)
from public,anon;

grant execute on function public.bank_mark_income_source_received(uuid,date,date,numeric,text)
to authenticated,service_role;

create or replace function public.bank_correct_debt_total_paid(
  p_debt_id uuid,
  p_total_paid numeric,
  p_reason text
)
returns public.bank_debts
language plpgsql
security definer
set search_path=public
as $$
declare
  v_debt public.bank_debts;
  v_previous_paid numeric(14,2);
  v_reason text:=nullif(btrim(p_reason),'');
begin
  if not public.can_write_bank() then
    raise exception
      'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode='42501';
  end if;

  select * into v_debt
  from public.bank_debts
  where id=p_debt_id
  for update;

  if v_debt.id is null then
    raise exception 'Dívida não encontrada';
  end if;

  if p_total_paid is null
     or p_total_paid<0
     or p_total_paid>v_debt.original_amount
  then
    raise exception 'Total pago corrigido inválido';
  end if;

  if v_reason is null or length(v_reason)<5 then
    raise exception 'Explique o motivo da correção auditada';
  end if;

  v_previous_paid:=coalesce(v_debt.total_paid,0);

  update public.bank_debts
  set total_paid=round(p_total_paid,2),
      status=case
        when p_total_paid>=original_amount then 'paid'
        else 'active'
      end,
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_debt_id
  returning * into v_debt;

  insert into public.bank_debt_payments(
    debt_id,
    due_date,
    action_type,
    amount,
    paid_on,
    previous_due_date,
    new_due_date,
    payment_account_id,
    notes,
    created_by
  )
  values(
    p_debt_id,
    v_debt.next_due_date,
    'adjustment',
    0,
    null,
    v_debt.next_due_date,
    v_debt.next_due_date,
    null,
    'Correção auditada do total pago: '
      ||v_previous_paid::text||' → '||round(p_total_paid,2)::text
      ||' | Motivo: '||v_reason,
    auth.uid()
  );

  return v_debt;
end;
$$;

revoke all on function public.bank_correct_debt_total_paid(uuid,numeric,text)
from public,anon;

grant execute on function public.bank_correct_debt_total_paid(uuid,numeric,text)
to authenticated,service_role;

create or replace view public.product_recent_sales_overview as
select
  si.id as sale_item_id,
  si.product_id,
  si.sale_id,
  s.customer_id,
  coalesce(c.name,'Cliente não informado') as customer_name,
  c.city as customer_city,
  c.reference as customer_reference,
  coalesce(s.paid_at,s.delivered_at,s.quoted_at,s.created_at) as sold_at,
  si.quantity,
  si.unit_price,
  si.total_price,
  si.total_profit,
  pf.name as flavor_name,
  s.payment_status::text as payment_status,
  s.delivery_status::text as delivery_status,
  s.general_status::text as general_status
from public.sale_items si
join public.sales s on s.id=si.sale_id
left join public.customers c on c.id=s.customer_id
left join public.product_flavors pf on pf.id=si.flavor_id
where s.record_type::text='sale'
  and s.general_status::text<>'cancelled';

grant select on public.product_recent_sales_overview
to authenticated,service_role;

revoke all on public.product_recent_sales_overview
from anon;

commit;
