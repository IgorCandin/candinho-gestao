alter table public.sales_quotes
  drop constraint if exists sales_quotes_payment_mode_check;

alter table public.sales_quotes
  add constraint sales_quotes_payment_mode_check
  check (payment_mode = any(array['receivable'::text,'paid'::text,'combined'::text,'split'::text]));

create table if not exists public.sales_quote_payment_installments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.sales_quotes(id) on delete cascade,
  installment_no integer not null check (installment_no > 0),
  amount numeric(12,2) not null check (amount > 0),
  due_on date not null,
  planned_payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, installment_no),
  check (
    planned_payment_method is null
    or planned_payment_method = any(array['Pix','Dinheiro','Cartão','Link de Pagamento','Pagamento fracionado'])
  )
);

create table if not exists public.sale_payment_installments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  source_quote_installment_id uuid references public.sales_quote_payment_installments(id) on delete set null,
  installment_no integer not null check (installment_no > 0),
  amount numeric(12,2) not null check (amount > 0),
  due_on date not null,
  planned_payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sale_id, installment_no),
  check (
    planned_payment_method is null
    or planned_payment_method = any(array['Pix','Dinheiro','Cartão','Link de Pagamento','Pagamento fracionado'])
  )
);

alter table public.sale_payment_entries
  add column if not exists installment_id uuid references public.sale_payment_installments(id) on delete set null;

create index if not exists sales_quote_payment_installments_quote_idx
  on public.sales_quote_payment_installments(quote_id, installment_no);
create index if not exists sale_payment_installments_sale_idx
  on public.sale_payment_installments(sale_id, due_on, installment_no);
create index if not exists sale_payment_entries_installment_idx
  on public.sale_payment_entries(installment_id, received_at);
create index if not exists sale_payment_entries_sale_received_idx
  on public.sale_payment_entries(sale_id, received_at);

alter table public.sales_quote_payment_installments enable row level security;
alter table public.sale_payment_installments enable row level security;

drop policy if exists sales_quote_payment_installments_read on public.sales_quote_payment_installments;
create policy sales_quote_payment_installments_read
  on public.sales_quote_payment_installments
  for select to authenticated
  using (public.can_access_operation('supplements'));

drop policy if exists sale_payment_installments_read on public.sale_payment_installments;
create policy sale_payment_installments_read
  on public.sale_payment_installments
  for select to authenticated
  using (public.can_access_operation('supplements'));

grant select on public.sales_quote_payment_installments to authenticated;
grant select on public.sale_payment_installments to authenticated;

create or replace view public.sale_payment_installment_overview
with (security_invoker = true)
as
with received as (
  select e.installment_id,
         coalesce(sum(e.amount),0)::numeric(12,2) as received_amount,
         max(e.received_at) as last_received_at
  from public.sale_payment_entries e
  where e.installment_id is not null
  group by e.installment_id
), counts as (
  select sale_id,count(*)::integer as installment_count
  from public.sale_payment_installments
  group by sale_id
)
select
  i.id,i.sale_id,i.source_quote_installment_id,i.installment_no,c.installment_count,
  i.amount,i.due_on,i.planned_payment_method,i.notes,
  coalesce(r.received_amount,0)::numeric(12,2) as received_amount,
  greatest(i.amount-coalesce(r.received_amount,0),0)::numeric(12,2) as outstanding_amount,
  case
    when s.general_status='cancelled' then 'cancelled'
    when coalesce(r.received_amount,0)>=i.amount-0.005 then 'received'
    when coalesce(r.received_amount,0)>0 then 'partial'
    else 'pending'
  end as status,
  (s.general_status<>'cancelled' and greatest(i.amount-coalesce(r.received_amount,0),0)>0 and i.due_on<(now() at time zone 'America/Sao_Paulo')::date) as is_overdue,
  r.last_received_at,i.created_at,i.updated_at
from public.sale_payment_installments i
join public.sales s on s.id=i.sale_id
join counts c on c.sale_id=i.sale_id
left join received r on r.installment_id=i.id;

grant select on public.sale_payment_installment_overview to authenticated;

create or replace view public.sale_payment_summary
with (security_invoker = true)
as
with entries as (
  select sale_id,
         coalesce(sum(amount),0)::numeric(12,2) as raw_received_amount,
         count(*)::integer as payment_entry_count,
         max(received_at) as last_received_at
  from public.sale_payment_entries
  group by sale_id
), installments as (
  select sale_id,
         count(*)::integer as installment_count,
         coalesce(sum(amount),0)::numeric(12,2) as planned_amount,
         min(due_on) filter (where outstanding_amount>0 and status<>'cancelled') as next_payment_due_at
  from public.sale_payment_installment_overview
  group by sale_id
), base as (
  select s.id as sale_id,s.total_amount,s.payment_status,s.general_status,
         coalesce(e.raw_received_amount,0)::numeric(12,2) as raw_received_amount,
         coalesce(e.payment_entry_count,0)::integer as payment_entry_count,
         e.last_received_at,
         coalesce(i.installment_count,0)::integer as installment_count,
         coalesce(i.planned_amount,0)::numeric(12,2) as planned_amount,
         case when coalesce(i.installment_count,0)>0 then i.next_payment_due_at else s.payment_due_at end as next_payment_due_at
  from public.sales s
  left join entries e on e.sale_id=s.id
  left join installments i on i.sale_id=s.id
  where s.record_type='sale'
)
select
  b.sale_id,b.total_amount,
  least(b.total_amount,case when b.payment_status='received' then greatest(b.total_amount,b.raw_received_amount) else b.raw_received_amount end)::numeric(12,2) as received_amount,
  greatest(b.total_amount-least(b.total_amount,case when b.payment_status='received' then greatest(b.total_amount,b.raw_received_amount) else b.raw_received_amount end),0)::numeric(12,2) as outstanding_amount,
  case
    when b.general_status='cancelled' then 'cancelled'
    when b.payment_status='received' then 'received'
    when b.raw_received_amount>0 then 'partial'
    else 'pending'
  end as payment_state,
  b.payment_entry_count,b.installment_count,b.planned_amount,b.next_payment_due_at,b.last_received_at,
  (b.payment_status='received' and b.payment_entry_count=0) as legacy_received_without_entries
from base b;

grant select on public.sale_payment_summary to authenticated;

create or replace function public.validate_sale_payment_entry()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_installment public.sale_payment_installments%rowtype;
  v_existing numeric(12,2);
  v_sale_total numeric(12,2);
  v_sale_existing numeric(12,2);
begin
  if new.amount is null or new.amount<=0 then raise exception 'O valor recebido deve ser maior que zero'; end if;
  select total_amount into v_sale_total from public.sales where id=new.sale_id and record_type='sale';
  if not found then raise exception 'Venda do pagamento não encontrada'; end if;

  if new.installment_id is not null then
    select * into v_installment from public.sale_payment_installments where id=new.installment_id;
    if not found then raise exception 'Parcela não encontrada'; end if;
    if v_installment.sale_id<>new.sale_id then raise exception 'A parcela não pertence a esta venda'; end if;
    select coalesce(sum(amount),0)::numeric(12,2) into v_existing
      from public.sale_payment_entries
      where installment_id=new.installment_id and (tg_op='INSERT' or id<>new.id);
    if v_existing+new.amount>v_installment.amount+0.005 then raise exception 'O recebimento ultrapassa o saldo da parcela'; end if;
  end if;

  select coalesce(sum(amount),0)::numeric(12,2) into v_sale_existing
    from public.sale_payment_entries
    where sale_id=new.sale_id and (tg_op='INSERT' or id<>new.id);
  if v_sale_existing+new.amount>v_sale_total+0.005 then raise exception 'O recebimento ultrapassa o saldo total da venda'; end if;
  return new;
end;
$$;

drop trigger if exists sale_payment_entries_validate on public.sale_payment_entries;
create trigger sale_payment_entries_validate
before insert or update on public.sale_payment_entries
for each row execute function public.validate_sale_payment_entry();

create or replace function public.sync_sale_payment_state(p_sale_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_sale public.sales%rowtype;
  v_received numeric(12,2):=0;
  v_installment_count integer:=0;
  v_next_due date;
  v_method_count integer:=0;
  v_single_method text;
  v_last_received timestamptz;
  v_method text;
begin
  select * into v_sale from public.sales where id=p_sale_id and record_type='sale' for update;
  if not found or v_sale.general_status='cancelled' then return; end if;
  select coalesce(sum(amount),0)::numeric(12,2),count(distinct payment_method)::integer,min(payment_method),max(received_at)
    into v_received,v_method_count,v_single_method,v_last_received
    from public.sale_payment_entries where sale_id=p_sale_id;
  if v_received>v_sale.total_amount+0.005 then raise exception 'Os recebimentos ultrapassam o total da venda'; end if;
  select count(*)::integer,min(due_on) filter (where outstanding_amount>0 and status<>'cancelled')
    into v_installment_count,v_next_due
    from public.sale_payment_installment_overview where sale_id=p_sale_id;
  v_method:=case when v_installment_count>0 or v_method_count>1 then 'Pagamento fracionado' when v_method_count=1 then v_single_method else v_sale.payment_method end;

  if v_received>=v_sale.total_amount-0.005 then
    update public.sales set payment_status='received',paid_at=coalesce(v_last_received,paid_at,now()),payment_method=coalesce(v_method,payment_method),payment_condition='Pago',payment_due_at=null,
      general_status=case when delivery_status='delivered' then 'finalized'::public.sale_general_status else 'active'::public.sale_general_status end,updated_at=now()
    where id=p_sale_id;
  elsif v_received>0 then
    update public.sales set payment_status='receivable',paid_at=null,payment_method=coalesce(v_method,payment_method),payment_condition='Pagamento parcial',payment_due_at=coalesce(v_next_due,payment_due_at),general_status='active',updated_at=now()
    where id=p_sale_id;
  elsif v_installment_count>0 then
    update public.sales set payment_status='receivable',paid_at=null,payment_method='Pagamento fracionado',payment_condition='Pagamento dividido',payment_due_at=v_next_due,general_status='active',updated_at=now()
    where id=p_sale_id;
  elsif v_sale.payment_condition in ('Pagamento dividido','Pagamento parcial') then
    update public.sales set payment_status='receivable',paid_at=null,payment_method=null,payment_condition='A receber',payment_due_at=null,general_status='active',updated_at=now()
    where id=p_sale_id;
  end if;
end;
$$;

create or replace function public.trigger_sync_sale_payment_state()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.sync_sale_payment_state(coalesce(new.sale_id,old.sale_id));
  return coalesce(new,old);
end;
$$;

drop trigger if exists sale_payment_entries_sync_state on public.sale_payment_entries;
create trigger sale_payment_entries_sync_state after insert or update or delete on public.sale_payment_entries
for each row execute function public.trigger_sync_sale_payment_state();

drop trigger if exists sale_payment_installments_sync_state on public.sale_payment_installments;
create trigger sale_payment_installments_sync_state after insert or update or delete on public.sale_payment_installments
for each row execute function public.trigger_sync_sale_payment_state();

create or replace function public.register_sale_payment(
  p_sale_id uuid,p_amount numeric,p_received_on date,p_payment_method text,p_installment_id uuid default null,p_notes text default null
)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_sale public.sales%rowtype;
  v_outstanding numeric(12,2);
  v_remaining numeric(12,2);
  v_apply numeric(12,2);
  v_received_at timestamptz;
  v_inst record;
  v_inst_amount numeric(12,2);
  v_inst_received numeric(12,2);
  v_inst_outstanding numeric(12,2);
  v_installment_count integer;
  v_status public.payment_status;
  v_paid_at timestamptz;
  v_final_method text;
  v_allowed_methods constant text[]:=array['Pix','Dinheiro','Cartão','Link de Pagamento','Pagamento fracionado'];
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para registrar pagamentos'; end if;
  if p_received_on is null then raise exception 'Informe a data do recebimento'; end if;
  if p_payment_method is null or not(p_payment_method=any(v_allowed_methods)) then raise exception 'Forma de pagamento inválida'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Informe um valor recebido maior que zero'; end if;

  select * into v_sale from public.sales where id=p_sale_id and record_type='sale' for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  if v_sale.general_status='cancelled' then raise exception 'Venda cancelada não pode receber pagamentos'; end if;
  select outstanding_amount into v_outstanding from public.sale_payment_summary where sale_id=p_sale_id;
  if coalesce(v_outstanding,0)<=0.005 then raise exception 'Esta venda já está totalmente recebida'; end if;
  if p_amount>v_outstanding+0.005 then raise exception 'O valor informado ultrapassa o saldo de %',to_char(v_outstanding,'FM999999990D00'); end if;

  v_received_at:=(p_received_on::timestamp+interval '12 hours') at time zone 'America/Sao_Paulo';
  v_remaining:=p_amount::numeric(12,2);
  select count(*)::integer into v_installment_count from public.sale_payment_installments where sale_id=p_sale_id;

  if p_installment_id is not null then
    select i.amount,coalesce(sum(e.amount),0)::numeric(12,2)
      into v_inst_amount,v_inst_received
      from public.sale_payment_installments i
      left join public.sale_payment_entries e on e.installment_id=i.id
      where i.id=p_installment_id and i.sale_id=p_sale_id
      group by i.id,i.amount;
    if not found then raise exception 'Parcela não encontrada para esta venda'; end if;
    v_inst_outstanding:=greatest(v_inst_amount-v_inst_received,0);
    if p_amount>v_inst_outstanding+0.005 then raise exception 'O valor informado ultrapassa o saldo da parcela'; end if;
    insert into public.sale_payment_entries(sale_id,installment_id,amount,payment_method,received_at,notes)
      values(p_sale_id,p_installment_id,p_amount,p_payment_method,v_received_at,nullif(btrim(p_notes),''));
    v_remaining:=0;
  elsif v_installment_count>0 then
    for v_inst in
      select i.id,i.installment_no,greatest(i.amount-coalesce(sum(e.amount),0),0)::numeric(12,2) as outstanding_amount
      from public.sale_payment_installments i
      left join public.sale_payment_entries e on e.installment_id=i.id
      where i.sale_id=p_sale_id
      group by i.id,i.installment_no,i.amount,i.due_on
      having greatest(i.amount-coalesce(sum(e.amount),0),0)>0.005
      order by i.due_on,i.installment_no
    loop
      exit when v_remaining<=0.005;
      v_apply:=least(v_remaining,v_inst.outstanding_amount)::numeric(12,2);
      insert into public.sale_payment_entries(sale_id,installment_id,amount,payment_method,received_at,notes)
        values(p_sale_id,v_inst.id,v_apply,p_payment_method,v_received_at,concat_ws(' · ',nullif(btrim(p_notes),''),'Parcela '||v_inst.installment_no::text));
      v_remaining:=v_remaining-v_apply;
    end loop;
    if v_remaining>0.005 then raise exception 'O plano de parcelas não cobre o saldo recebido'; end if;
  else
    insert into public.sale_payment_entries(sale_id,amount,payment_method,received_at,notes)
      values(p_sale_id,p_amount,p_payment_method,v_received_at,nullif(btrim(p_notes),''));
    v_remaining:=0;
  end if;

  perform public.sync_sale_payment_state(p_sale_id);
  select payment_status,paid_at,payment_method into v_status,v_paid_at,v_final_method from public.sales where id=p_sale_id;
  if v_status='received' then
    update public.payments set status='Recebido',amount=v_sale.total_amount,payment_method=coalesce(v_final_method,p_payment_method),paid_at=v_paid_at where sale_id=p_sale_id;
  end if;
  insert into public.audit_events(entity_type,entity_id,action,details)
  values('sale',p_sale_id,'payment_entry_registered',jsonb_build_object('amount',p_amount,'received_on',p_received_on,'payment_method',p_payment_method,'installment_id',p_installment_id,'remaining_after',(select outstanding_amount from public.sale_payment_summary where sale_id=p_sale_id)));
  return p_sale_id;
end;
$$;

revoke all on function public.register_sale_payment(uuid,numeric,date,text,uuid,text) from public,anon;
grant execute on function public.register_sale_payment(uuid,numeric,date,text,uuid,text) to authenticated;

create or replace function public.mark_sale_received(p_sale_id uuid,p_received_on date,p_payment_method text)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_sale public.sales%rowtype;
  v_outstanding numeric(12,2);
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para alterar pagamentos'; end if;
  if p_received_on is null then raise exception 'Informe a data do recebimento'; end if;
  select * into v_sale from public.sales where id=p_sale_id and record_type='sale' for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  if v_sale.general_status='cancelled' then raise exception 'Venda cancelada não pode ser recebida'; end if;
  select outstanding_amount into v_outstanding from public.sale_payment_summary where sale_id=p_sale_id;
  if coalesce(v_outstanding,0)<=0.005 then return p_sale_id; end if;
  perform public.register_sale_payment(p_sale_id,v_outstanding,p_received_on,p_payment_method,null,'Quitação integral do saldo restante');
  insert into public.audit_events(entity_type,entity_id,action,details)
  values('sale',p_sale_id,'payment_received',jsonb_build_object('received_on',p_received_on,'payment_method',p_payment_method,'amount',v_outstanding,'compatibility_wrapper',true));
  return p_sale_id;
end;
$$;

create or replace function public.save_budget_quote_v3(
  p_customer_id uuid,p_location_id uuid,p_quoted_on date,p_valid_until date,p_items jsonb,p_discount_amount numeric default 0,
  p_gift_product_id uuid default null,p_gift_quantity integer default 0,p_payment_mode text default 'receivable',p_paid_on date default null,
  p_payment_method text default null,p_payment_due_on date default null,p_delivered boolean default false,p_delivered_on date default null,
  p_delivery_due_on date default null,p_schedule_post_sale boolean default true,p_post_sale_due_on date default null,p_notes text default null,
  p_partner_id uuid default null,p_existing_quote_id uuid default null,p_payment_installments jsonb default '[]'::jsonb
)
returns table(quote_id uuid,lead_id uuid) language plpgsql security definer set search_path=public as $$
declare
  v_quote_id uuid;v_lead_id uuid;v_total numeric(12,2);v_plan_total numeric(12,2):=0;v_plan_count integer:=0;v_due_count integer:=0;
  v_min_due date;v_invalid_methods integer:=0;v_base_mode text;v_base_method text;v_base_due date;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para registrar orçamentos'; end if;
  if p_payment_mode not in ('receivable','paid','combined','split') then raise exception 'Situação do pagamento inválida'; end if;

  if p_payment_mode='split' then
    if p_payment_installments is null or jsonb_typeof(p_payment_installments)<>'array' then raise exception 'Informe as parcelas do pagamento dividido'; end if;
    select count(*)::integer,coalesce(sum((x.value->>'amount')::numeric),0)::numeric(12,2),count((x.value->>'due_on')::date)::integer,min((x.value->>'due_on')::date),
      count(*) filter (where nullif(btrim(x.value->>'planned_payment_method'),'') is not null and (x.value->>'planned_payment_method')<>all(array['Pix','Dinheiro','Cartão','Link de Pagamento','Pagamento fracionado']))::integer
      into v_plan_count,v_plan_total,v_due_count,v_min_due,v_invalid_methods
      from jsonb_array_elements(p_payment_installments) with ordinality x(value,ord);
    if v_plan_count<2 then raise exception 'Pagamento dividido precisa de pelo menos duas parcelas'; end if;
    if v_due_count<>v_plan_count then raise exception 'Todas as parcelas precisam de uma data de vencimento'; end if;
    if v_plan_total<=0 then raise exception 'Informe valores válidos para as parcelas'; end if;
    if exists(select 1 from jsonb_array_elements(p_payment_installments) x where coalesce((x->>'amount')::numeric,0)<=0) then raise exception 'Cada parcela precisa ter valor maior que zero'; end if;
    if v_invalid_methods>0 then raise exception 'Forma de pagamento prevista inválida em uma das parcelas'; end if;
    v_base_mode:='combined';v_base_method:='Pagamento fracionado';v_base_due:=v_min_due;
  else
    v_base_mode:=p_payment_mode;v_base_method:=p_payment_method;v_base_due:=p_payment_due_on;
  end if;

  select r.quote_id,r.lead_id into v_quote_id,v_lead_id
  from public.save_budget_quote_v2(
    p_customer_id=>p_customer_id,p_location_id=>p_location_id,p_quoted_on=>p_quoted_on,p_valid_until=>p_valid_until,p_items=>p_items,
    p_discount_amount=>p_discount_amount,p_gift_product_id=>p_gift_product_id,p_gift_quantity=>p_gift_quantity,p_payment_mode=>v_base_mode,
    p_paid_on=>p_paid_on,p_payment_method=>v_base_method,p_payment_due_on=>v_base_due,p_delivered=>p_delivered,p_delivered_on=>p_delivered_on,
    p_delivery_due_on=>p_delivery_due_on,p_schedule_post_sale=>p_schedule_post_sale,p_post_sale_due_on=>p_post_sale_due_on,p_notes=>p_notes,
    p_partner_id=>p_partner_id,p_existing_quote_id=>p_existing_quote_id
  ) r;
  if v_quote_id is null then raise exception 'Não foi possível identificar o orçamento salvo'; end if;
  delete from public.sales_quote_payment_installments where quote_id=v_quote_id;

  if p_payment_mode='split' then
    select total_amount into v_total from public.sales_quotes where id=v_quote_id;
    if abs(v_plan_total-v_total)>0.005 then raise exception 'A soma das parcelas (%) precisa ser igual ao total do orçamento (%)',to_char(v_plan_total,'FM999999990D00'),to_char(v_total,'FM999999990D00'); end if;
    insert into public.sales_quote_payment_installments(quote_id,installment_no,amount,due_on,planned_payment_method,notes)
    select v_quote_id,x.ord::integer,(x.value->>'amount')::numeric(12,2),(x.value->>'due_on')::date,nullif(btrim(x.value->>'planned_payment_method'),''),nullif(btrim(x.value->>'notes'),'')
    from jsonb_array_elements(p_payment_installments) with ordinality x(value,ord) order by x.ord;
    update public.sales_quotes set payment_mode='split',payment_method='Pagamento fracionado',payment_due_on=v_min_due,paid_on=null,updated_at=now() where id=v_quote_id;
    if v_lead_id is not null then
      update public.sales set payment_method='Pagamento fracionado',payment_condition='Pagamento dividido',payment_due_at=v_min_due,updated_at=now() where id=v_lead_id and record_type='lead';
    end if;
  end if;
  return query select v_quote_id,v_lead_id;
end;
$$;

revoke all on function public.save_budget_quote_v3(uuid,uuid,date,date,jsonb,numeric,uuid,integer,text,date,text,date,boolean,date,date,boolean,date,text,uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_budget_quote_v3(uuid,uuid,date,date,jsonb,numeric,uuid,integer,text,date,text,date,boolean,date,date,boolean,date,text,uuid,uuid,jsonb) to authenticated;

create or replace function public.confirm_budget_quote_v3(p_quote_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_q public.sales_quotes%rowtype;v_sale_id uuid;v_plan_count integer;v_plan_total numeric(12,2);v_min_due date;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para confirmar orçamentos'; end if;
  select * into v_q from public.sales_quotes where id=p_quote_id for update;
  if not found then raise exception 'Orçamento não encontrado'; end if;
  if v_q.status='confirmed' and v_q.sale_id is not null then return v_q.sale_id; end if;
  if v_q.payment_mode<>'split' then return public.confirm_budget_quote_v2_core(p_quote_id); end if;
  select count(*)::integer,coalesce(sum(amount),0)::numeric(12,2),min(due_on) into v_plan_count,v_plan_total,v_min_due
    from public.sales_quote_payment_installments where quote_id=p_quote_id;
  if v_plan_count<2 then raise exception 'O pagamento dividido não possui pelo menos duas parcelas'; end if;
  if abs(v_plan_total-v_q.total_amount)>0.005 then raise exception 'A soma das parcelas não corresponde ao total do orçamento'; end if;
  update public.sales_quotes set payment_mode='combined',payment_method='Pagamento fracionado',payment_due_on=v_min_due,paid_on=null,updated_at=now() where id=p_quote_id;
  v_sale_id:=public.confirm_budget_quote_v2_core(p_quote_id);
  update public.sales_quotes set payment_mode='split',payment_method='Pagamento fracionado',payment_due_on=v_min_due,updated_at=now() where id=p_quote_id;
  insert into public.sale_payment_installments(sale_id,source_quote_installment_id,installment_no,amount,due_on,planned_payment_method,notes)
    select v_sale_id,id,installment_no,amount,due_on,planned_payment_method,notes from public.sales_quote_payment_installments where quote_id=p_quote_id order by installment_no;
  perform public.sync_sale_payment_state(v_sale_id);
  insert into public.audit_events(entity_type,entity_id,action,details)
    values('sale',v_sale_id,'split_payment_plan_created',jsonb_build_object('quote_id',p_quote_id,'installment_count',v_plan_count,'total_amount',v_plan_total,'first_due_on',v_min_due));
  return v_sale_id;
end;
$$;

revoke all on function public.confirm_budget_quote_v3(uuid) from public,anon;
grant execute on function public.confirm_budget_quote_v3(uuid) to authenticated;

create or replace function public.confirm_budget_quote_v2(p_quote_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para confirmar orçamentos'; end if;
  return public.confirm_budget_quote_v3(p_quote_id);
end;
$$;

create or replace view public.supplement_sale_receivable_schedule
with (security_invoker = true)
as
select ('installment:'||i.id::text)::text as receivable_key,i.sale_id,i.id as installment_id,i.installment_no,i.installment_count,
       i.outstanding_amount::numeric(12,2) as amount,i.due_on as due_date,true as has_explicit_due
from public.sale_payment_installment_overview i
join public.sales s on s.id=i.sale_id
where s.record_type='sale' and s.general_status<>'cancelled' and i.outstanding_amount>0.005
union all
select ('sale:'||s.id::text)::text,s.id,null::uuid,null::integer,0::integer,ps.outstanding_amount::numeric(12,2),
       coalesce(ps.next_payment_due_at,s.payment_due_at,s.quoted_at::date)::date,(s.payment_due_at is not null)
from public.sales s
join public.sale_payment_summary ps on ps.sale_id=s.id
where s.record_type='sale' and s.general_status<>'cancelled' and ps.outstanding_amount>0.005 and ps.installment_count=0;

grant select on public.supplement_sale_receivable_schedule to authenticated;
