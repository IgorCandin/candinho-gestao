begin;

-- V38 · Homologação final de consistência operacional.
-- Aplicada diretamente no Supabase em produção.
--
-- Corrige:
-- 1. mês comercial usando calendário America/Sao_Paulo;
-- 2. datas de hoje/atrasado do Bank usando o dia real do Brasil;
-- 3. pagamentos/recebimentos do Bank sem data explícita usando o dia local;
-- 4. contagem completa das prioridades da Central, mantendo listas em top 20;
-- 5. agenda "hoje" da Central respeitando America/Sao_Paulo.

create or replace view public.commercial_dashboard_summary
with (security_invoker = true)
as
with commercial as (
  select * from public.commercial_sales
),
period_bounds as (
  select
    date_trunc('month', now() at time zone 'America/Sao_Paulo')::date as current_month_start,
    (date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month')::date as next_month_start,
    (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 month')::date as previous_month_start
),
stock as (
  select
    coalesce(sum(sb.quantity) filter (where p.active),0)::bigint as operational_units,
    coalesce(sum(sb.quantity),0)::bigint as all_units,
    coalesce(sum(sb.quantity::numeric * p.cost_price) filter (where p.active),0)::numeric(12,2) as stock_cost_value,
    coalesce(sum(sb.quantity::numeric * p.sale_price) filter (where p.active),0)::numeric(12,2) as stock_sale_value
  from public.stock_balances sb
  join public.products p on p.id=sb.product_id
  join public.locations l on l.id=sb.location_id
  where l.active and l.tracks_inventory
)
select
  count(*)::integer as total_sales,
  coalesce(sum(commercial.total_amount),0)::numeric(12,2) as total_revenue,
  coalesce(sum(commercial.total_profit),0)::numeric(12,2) as total_profit,
  coalesce(sum(commercial.total_amount) filter(where commercial.paid_at is null),0)::numeric(12,2) as receivable_total,
  count(*) filter(where commercial.paid_at is null)::integer as receivable_sales,
  count(*) filter(where commercial.delivered_at::date>=b.current_month_start and commercial.delivered_at::date<b.next_month_start)::integer as current_month_sales,
  coalesce(sum(commercial.total_amount) filter(where commercial.delivered_at::date>=b.current_month_start and commercial.delivered_at::date<b.next_month_start),0)::numeric(12,2) as current_month_revenue,
  coalesce(sum(commercial.total_profit) filter(where commercial.delivered_at::date>=b.current_month_start and commercial.delivered_at::date<b.next_month_start),0)::numeric(12,2) as current_month_profit,
  count(*) filter(where commercial.delivered_at::date>=b.previous_month_start and commercial.delivered_at::date<b.current_month_start)::integer as previous_month_sales,
  coalesce(sum(commercial.total_amount) filter(where commercial.delivered_at::date>=b.previous_month_start and commercial.delivered_at::date<b.current_month_start),0)::numeric(12,2) as previous_month_revenue,
  coalesce(sum(commercial.total_profit) filter(where commercial.delivered_at::date>=b.previous_month_start and commercial.delivered_at::date<b.current_month_start),0)::numeric(12,2) as previous_month_profit,
  st.operational_units,
  st.all_units,
  st.stock_cost_value,
  st.stock_sale_value,
  (st.stock_sale_value-st.stock_cost_value)::numeric(12,2) as stock_potential_profit
from commercial
cross join period_bounds b
cross join stock st
group by b.current_month_start,b.next_month_start,b.previous_month_start,st.operational_units,st.all_units,st.stock_cost_value,st.stock_sale_value;

create or replace view public.bank_charges_overview
with (security_invoker = true)
as
select
  c.id,c.title,c.description,c.amount,c.paid_amount,c.due_date,c.status,c.category,c.origin,c.charge_type,c.source_id,c.card_invoice_id,c.payment_account_id,c.paid_on,c.notes,c.created_by,c.updated_by,c.created_at,c.updated_at,
  greatest(c.amount-c.paid_amount,0)::numeric(14,2) as remaining_amount,
  case
    when c.status='cancelled' then 'cancelled'
    when c.status='paid' or c.paid_amount>=c.amount then 'paid'
    when c.paid_amount>0 then 'partial'
    when c.due_date < (now() at time zone 'America/Sao_Paulo')::date then 'overdue'
    else 'pending'
  end as effective_status,
  a.name as payment_account_name,
  i.reference_month as invoice_reference_month,
  bc.name as card_name
from public.bank_charges c
left join public.bank_accounts a on a.id=c.payment_account_id
left join public.bank_card_invoices i on i.id=c.card_invoice_id
left join public.bank_cards bc on bc.id=i.card_id;

create or replace view public.bank_receivables_overview
with (security_invoker = true)
as
select
  r.id,r.title,r.payer_name,r.description,r.amount,r.received_amount,r.due_date,r.status,r.category,r.origin,r.source_type,r.source_id,r.receiving_account_id,r.received_on,r.notes,r.created_by,r.updated_by,r.created_at,r.updated_at,
  greatest(r.amount-r.received_amount,0)::numeric(14,2) as remaining_amount,
  case
    when r.status='cancelled' then 'cancelled'
    when r.status='received' or r.received_amount>=r.amount then 'received'
    when r.received_amount>0 then 'partial'
    when r.due_date < (now() at time zone 'America/Sao_Paulo')::date then 'overdue'
    else 'pending'
  end as effective_status,
  a.name as receiving_account_name
from public.bank_receivables r
left join public.bank_accounts a on a.id=r.receiving_account_id;

create or replace view public.bank_debts_overview
with (security_invoker = true)
as
select
  d.id,d.name,d.debt_type,d.creditor_name,d.original_amount,d.monthly_amount,d.total_paid,d.start_date,d.next_due_date,d.due_day,d.interest_free,d.origin,d.status,d.notes,d.created_by,d.updated_by,d.created_at,d.updated_at,
  greatest(d.original_amount-d.total_paid,0)::numeric(14,2) as remaining_amount,
  case
    when d.status='cancelled' then 'cancelled'
    when d.total_paid>=d.original_amount then 'paid'
    when d.status='paused' then 'paused'
    when d.due_mode='month_only'
      and d.next_due_date is not null
      and date_trunc('month',d.next_due_date)::date
        < date_trunc('month',(now() at time zone 'America/Sao_Paulo')::date)::date
      then 'overdue'
    when d.due_mode='fixed_day'
      and d.next_due_date is not null
      and d.next_due_date < (now() at time zone 'America/Sao_Paulo')::date
      then 'overdue'
    else 'active'
  end as effective_status,
  d.due_mode
from public.bank_debts d;

create or replace view public.bank_subscriptions_overview
with (security_invoker = true)
as
select
  s.id,s.name,s.provider,s.amount,s.billing_cycle,s.billing_day,s.starts_on,s.ends_on,s.category,s.origin,s.payment_method_type,s.card_id,s.account_id,s.include_in_projection,s.projection_mode,s.is_active,s.notes,s.created_by,s.updated_by,s.created_at,s.updated_at,
  c.name as card_name,
  a.name as account_name,
  case
    when s.payment_method_type='card' then c.name
    when s.payment_method_type='account' then a.name
    when s.payment_method_type='cash' then 'Dinheiro'
    else 'Outro'
  end as payment_source_name,
  case
    when not s.is_active then 'inactive'
    when s.ends_on is not null and s.ends_on < (now() at time zone 'America/Sao_Paulo')::date then 'ended'
    when s.starts_on is not null and s.starts_on > (now() at time zone 'America/Sao_Paulo')::date then 'scheduled'
    else 'active'
  end as effective_status
from public.bank_subscriptions s
left join public.bank_cards c on c.id=s.card_id
left join public.bank_accounts a on a.id=s.account_id;

create or replace view public.bank_dashboard_summary
with (security_invoker = true)
as
with brazil_today as (
  select (now() at time zone 'America/Sao_Paulo')::date as today
),
latest_balances as (
  select distinct on(s.account_id) s.account_id,s.balance,s.balance_date
  from public.bank_balance_snapshots s
  join public.bank_accounts a on a.id=s.account_id
  where a.is_active=true
  order by s.account_id,s.balance_date desc,s.created_at desc
),
charge_totals as (
  select
    coalesce(sum(greatest(c.amount-c.paid_amount,0)) filter(
      where c.status not in('cancelled','paid')
        and c.charge_type<>'card_invoice'
        and date_trunc('month',c.due_date)::date=date_trunc('month',bt.today)::date
    ),0)::numeric(14,2) as due_this_month,
    coalesce(sum(greatest(c.amount-c.paid_amount,0)) filter(
      where c.status not in('cancelled','paid')
        and c.charge_type<>'card_invoice'
        and c.due_date<bt.today
    ),0)::numeric(14,2) as overdue_total,
    coalesce(sum(greatest(c.amount-c.paid_amount,0)) filter(
      where c.status not in('cancelled','paid')
        and c.charge_type<>'card_invoice'
        and c.due_date>=bt.today
        and c.due_date<bt.today+30
    ),0)::numeric(14,2) as next_30_days
  from public.bank_charges c cross join brazil_today bt
),
receivable_totals as (
  select
    coalesce(sum(greatest(r.amount-r.received_amount,0)) filter(
      where r.status not in('cancelled','received')
        and date_trunc('month',r.due_date)::date=date_trunc('month',bt.today)::date
    ),0)::numeric(14,2) as receivable_this_month,
    coalesce(sum(greatest(r.amount-r.received_amount,0)) filter(
      where r.status not in('cancelled','received')
        and r.due_date<bt.today
    ),0)::numeric(14,2) as receivable_overdue,
    coalesce(sum(greatest(r.amount-r.received_amount,0)) filter(
      where r.status not in('cancelled','received')
        and r.due_date>=bt.today
        and r.due_date<bt.today+30
    ),0)::numeric(14,2) as receivable_next_30_days
  from public.bank_receivables r cross join brazil_today bt
),
invoice_totals as (
  select coalesce(sum(i.amount) filter(
    where i.amount is not null
      and i.status not in('paid','cancelled')
      and date_trunc('month',i.reference_month)::date=date_trunc('month',bt.today)::date
  ),0)::numeric(14,2) as invoices_this_month
  from public.bank_card_invoices i cross join brazil_today bt
),
debt_totals as (
  select coalesce(sum(greatest(d.original_amount-d.total_paid,0)) filter(
    where d.status in('active','paused')
  ),0)::numeric(14,2) as total_debt_remaining
  from public.bank_debts d
)
select
  coalesce((select sum(lb.balance) from latest_balances lb),0)::numeric(14,2) as total_balance,
  (select max(lb.balance_date) from latest_balances lb) as latest_balance_date,
  ct.due_this_month,ct.overdue_total,ct.next_30_days,it.invoices_this_month,dt.total_debt_remaining,
  (coalesce((select sum(lb.balance) from latest_balances lb),0)-ct.due_this_month-it.invoices_this_month)::numeric(14,2) as balance_after_current_month_commitments,
  rt.receivable_this_month,rt.receivable_overdue,rt.receivable_next_30_days,
  (coalesce((select sum(lb.balance) from latest_balances lb),0)+rt.receivable_this_month-ct.due_this_month-it.invoices_this_month)::numeric(14,2) as projected_balance_after_current_month
from charge_totals ct
cross join receivable_totals rt
cross join invoice_totals it
cross join debt_totals dt;

create or replace function public.bank_mark_charge_paid(
  p_charge_id uuid,
  p_paid_on date default null,
  p_payment_account_id uuid default null
)
returns public.bank_charges
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_charge public.bank_charges;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.can_write_bank() then
    raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode='42501';
  end if;

  update public.bank_charges
  set
    paid_amount=amount,
    status='paid',
    paid_on=coalesce(p_paid_on,v_today),
    payment_account_id=coalesce(p_payment_account_id,payment_account_id),
    updated_by=auth.uid(),
    updated_at=now()
  where id=p_charge_id
    and status<>'cancelled'
  returning * into v_charge;

  if v_charge.id is null then
    raise exception 'Cobrança não encontrada ou cancelada';
  end if;

  if v_charge.card_invoice_id is not null then
    update public.bank_card_invoices
    set
      status='paid',
      paid_on=coalesce(p_paid_on,v_today),
      updated_by=auth.uid(),
      updated_at=now()
    where id=v_charge.card_invoice_id
      and status<>'cancelled';
  end if;

  return v_charge;
end;
$function$;

create or replace function public.bank_mark_invoice_paid(
  p_invoice_id uuid,
  p_paid_on date default null
)
returns public.bank_card_invoices
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_invoice public.bank_card_invoices;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.can_write_bank() then
    raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank'
      using errcode='42501';
  end if;

  update public.bank_card_invoices
  set
    status='paid',
    paid_on=coalesce(p_paid_on,v_today),
    updated_by=auth.uid(),
    updated_at=now()
  where id=p_invoice_id
    and status<>'cancelled'
  returning * into v_invoice;

  if v_invoice.id is null then
    raise exception 'Fatura não encontrada ou cancelada';
  end if;

  update public.bank_charges
  set
    paid_amount=amount,
    status='paid',
    paid_on=coalesce(p_paid_on,v_today),
    updated_by=auth.uid(),
    updated_at=now()
  where card_invoice_id=p_invoice_id
    and status<>'cancelled';

  return v_invoice;
end;
$function$;

create or replace function public.bank_pay_debt_installment(
  p_debt_id uuid,
  p_amount numeric default null,
  p_paid_on date default null,
  p_payment_account_id uuid default null,
  p_notes text default null
)
returns public.bank_debts
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_debt public.bank_debts;
  v_amount numeric(14,2);
  v_old_due date;
  v_new_due date;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.can_write_bank() then
    raise exception 'Sem permissão para alterar dados da Candinho Bank';
  end if;

  select * into v_debt
  from public.bank_debts
  where id=p_debt_id
  for update;

  if v_debt.id is null or v_debt.status in('paid','cancelled') then
    raise exception 'Dívida não encontrada ou indisponível para pagamento';
  end if;

  v_amount:=coalesce(
    p_amount,
    v_debt.monthly_amount,
    v_debt.original_amount-v_debt.total_paid
  );

  if v_amount is null or v_amount<=0 then
    raise exception 'Informe um valor válido para o pagamento';
  end if;

  v_amount:=least(
    v_amount,
    v_debt.original_amount-v_debt.total_paid
  );

  v_old_due:=v_debt.next_due_date;
  v_new_due:=case
    when v_old_due is null then null
    else (v_old_due+interval '1 month')::date
  end;

  update public.bank_debts
  set
    total_paid=total_paid+v_amount,
    next_due_date=case
      when total_paid+v_amount>=original_amount then null
      else v_new_due
    end,
    status=case
      when total_paid+v_amount>=original_amount then 'paid'
      else 'active'
    end,
    updated_by=auth.uid()
  where id=p_debt_id
  returning * into v_debt;

  insert into public.bank_debt_payments(
    debt_id,due_date,action_type,amount,paid_on,
    previous_due_date,new_due_date,payment_account_id,
    notes,created_by
  )
  values(
    p_debt_id,v_old_due,'paid',v_amount,
    coalesce(p_paid_on,v_today),
    v_old_due,v_debt.next_due_date,
    p_payment_account_id,p_notes,auth.uid()
  );

  return v_debt;
end;
$function$;

create or replace function public.bank_receive_receivable(
  p_receivable_id uuid,
  p_amount numeric default null,
  p_received_on date default null,
  p_receiving_account_id uuid default null
)
returns public.bank_receivables
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_receivable public.bank_receivables;
  v_remaining numeric(14,2);
  v_receive numeric(14,2);
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.can_write_bank() then
    raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank';
  end if;

  select * into v_receivable
  from public.bank_receivables
  where id=p_receivable_id
  for update;

  if v_receivable.id is null
     or v_receivable.status='cancelled' then
    raise exception 'Conta a receber não encontrada ou cancelada';
  end if;

  v_remaining:=greatest(
    v_receivable.amount-v_receivable.received_amount,
    0
  );

  v_receive:=coalesce(
    p_amount,
    v_remaining
  );

  if v_receive<=0
     or v_receive>v_remaining then
    raise exception 'Valor de recebimento inválido';
  end if;

  update public.bank_receivables
  set
    received_amount=received_amount+v_receive,
    status=case
      when received_amount+v_receive>=amount then 'received'
      else 'partial'
    end,
    received_on=coalesce(p_received_on,v_today),
    receiving_account_id=coalesce(
      p_receiving_account_id,
      receiving_account_id
    ),
    updated_by=auth.uid()
  where id=p_receivable_id
  returning * into v_receivable;

  return v_receivable;
end;
$function$;

create or replace function public.bank_mark_commitment_paid(
  p_commitment_key text,
  p_reference_month date
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid:=auth.uid();
  v_key text:=nullif(btrim(p_commitment_key),'');
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if v_user is null then
    raise exception 'Sessão não encontrada.'
      using errcode='42501';
  end if;

  if not public.can_write_bank() then
    raise exception 'Seu usuário não possui permissão para alterar dados da Candinho Bank.'
      using errcode='42501';
  end if;

  if v_key is null or position(':' in v_key)=0 then
    raise exception 'Compromisso inválido.';
  end if;

  if p_reference_month is null
     or p_reference_month<>date_trunc(
       'month',
       p_reference_month::timestamp
     )::date then
    raise exception 'Mês de referência inválido.';
  end if;

  insert into public.bank_month_commitment_resolutions(
    commitment_key,reference_month,resolution,
    resolved_on,created_by,updated_at
  )
  values(
    v_key,p_reference_month,'paid',
    v_today,v_user,now()
  )
  on conflict(commitment_key,reference_month)
  do update set
    resolution='paid',
    resolved_on=v_today,
    created_by=v_user,
    updated_at=now();
end;
$function$;

create or replace function public.central_daily_priorities_snapshot()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_tasks jsonb:='[]'::jsonb;
  v_conversations jsonb:='[]'::jsonb;
  v_radar jsonb:='[]'::jsonb;
  v_inventory jsonb:='[]'::jsonb;
  v_partners jsonb:=jsonb_build_object(
    'summary',
    jsonb_build_object(
      'ready',0,
      'attention',0,
      'total',0
    ),
    'items',
    '[]'::jsonb
  );
  v_integrations jsonb:='[]'::jsonb;
  v_task_count integer:=0;
  v_conversation_count integer:=0;
  v_radar_count integer:=0;
  v_inventory_count integer:=0;
  v_partner_attention integer:=0;
  v_integration_attention integer:=0;
begin
  if not (
    public.central_can_access_scope('company')
    or public.current_user_role()='admin'
  ) then
    raise exception 'Acesso negado';
  end if;

  select count(*)::integer
  into v_task_count
  from public.operational_tasks t
  where t.status='pending'
    and public.central_can_access_scope(t.operation_scope)
    and t.due_at<=now()+interval '7 days';

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by x.sort_rank,x.due_at
    ),
    '[]'::jsonb
  )
  into v_tasks
  from (
    select
      t.id,t.title,t.category,t.due_at,t.priority,
      t.status,t.operation_scope,t.central_contact_id,
      c.display_name as contact_name,
      coalesce(p.full_name,p.email) as assigned_name,
      case
        when t.due_at<now() then 0
        when (t.due_at at time zone 'America/Sao_Paulo')::date
          =(now() at time zone 'America/Sao_Paulo')::date then 1
        else 2
      end sort_rank
    from public.operational_tasks t
    left join public.central_contacts c
      on c.id=t.central_contact_id
    left join public.profiles p
      on p.id=t.assigned_to
    where t.status='pending'
      and public.central_can_access_scope(t.operation_scope)
      and t.due_at<=now()+interval '7 days'
    order by sort_rank,t.due_at
    limit 20
  ) x;

  -- Inbox pausado: mantém o contrato JSON,
  -- mas não entra na fila operacional.
  v_conversations:='[]'::jsonb;
  v_conversation_count:=0;

  if public.can_access_operation('supplements') then
    select count(*)::integer
    into v_radar_count
    from public.customer_opportunity_radar_v3
    where is_priority_opportunity;

    select coalesce(
      jsonb_agg(
        to_jsonb(x)
        order by
          case x.opportunity_priority
            when 'Alta' then 1
            when 'Média' then 2
            else 3
          end,
          x.opportunity_score desc
      ),
      '[]'::jsonb
    )
    into v_radar
    from (
      select
        customer_id,customer_name,phone,city,
        last_product_name,days_to_repurchase,
        opportunity_priority,opportunity_label,
        recommended_action,priority_source,
        opportunity_score
      from public.customer_opportunity_radar_v3
      where is_priority_opportunity
      order by
        case opportunity_priority
          when 'Alta' then 1
          when 'Média' then 2
          else 3
        end,
        opportunity_score desc
      limit 20
    ) x;

    select count(*)::integer
    into v_inventory_count
    from public.inventory_workspace_attention;

    select coalesce(
      jsonb_agg(
        to_jsonb(x)
        order by x.status,x.title
      ),
      '[]'::jsonb
    )
    into v_inventory
    from (
      select
        attention_type,entity_id,title,status,details
      from public.inventory_workspace_attention
      order by status,title
      limit 20
    ) x;
  end if;

  if public.can_manage_users()
     or public.current_user_role()='admin' then
    v_partners:=public.partner_portal_health_snapshot();

    v_partner_attention:=coalesce(
      (
        v_partners
        ->'summary'
        ->>'attention'
      )::integer,
      0
    );

    select
      coalesce(
        jsonb_agg(
          to_jsonb(x)
          order by x.health_status,x.provider
        ),
        '[]'::jsonb
      ),
      count(*) filter(
        where health_status not in(
          'healthy',
          'connected'
        )
      )::integer
    into
      v_integrations,
      v_integration_attention
    from (
      select
        provider,operation_scope,account_name,status,
        last_sync_at,last_error,health_status,
        failed_events,pending_events
      from public.central_integration_health
    ) x;
  end if;

  return jsonb_build_object(
    'generated_at',
    now(),
    'summary',
    jsonb_build_object(
      'tasks',
      v_task_count,
      'conversations',
      v_conversation_count,
      'radar',
      v_radar_count,
      'inventory',
      v_inventory_count,
      'partner_attention',
      v_partner_attention,
      'integration_attention',
      v_integration_attention,
      'total',
      v_task_count
        +v_conversation_count
        +v_radar_count
        +v_inventory_count
        +v_partner_attention
        +v_integration_attention
    ),
    'tasks',
    v_tasks,
    'conversations',
    v_conversations,
    'radar',
    v_radar,
    'inventory',
    v_inventory,
    'partners',
    v_partners,
    'integrations',
    v_integrations
  );
end;
$function$;

create or replace function public.central_alerts_snapshot()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_unread integer:=0;
  v_pending integer:=0;
  v_overdue integer:=0;
  v_today integer:=0;
  v_inventory_locations integer:=0;
  v_inventory_products integer:=0;
  v_integrations integer:=0;
  v_media_pending integer:=0;
  v_partner_without_portal integer:=0;
  v_items jsonb:='[]'::jsonb;
  v_critical integer:=0;
  v_attention integer:=0;
  v_info integer:=0;
begin
  if not (
    public.current_user_role()='admin'
    or public.can_access_operation('supplements')
    or public.can_access_operation('fitness')
    or public.can_access_marketing()
  ) then
    raise exception 'Acesso negado';
  end if;

  select
    coalesce(sum(unread_count),0)::integer,
    count(*) filter(where status='pending')::integer
  into v_unread,v_pending
  from public.central_conversations
  where public.central_can_access_scope(operation_scope);

  select
    count(*) filter(
      where status in('planned','pending')
        and due_at<now()
    )::integer,
    count(*) filter(
      where status in('planned','pending')
        and (due_at at time zone 'America/Sao_Paulo')::date
          =(now() at time zone 'America/Sao_Paulo')::date
    )::integer
  into v_overdue,v_today
  from public.operational_tasks
  where public.central_can_access_scope(operation_scope);

  if public.can_access_operation('supplements') then
    select
      count(*) filter(
        where a.attention_type='location'
          and coalesce(r.review_status,'open')<>'resolved'
      )::integer,
      count(*) filter(
        where a.attention_type='product'
          and coalesce(r.review_status,'open')<>'resolved'
      )::integer
    into
      v_inventory_locations,
      v_inventory_products
    from public.inventory_workspace_attention a
    left join public.inventory_reconciliation_reviews r
      on r.attention_type=a.attention_type
     and r.entity_id=a.entity_id
     and r.issue_code=a.status;
  end if;

  if public.can_manage_users()
     or public.current_user_role()='admin' then
    select count(*)::integer
    into v_integrations
    from public.central_integration_health h
    where coalesce(
      h.health_status,
      h.status,
      ''
    )<>'healthy';

    select count(*)::integer
    into v_partner_without_portal
    from public.partners p
    where coalesce(p.active,true)
      and p.partner_type<>'supplier'
      and not exists(
        select 1
        from public.partner_user_links l
        where l.partner_id=p.id
          and l.active=true
      );
  end if;

  select count(*)::integer
  into v_media_pending
  from public.central_media_assets m
  where public.central_can_access_scope(m.operation_scope)
    and m.description_ai is null;

  if v_overdue>0 then
    v_items:=v_items||jsonb_build_array(
      jsonb_build_object(
        'key','overdue_tasks',
        'severity','critical',
        'category','agenda',
        'title','Tarefas atrasadas',
        'description',v_overdue||' tarefa(s) passaram do prazo e ainda estão abertas.',
        'count',v_overdue,
        'href','/central/pendencias'
      )
    );
    v_critical:=v_critical+1;
  end if;

  if v_unread>0 then
    v_items:=v_items||jsonb_build_array(
      jsonb_build_object(
        'key','unread_messages',
        'severity','critical',
        'category','inbox',
        'title','Mensagens não lidas',
        'description',v_unread||' mensagem(ns) aguardando leitura.',
        'count',v_unread,
        'href','/central/inbox'
      )
    );
    v_critical:=v_critical+1;
  end if;

  if v_inventory_locations>0 then
    v_items:=v_items||jsonb_build_array(
      jsonb_build_object(
        'key','inventory_locations',
        'severity','critical',
        'category','inventory',
        'title','Pontos de estoque para conferir',
        'description',v_inventory_locations||' local(is) exigem conferência humana.',
        'count',v_inventory_locations,
        'href','/estoque/reconciliacao'
      )
    );
    v_critical:=v_critical+1;
  end if;

  if v_integrations>0 then
    v_items:=v_items||jsonb_build_array(
      jsonb_build_object(
        'key','integration_health',
        'severity','critical',
        'category','integration',
        'title','Integrações exigindo atenção',
        'description',v_integrations||' integração(ões) estão desconectadas, sem sincronizar ou com erro.',
        'count',v_integrations,
        'href','/central/governanca'
      )
    );
    v_critical:=v_critical+1;
  end if;

  if v_pending>0 then
    v_items:=v_items||jsonb_build_array(
      jsonb_build_object(
        'key','pending_conversations',
        'severity','attention',
        'category','inbox',
        'title','Atendimentos pendentes',
        'description',v_pending||' conversa(s) marcadas para retorno.',
        'count',v_pending,
        'href','/central/inbox?status=pending'
      )
    );
    v_attention:=v_attention+1;
  end if;

  if v_inventory_products>0 then
    v_items:=v_items||jsonb_build_array(
      jsonb_build_object(
        'key','inventory_products',
        'severity','attention',
        'category','inventory',
        'title','Produtos em atenção',
        'description',v_inventory_products||' produto(s) estão zerados, abaixo da meta ou exigem revisão.',
        'count',v_inventory_products,
        'href','/estoque/reconciliacao'
      )
    );
    v_attention:=v_attention+1;
  end if;

  if v_today>0 then
    v_items:=v_items||jsonb_build_array(
      jsonb_build_object(
        'key','today_tasks',
        'severity','info',
        'category','agenda',
        'title','Agenda de hoje',
        'description',v_today||' tarefa(s) programadas para hoje.',
        'count',v_today,
        'href','/central/agenda'
      )
    );
    v_info:=v_info+1;
  end if;

  if v_media_pending>0 then
    v_items:=v_items||jsonb_build_array(
      jsonb_build_object(
        'key','media_pending_ai',
        'severity','info',
        'category','media',
        'title','Mídias aguardando classificação',
        'description',v_media_pending||' arquivo(s) ainda não foram classificados pelo Nexus.',
        'count',v_media_pending,
        'href','/central/midia?ai=pending'
      )
    );
    v_info:=v_info+1;
  end if;

  if v_partner_without_portal>0 then
    v_items:=v_items||jsonb_build_array(
      jsonb_build_object(
        'key','partner_without_portal',
        'severity','info',
        'category','partner',
        'title','Parceiros sem Portal ativo',
        'description',v_partner_without_portal||' parceiro(s) ainda não possuem acesso ativo ao Portal.',
        'count',v_partner_without_portal,
        'href','/parceiros/gerencial'
      )
    );
    v_info:=v_info+1;
  end if;

  return jsonb_build_object(
    'summary',
    jsonb_build_object(
      'total',
      v_critical+v_attention+v_info,
      'critical',
      v_critical,
      'attention',
      v_attention,
      'info',
      v_info
    ),
    'items',
    v_items
  );
end;
$function$;

grant select
on public.commercial_dashboard_summary
to authenticated,service_role;

grant select
on public.bank_charges_overview
to authenticated,service_role;

grant select
on public.bank_receivables_overview
to authenticated,service_role;

grant select
on public.bank_debts_overview
to authenticated,service_role;

grant select
on public.bank_subscriptions_overview
to authenticated,service_role;

grant select
on public.bank_dashboard_summary
to authenticated,service_role;

revoke all
on public.commercial_dashboard_summary
from anon;

revoke all
on public.bank_charges_overview
from anon;

revoke all
on public.bank_receivables_overview
from anon;

revoke all
on public.bank_debts_overview
from anon;

revoke all
on public.bank_subscriptions_overview
from anon;

revoke all
on public.bank_dashboard_summary
from anon;

grant execute
on function public.central_daily_priorities_snapshot()
to authenticated,service_role;

grant execute
on function public.central_alerts_snapshot()
to authenticated,service_role;

revoke all
on function public.central_daily_priorities_snapshot()
from anon;

revoke all
on function public.central_alerts_snapshot()
from anon;

commit;
