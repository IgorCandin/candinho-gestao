do $$
begin
  if to_regclass('public.operational_calendar_events_legacy_base') is null then
    alter view public.operational_calendar_events rename to operational_calendar_events_legacy_base;
  end if;
end;
$$;

create or replace view public.operational_calendar_events
with (security_invoker = true)
as
select * from public.operational_calendar_events_legacy_base where source_type<>'sale_payment'
union all
select
  case when r.installment_id is not null then 'sale_payment_installment:'||r.installment_id::text else 'sale_payment:'||r.sale_id::text end as event_key,
  'sale_payment'::text as source_type,
  coalesce(r.installment_id,r.sale_id) as source_id,
  'payment'::text as category,
  case when r.installment_id is not null then 'Cobrança parcela '||r.installment_no::text||'/'||r.installment_count::text||' · '||coalesce(c.name,s.reference,'Cliente')
       else 'Cobrança · '||coalesce(c.name,s.reference,'Cliente') end as title,
  coalesce(sp.product_summary,'Venda registrada') as subtitle,
  ((r.due_date::timestamp+interval '12 hours') at time zone 'America/Sao_Paulo') as due_at,
  r.due_date,
  'planned'::text as status,
  case when r.due_date<(now() at time zone 'America/Sao_Paulo')::date then 'urgent' else 'attention' end as priority,
  s.customer_id,
  coalesce(c.name,s.reference,'Cliente') as customer_name,
  coalesce(c.phone,s.phone) as customer_phone,
  s.id as sale_id,
  null::uuid as purchase_order_id,
  s.created_by as assigned_to,
  coalesce(pr.full_name,pr.email) as assigned_name,
  '/vendas/'||s.id::text as href,
  coalesce(i.notes,s.notes) as notes,
  r.amount::numeric as amount,
  coalesce(i.created_at,s.created_at) as created_at
from public.supplement_sale_receivable_schedule r
join public.sales s on s.id=r.sale_id
left join public.sale_payment_installments i on i.id=r.installment_id
left join public.customers c on c.id=s.customer_id
left join public.profiles pr on pr.id=s.created_by
left join lateral (
  select string_agg(p.name||case when si.quantity>1 then ' ×'||si.quantity::text else '' end,', ' order by p.name) as product_summary
  from public.sale_items si join public.products p on p.id=si.product_id where si.sale_id=s.id
) sp on true
where r.has_explicit_due;

grant select on public.operational_calendar_events to authenticated;

create or replace view public.operational_agenda_summary
with (security_invoker = true)
as
select
  count(*) filter (where status='planned' and due_date=(now() at time zone 'America/Sao_Paulo')::date)::integer as today_count,
  count(*) filter (where status='planned' and due_date<(now() at time zone 'America/Sao_Paulo')::date)::integer as overdue_count,
  count(*) filter (where status='planned' and due_date>(now() at time zone 'America/Sao_Paulo')::date and due_date<=(now() at time zone 'America/Sao_Paulo')::date+7)::integer as next_seven_days_count,
  count(*) filter (where status='completed' and date_trunc('month',due_date::timestamp)=date_trunc('month',now() at time zone 'America/Sao_Paulo'))::integer as completed_month_count
from public.operational_calendar_events;

grant select on public.operational_agenda_summary to authenticated;

create or replace function public.reschedule_operational_event(p_source_type text,p_source_id uuid,p_due_at timestamptz)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_due date;v_customer_id uuid;v_sale_id uuid;v_handled boolean:=false;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para reagendar eventos'; end if;
  if p_due_at is null then raise exception 'Informe a nova data'; end if;
  v_due:=(p_due_at at time zone 'America/Sao_Paulo')::date;
  case p_source_type
    when 'task' then
      update public.operational_tasks set due_at=p_due_at,status='planned',completed_at=null,cancelled_at=null where id=p_source_id;
      v_handled:=found;
    when 'interaction' then
      update public.customer_interactions set due_at=v_due,status='planned',completed_at=null where id=p_source_id returning customer_id into v_customer_id;
      v_handled:=found;
      if v_handled then update public.customers set crm_status='follow_up',next_contact_at=v_due,contact_lost=false,updated_at=now() where id=v_customer_id; end if;
    when 'sale_payment' then
      select sale_id into v_sale_id from public.sale_payment_installments where id=p_source_id;
      if found then
        update public.sale_payment_installments set due_on=v_due,updated_at=now() where id=p_source_id;
        perform public.sync_sale_payment_state(v_sale_id);v_handled:=true;
      else
        update public.sales set payment_due_at=v_due,updated_at=now() where id=p_source_id and record_type='sale' and payment_status='receivable';
        v_handled:=found;
      end if;
    when 'sale_delivery' then
      update public.sales set delivery_due_at=v_due,updated_at=now() where id=p_source_id and record_type='sale' and delivery_status='to_deliver';v_handled:=found;
    when 'sale_post_sale' then
      update public.post_sale_batches set due_on=v_due,status='planned',completed_at=null,cancelled_at=null,updated_at=now() where id=p_source_id;
      if found then
        v_handled:=true;
        update public.sales s set post_sale_due_at=v_due,post_sale_status='planned',updated_at=now()
        from public.post_sale_batch_sales m where m.batch_id=p_source_id and m.sale_id=s.id;
      else
        update public.sales set post_sale_due_at=v_due,post_sale_status='planned',updated_at=now() where id=p_source_id and record_type='sale';v_handled:=found;
      end if;
    when 'purchase_order' then
      update public.purchase_orders set expected_on=v_due,updated_at=now() where id=p_source_id and status in('pending','partial');v_handled:=found;
    else raise exception 'Tipo de evento inválido';
  end case;
  if not v_handled then raise exception 'Evento não encontrado ou já concluído'; end if;
  insert into public.audit_events(entity_type,entity_id,action,details)
  values('operational_event',p_source_id,'rescheduled',jsonb_build_object('source_type',p_source_type,'due_at',p_due_at));
  return p_source_id;
end;
$$;

create or replace function public.complete_operational_event(
  p_source_type text,p_source_id uuid,p_completed_on date default null,p_outcome text default null,p_notes text default null,p_payment_method text default null
)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_on date:=coalesce(p_completed_on,(now() at time zone 'America/Sao_Paulo')::date);
  v_at timestamptz:=((coalesce(p_completed_on,(now() at time zone 'America/Sao_Paulo')::date))::timestamp+interval '12 hours') at time zone 'America/Sao_Paulo';
  v_customer_id uuid;v_sale_id uuid;v_amount numeric(12,2);v_handled boolean:=false;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para concluir eventos'; end if;
  case p_source_type
    when 'task' then
      update public.operational_tasks set status='completed',completed_at=v_at,cancelled_at=null,
        notes=case when nullif(btrim(p_notes),'') is null then notes else concat_ws(E'\n',notes,'Concluído: '||btrim(p_notes)) end
      where id=p_source_id and status='planned';
    when 'interaction' then
      select customer_id,sale_id into v_customer_id,v_sale_id from public.customer_interactions where id=p_source_id and status='planned';
      if not found then raise exception 'Retorno não encontrado ou já concluído'; end if;
      perform public.register_customer_interaction(v_customer_id,'contact',v_on,'Outro',coalesce(nullif(btrim(p_outcome),''),'Concluído pela Agenda'),p_notes,v_sale_id,null,p_source_id);
      return p_source_id;
    when 'sale_payment' then
      if p_payment_method is null then raise exception 'Informe a forma de pagamento'; end if;
      select sale_id into v_sale_id from public.sale_payment_installments where id=p_source_id;
      if found then
        select outstanding_amount into v_amount from public.sale_payment_installment_overview where id=p_source_id;
        if coalesce(v_amount,0)<=0.005 then raise exception 'Esta parcela já foi recebida'; end if;
        perform public.register_sale_payment(v_sale_id,v_amount,v_on,p_payment_method,p_source_id,coalesce(nullif(btrim(p_notes),''),'Recebido pela Agenda'));
      else
        perform public.mark_sale_received(p_source_id,v_on,p_payment_method);
      end if;
      return p_source_id;
    when 'sale_delivery' then
      perform public.mark_sale_delivered(p_source_id,v_on);return p_source_id;
    when 'sale_post_sale' then
      select customer_id,latest_sale_id into v_customer_id,v_sale_id from public.post_sale_batch_overview where id=p_source_id and status='planned';
      if found then
        v_handled:=true;
        update public.post_sale_batches set status='completed',completed_at=v_at,cancelled_at=null,
          notes=case when nullif(btrim(p_notes),'') is null then notes else concat_ws(E'\n',notes,'Concluído: '||btrim(p_notes)) end,updated_at=now()
        where id=p_source_id;
        update public.sales s set post_sale_status='completed',updated_at=now()
        from public.post_sale_batch_sales m where m.batch_id=p_source_id and m.sale_id=s.id;
        if v_customer_id is not null then
          perform public.register_customer_interaction(v_customer_id,'post_sale',v_on,'Outro',coalesce(nullif(btrim(p_outcome),''),'Pós-venda concluído pela Agenda'),p_notes,v_sale_id,null,null);
        end if;
      else
        select customer_id into v_customer_id from public.sales where id=p_source_id and record_type='sale';
        if not found then raise exception 'Venda não encontrada'; end if;
        if v_customer_id is not null then
          perform public.register_customer_interaction(v_customer_id,'post_sale',v_on,'Outro',coalesce(nullif(btrim(p_outcome),''),'Pós-venda concluído pela Agenda'),p_notes,p_source_id,null,null);
        end if;
        update public.sales set post_sale_status='completed',updated_at=now() where id=p_source_id;
      end if;
    when 'purchase_order' then raise exception 'Receba os itens do pedido para concluí-lo';
    else raise exception 'Tipo de evento inválido';
  end case;
  if not found and not v_handled then raise exception 'Evento não encontrado ou já concluído'; end if;
  insert into public.audit_events(entity_type,entity_id,action,details)
  values('operational_event',p_source_id,'completed',jsonb_build_object('source_type',p_source_type,'completed_on',v_on));
  return p_source_id;
end;
$$;

create or replace function public.append_operational_event_note(p_source_type text,p_source_id uuid,p_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_note text;v_handled boolean:=false;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para adicionar observações'; end if;
  v_note:=nullif(btrim(p_note),'');if v_note is null then raise exception 'Digite uma observação'; end if;
  v_note:=to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')||' · '||v_note;
  case p_source_type
    when 'task' then update public.operational_tasks set notes=concat_ws(E'\n',notes,v_note) where id=p_source_id;v_handled:=found;
    when 'interaction' then update public.customer_interactions set notes=concat_ws(E'\n',notes,v_note) where id=p_source_id;v_handled:=found;
    when 'sale_payment' then
      update public.sale_payment_installments set notes=concat_ws(E'\n',notes,v_note),updated_at=now() where id=p_source_id;
      if found then v_handled:=true; else update public.sales set notes=concat_ws(E'\n',notes,v_note),updated_at=now() where id=p_source_id;v_handled:=found; end if;
    when 'sale_delivery' then update public.sales set notes=concat_ws(E'\n',notes,v_note),updated_at=now() where id=p_source_id;v_handled:=found;
    when 'sale_post_sale' then
      update public.post_sale_batches set notes=concat_ws(E'\n',notes,v_note),updated_at=now() where id=p_source_id;
      if found then v_handled:=true; else update public.sales set notes=concat_ws(E'\n',notes,v_note),updated_at=now() where id=p_source_id;v_handled:=found; end if;
    when 'purchase_order' then update public.purchase_orders set notes=concat_ws(E'\n',notes,v_note),updated_at=now() where id=p_source_id;v_handled:=found;
    else raise exception 'Tipo de evento inválido';
  end case;
  if not v_handled then raise exception 'Evento não encontrado'; end if;
  return p_source_id;
end;
$$;

create or replace function public.sale_payment_integrity_snapshot()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_result jsonb;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para auditar pagamentos'; end if;
  select jsonb_build_object(
    'split_quotes_plan_mismatch',(select count(*) from public.sales_quotes q left join lateral (select count(*) cnt,coalesce(sum(amount),0) total from public.sales_quote_payment_installments i where i.quote_id=q.id) x on true where q.payment_mode='split' and (x.cnt<2 or abs(x.total-q.total_amount)>0.005)),
    'split_sales_plan_mismatch',(select count(*) from public.sales s join public.sale_payment_summary ps on ps.sale_id=s.id where ps.installment_count>0 and abs(ps.planned_amount-s.total_amount)>0.005),
    'sale_overpayments',(select count(*) from (select s.id,s.total_amount,coalesce(sum(e.amount),0) received from public.sales s left join public.sale_payment_entries e on e.sale_id=s.id where s.record_type='sale' group by s.id) x where x.received>x.total_amount+0.005),
    'installment_overpayments',(select count(*) from public.sale_payment_installment_overview where received_amount>amount+0.005),
    'partial_sales',(select count(*) from public.sale_payment_summary where payment_state='partial'),
    'receivable_without_balance',(select count(*) from public.sales s join public.sale_payment_summary ps on ps.sale_id=s.id where s.payment_status='receivable' and s.general_status<>'cancelled' and ps.outstanding_amount<=0.005),
    'generated_at',now()
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.sale_payment_integrity_snapshot() from public,anon;
grant execute on function public.sale_payment_integrity_snapshot() to authenticated;
