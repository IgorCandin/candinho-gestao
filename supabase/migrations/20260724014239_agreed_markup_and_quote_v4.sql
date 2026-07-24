alter table public.sales_quotes
  add column if not exists agreed_markup_amount numeric(12,2) not null default 0;

alter table public.sales
  add column if not exists agreed_markup_amount numeric(12,2) not null default 0;

alter table public.sales_quotes
  drop constraint if exists sales_quotes_agreed_markup_nonnegative;
alter table public.sales_quotes
  add constraint sales_quotes_agreed_markup_nonnegative
  check (agreed_markup_amount >= 0);

alter table public.sales
  drop constraint if exists sales_agreed_markup_nonnegative;
alter table public.sales
  add constraint sales_agreed_markup_nonnegative
  check (agreed_markup_amount >= 0);

create or replace function public.save_budget_quote_v4(
  p_customer_id uuid,
  p_location_id uuid,
  p_quoted_on date,
  p_valid_until date,
  p_items jsonb,
  p_discount_amount numeric default 0,
  p_gift_product_id uuid default null,
  p_gift_quantity integer default 0,
  p_payment_mode text default 'receivable',
  p_paid_on date default null,
  p_payment_method text default null,
  p_payment_due_on date default null,
  p_delivered boolean default false,
  p_delivered_on date default null,
  p_delivery_due_on date default null,
  p_schedule_post_sale boolean default true,
  p_post_sale_due_on date default null,
  p_notes text default null,
  p_partner_id uuid default null,
  p_existing_quote_id uuid default null,
  p_payment_installments jsonb default '[]'::jsonb,
  p_agreed_markup_amount numeric default 0
)
returns table(quote_id uuid,lead_id uuid)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_quote_id uuid;
  v_lead_id uuid;
  v_total numeric(12,2);
  v_markup numeric(12,2):=coalesce(p_agreed_markup_amount,0);
  v_plan_total numeric(12,2):=0;
  v_plan_count integer:=0;
  v_due_count integer:=0;
  v_min_due date;
  v_invalid_methods integer:=0;
  v_base_mode text;
  v_base_method text;
  v_base_due date;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para registrar orçamentos';
  end if;

  if v_markup < 0 then
    raise exception 'O lucro do combinado não pode ser negativo';
  end if;

  if p_payment_mode not in ('receivable','paid','combined','split') then
    raise exception 'Situação do pagamento inválida';
  end if;

  if p_payment_mode='split' then
    if p_payment_installments is null or jsonb_typeof(p_payment_installments)<>'array' then
      raise exception 'Informe as parcelas do pagamento dividido';
    end if;

    select
      count(*)::integer,
      coalesce(sum((x.value->>'amount')::numeric),0)::numeric(12,2),
      count((x.value->>'due_on')::date)::integer,
      min((x.value->>'due_on')::date),
      count(*) filter (
        where nullif(btrim(x.value->>'planned_payment_method'),'') is not null
          and (x.value->>'planned_payment_method')<>all(array['Pix','Dinheiro','Cartão','Link de Pagamento','Pagamento fracionado'])
      )::integer
    into v_plan_count,v_plan_total,v_due_count,v_min_due,v_invalid_methods
    from jsonb_array_elements(p_payment_installments) with ordinality x(value,ord);

    if v_plan_count<2 then
      raise exception 'Pagamento dividido precisa de pelo menos duas parcelas';
    end if;
    if v_due_count<>v_plan_count then
      raise exception 'Todas as parcelas precisam de uma data de vencimento';
    end if;
    if v_plan_total<=0 then
      raise exception 'Informe valores válidos para as parcelas';
    end if;
    if exists(
      select 1
      from jsonb_array_elements(p_payment_installments) x
      where coalesce((x->>'amount')::numeric,0)<=0
    ) then
      raise exception 'Cada parcela precisa ter valor maior que zero';
    end if;
    if v_invalid_methods>0 then
      raise exception 'Forma de pagamento prevista inválida em uma das parcelas';
    end if;

    v_base_mode:='combined';
    v_base_method:='Pagamento fracionado';
    v_base_due:=v_min_due;
  else
    v_base_mode:=p_payment_mode;
    v_base_method:=p_payment_method;
    v_base_due:=p_payment_due_on;
  end if;

  select r.quote_id,r.lead_id
  into v_quote_id,v_lead_id
  from public.save_budget_quote_v2(
    p_customer_id=>p_customer_id,
    p_location_id=>p_location_id,
    p_quoted_on=>p_quoted_on,
    p_valid_until=>p_valid_until,
    p_items=>p_items,
    p_discount_amount=>p_discount_amount,
    p_gift_product_id=>p_gift_product_id,
    p_gift_quantity=>p_gift_quantity,
    p_payment_mode=>v_base_mode,
    p_paid_on=>p_paid_on,
    p_payment_method=>v_base_method,
    p_payment_due_on=>v_base_due,
    p_delivered=>p_delivered,
    p_delivered_on=>p_delivered_on,
    p_delivery_due_on=>p_delivery_due_on,
    p_schedule_post_sale=>p_schedule_post_sale,
    p_post_sale_due_on=>p_post_sale_due_on,
    p_notes=>p_notes,
    p_partner_id=>p_partner_id,
    p_existing_quote_id=>p_existing_quote_id
  ) r;

  if v_quote_id is null then
    raise exception 'Não foi possível identificar o orçamento salvo';
  end if;

  update public.sales_quotes
  set agreed_markup_amount=v_markup,
      total_amount=greatest(gross_amount-discount_amount+v_markup,0),
      updated_at=now()
  where id=v_quote_id;

  if v_lead_id is not null then
    update public.sales
    set agreed_markup_amount=v_markup,
        updated_at=now()
    where id=v_lead_id and record_type='lead';
  end if;

  delete from public.sales_quote_payment_installments
  where quote_id=v_quote_id;

  if p_payment_mode='split' then
    select total_amount
    into v_total
    from public.sales_quotes
    where id=v_quote_id;

    if abs(v_plan_total-v_total)>0.005 then
      raise exception 'A soma das parcelas (%) precisa ser igual ao total do orçamento (%)',
        to_char(v_plan_total,'FM999999990D00'),
        to_char(v_total,'FM999999990D00');
    end if;

    insert into public.sales_quote_payment_installments(
      quote_id,installment_no,amount,due_on,planned_payment_method,notes
    )
    select
      v_quote_id,
      x.ord::integer,
      (x.value->>'amount')::numeric(12,2),
      (x.value->>'due_on')::date,
      nullif(btrim(x.value->>'planned_payment_method'),''),
      nullif(btrim(x.value->>'notes'),'')
    from jsonb_array_elements(p_payment_installments) with ordinality x(value,ord)
    order by x.ord;

    update public.sales_quotes
    set payment_mode='split',
        payment_method='Pagamento fracionado',
        payment_due_on=v_min_due,
        paid_on=null,
        updated_at=now()
    where id=v_quote_id;

    if v_lead_id is not null then
      update public.sales
      set payment_method='Pagamento fracionado',
          payment_condition='Pagamento dividido',
          payment_due_at=v_min_due,
          updated_at=now()
      where id=v_lead_id and record_type='lead';
    end if;
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    'quote',v_quote_id,'agreed_markup_saved',
    jsonb_build_object(
      'agreed_markup_amount',v_markup,
      'total_amount',(select total_amount from public.sales_quotes where id=v_quote_id),
      'payment_mode',p_payment_mode
    )
  );

  return query select v_quote_id,v_lead_id;
end;
$$;

revoke all on function public.save_budget_quote_v4(
  uuid,uuid,date,date,jsonb,numeric,uuid,integer,text,date,text,date,
  boolean,date,date,boolean,date,text,uuid,uuid,jsonb,numeric
) from public,anon;

grant execute on function public.save_budget_quote_v4(
  uuid,uuid,date,date,jsonb,numeric,uuid,integer,text,date,text,date,
  boolean,date,date,boolean,date,text,uuid,uuid,jsonb,numeric
) to authenticated;

create or replace function public.confirm_budget_quote_v4(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_q public.sales_quotes%rowtype;
  v_sale_id uuid;
  v_plan_count integer;
  v_plan_total numeric(12,2);
  v_min_due date;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para confirmar orçamentos';
  end if;

  select * into v_q
  from public.sales_quotes
  where id=p_quote_id
  for update;

  if not found then
    raise exception 'Orçamento não encontrado';
  end if;

  if v_q.status='confirmed' and v_q.sale_id is not null then
    return v_q.sale_id;
  end if;

  if v_q.payment_mode<>'split' then
    v_sale_id:=public.confirm_budget_quote_v2_core(p_quote_id);

    update public.sales
    set agreed_markup_amount=coalesce(v_q.agreed_markup_amount,0),
        total_amount=v_q.total_amount,
        total_profit=total_profit+coalesce(v_q.agreed_markup_amount,0),
        updated_at=now()
    where id=v_sale_id;

    if v_q.payment_mode='paid' then
      update public.sale_payment_entries
      set amount=v_q.total_amount,
          notes=case
            when coalesce(v_q.agreed_markup_amount,0)>0
              then 'Pagamento integral registrado na confirmação, incluindo lucro do combinado'
            else notes
          end
      where sale_id=v_sale_id;
    end if;

    perform public.sync_sale_payment_state(v_sale_id);

    insert into public.audit_events(entity_type,entity_id,action,details)
    values(
      'sale',v_sale_id,'agreed_markup_applied',
      jsonb_build_object(
        'quote_id',p_quote_id,
        'agreed_markup_amount',coalesce(v_q.agreed_markup_amount,0),
        'total_amount',v_q.total_amount
      )
    );

    return v_sale_id;
  end if;

  select
    count(*)::integer,
    coalesce(sum(amount),0)::numeric(12,2),
    min(due_on)
  into v_plan_count,v_plan_total,v_min_due
  from public.sales_quote_payment_installments
  where quote_id=p_quote_id;

  if v_plan_count<2 then
    raise exception 'O pagamento dividido não possui pelo menos duas parcelas';
  end if;

  if abs(v_plan_total-v_q.total_amount)>0.005 then
    raise exception 'A soma das parcelas não corresponde ao total do orçamento';
  end if;

  update public.sales_quotes
  set payment_mode='combined',
      payment_method='Pagamento fracionado',
      payment_due_on=v_min_due,
      paid_on=null,
      updated_at=now()
  where id=p_quote_id;

  v_sale_id:=public.confirm_budget_quote_v2_core(p_quote_id);

  update public.sales
  set agreed_markup_amount=coalesce(v_q.agreed_markup_amount,0),
      total_amount=v_q.total_amount,
      total_profit=total_profit+coalesce(v_q.agreed_markup_amount,0),
      updated_at=now()
  where id=v_sale_id;

  update public.sales_quotes
  set payment_mode='split',
      payment_method='Pagamento fracionado',
      payment_due_on=v_min_due,
      updated_at=now()
  where id=p_quote_id;

  insert into public.sale_payment_installments(
    sale_id,source_quote_installment_id,installment_no,amount,due_on,
    planned_payment_method,notes
  )
  select
    v_sale_id,id,installment_no,amount,due_on,planned_payment_method,notes
  from public.sales_quote_payment_installments
  where quote_id=p_quote_id
  order by installment_no;

  perform public.sync_sale_payment_state(v_sale_id);

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    'sale',v_sale_id,'split_payment_plan_created',
    jsonb_build_object(
      'quote_id',p_quote_id,
      'installment_count',v_plan_count,
      'total_amount',v_plan_total,
      'first_due_on',v_min_due,
      'agreed_markup_amount',coalesce(v_q.agreed_markup_amount,0)
    )
  );

  return v_sale_id;
end;
$$;

revoke all on function public.confirm_budget_quote_v4(uuid) from public,anon;
grant execute on function public.confirm_budget_quote_v4(uuid) to authenticated;

create or replace function public.confirm_budget_quote_v3(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para confirmar orçamentos';
  end if;
  return public.confirm_budget_quote_v4(p_quote_id);
end;
$$;

create or replace function public.confirm_budget_quote_v2(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para confirmar orçamentos';
  end if;
  return public.confirm_budget_quote_v4(p_quote_id);
end;
$$;
