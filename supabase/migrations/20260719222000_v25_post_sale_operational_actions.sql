-- V25 · Ações da Agenda compatíveis com pós-venda consolidado.
-- Mantém fallback para IDs legados de venda.

create or replace function public.reschedule_operational_event(
  p_source_type text,
  p_source_id uuid,
  p_due_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_due date;
  v_customer_id uuid;
  v_handled boolean:=false;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para reagendar eventos';
  end if;
  if p_due_at is null then
    raise exception 'Informe a nova data';
  end if;

  v_due := (p_due_at at time zone 'America/Sao_Paulo')::date;

  case p_source_type
    when 'task' then
      update public.operational_tasks
      set due_at=p_due_at,status='planned',completed_at=null,cancelled_at=null
      where id=p_source_id;

    when 'interaction' then
      update public.customer_interactions
      set due_at=v_due,status='planned',completed_at=null
      where id=p_source_id
      returning customer_id into v_customer_id;

      update public.customers
      set crm_status='follow_up',
          next_contact_at=v_due,
          contact_lost=false,
          updated_at=now()
      where id=v_customer_id;

    when 'sale_payment' then
      update public.sales
      set payment_due_at=v_due,updated_at=now()
      where id=p_source_id
        and record_type='sale'
        and payment_status='receivable';

    when 'sale_delivery' then
      update public.sales
      set delivery_due_at=v_due,updated_at=now()
      where id=p_source_id
        and record_type='sale'
        and delivery_status='to_deliver';

    when 'sale_post_sale' then
      update public.post_sale_batches
      set due_on=v_due,
          status='planned',
          completed_at=null,
          cancelled_at=null,
          updated_at=now()
      where id=p_source_id;

      if found then
        v_handled:=true;

        update public.sales s
        set post_sale_due_at=v_due,
            post_sale_status='planned',
            updated_at=now()
        from public.post_sale_batch_sales m
        where m.batch_id=p_source_id
          and m.sale_id=s.id;
      else
        -- Compatibilidade com eventos antigos baseados diretamente em sale_id.
        update public.sales
        set post_sale_due_at=v_due,
            post_sale_status='planned',
            updated_at=now()
        where id=p_source_id
          and record_type='sale';
      end if;

    when 'purchase_order' then
      update public.purchase_orders
      set expected_on=v_due,updated_at=now()
      where id=p_source_id
        and status in ('pending','partial');

    else
      raise exception 'Tipo de evento inválido';
  end case;

  if not found and not v_handled then
    raise exception 'Evento não encontrado ou já concluído';
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    'operational_event',
    p_source_id,
    'rescheduled',
    jsonb_build_object('source_type',p_source_type,'due_at',p_due_at)
  );

  return p_source_id;
end;
$$;

create or replace function public.append_operational_event_note(
  p_source_type text,
  p_source_id uuid,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_note text;
  v_handled boolean:=false;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para adicionar observações';
  end if;

  v_note:=nullif(btrim(p_note),'');
  if v_note is null then
    raise exception 'Digite uma observação';
  end if;

  v_note :=
    to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')
    || ' · ' || v_note;

  case p_source_type
    when 'task' then
      update public.operational_tasks
      set notes=concat_ws(E'\n',notes,v_note)
      where id=p_source_id;

    when 'interaction' then
      update public.customer_interactions
      set notes=concat_ws(E'\n',notes,v_note)
      where id=p_source_id;

    when 'sale_payment','sale_delivery' then
      update public.sales
      set notes=concat_ws(E'\n',notes,v_note),updated_at=now()
      where id=p_source_id;

    when 'sale_post_sale' then
      update public.post_sale_batches
      set notes=concat_ws(E'\n',notes,v_note),updated_at=now()
      where id=p_source_id;

      if found then
        v_handled:=true;
      else
        update public.sales
        set notes=concat_ws(E'\n',notes,v_note),updated_at=now()
        where id=p_source_id;
      end if;

    when 'purchase_order' then
      update public.purchase_orders
      set notes=concat_ws(E'\n',notes,v_note),updated_at=now()
      where id=p_source_id;

    else
      raise exception 'Tipo de evento inválido';
  end case;

  if not found and not v_handled then
    raise exception 'Evento não encontrado';
  end if;

  return p_source_id;
end;
$$;

create or replace function public.complete_operational_event(
  p_source_type text,
  p_source_id uuid,
  p_completed_on date default null,
  p_outcome text default null,
  p_notes text default null,
  p_payment_method text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_on date :=
    coalesce(p_completed_on,(now() at time zone 'America/Sao_Paulo')::date);
  v_at timestamptz :=
    ((coalesce(p_completed_on,(now() at time zone 'America/Sao_Paulo')::date))::timestamp
      + interval '12 hours') at time zone 'America/Sao_Paulo';
  v_customer_id uuid;
  v_sale_id uuid;
  v_handled boolean:=false;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para concluir eventos';
  end if;

  case p_source_type
    when 'task' then
      update public.operational_tasks
      set status='completed',
          completed_at=v_at,
          cancelled_at=null,
          notes=case
            when nullif(btrim(p_notes),'') is null then notes
            else concat_ws(E'\n',notes,'Concluído: '||btrim(p_notes))
          end
      where id=p_source_id
        and status='planned';

    when 'interaction' then
      select customer_id,sale_id
      into v_customer_id,v_sale_id
      from public.customer_interactions
      where id=p_source_id
        and status='planned';

      if not found then
        raise exception 'Retorno não encontrado ou já concluído';
      end if;

      perform public.register_customer_interaction(
        v_customer_id,
        'contact',
        v_on,
        'Outro',
        coalesce(nullif(btrim(p_outcome),''),'Concluído pela Agenda'),
        p_notes,
        v_sale_id,
        null,
        p_source_id
      );

      return p_source_id;

    when 'sale_payment' then
      if p_payment_method is null then
        raise exception 'Informe a forma de pagamento';
      end if;
      perform public.mark_sale_received(p_source_id,v_on,p_payment_method);
      return p_source_id;

    when 'sale_delivery' then
      perform public.mark_sale_delivered(p_source_id,v_on);
      return p_source_id;

    when 'sale_post_sale' then
      select customer_id,latest_sale_id
      into v_customer_id,v_sale_id
      from public.post_sale_batch_overview
      where id=p_source_id
        and status='planned';

      if found then
        v_handled:=true;

        update public.post_sale_batches
        set status='completed',
            completed_at=v_at,
            cancelled_at=null,
            notes=case
              when nullif(btrim(p_notes),'') is null then notes
              else concat_ws(E'\n',notes,'Concluído: '||btrim(p_notes))
            end,
            updated_at=now()
        where id=p_source_id;

        update public.sales s
        set post_sale_status='completed',
            updated_at=now()
        from public.post_sale_batch_sales m
        where m.batch_id=p_source_id
          and m.sale_id=s.id;

        if v_customer_id is not null then
          perform public.register_customer_interaction(
            v_customer_id,
            'post_sale',
            v_on,
            'Outro',
            coalesce(
              nullif(btrim(p_outcome),''),
              'Pós-venda concluído pela Agenda'
            ),
            p_notes,
            v_sale_id,
            null,
            null
          );
        end if;
      else
        -- Compatibilidade com evento legado cujo source_id era a venda.
        select customer_id into v_customer_id
        from public.sales
        where id=p_source_id
          and record_type='sale';

        if not found then
          raise exception 'Venda não encontrada';
        end if;

        if v_customer_id is not null then
          perform public.register_customer_interaction(
            v_customer_id,
            'post_sale',
            v_on,
            'Outro',
            coalesce(
              nullif(btrim(p_outcome),''),
              'Pós-venda concluído pela Agenda'
            ),
            p_notes,
            p_source_id,
            null,
            null
          );
        end if;

        update public.sales
        set post_sale_status='completed',
            updated_at=now()
        where id=p_source_id;
      end if;

    when 'purchase_order' then
      raise exception 'Receba os itens do pedido para concluí-lo';

    else
      raise exception 'Tipo de evento inválido';
  end case;

  if not found and not v_handled then
    raise exception 'Evento não encontrado ou já concluído';
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    'operational_event',
    p_source_id,
    'completed',
    jsonb_build_object('source_type',p_source_type,'completed_on',v_on)
  );

  return p_source_id;
end;
$$;

create or replace function public.cancel_operational_event(
  p_source_type text,
  p_source_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_customer_id uuid;
  v_handled boolean:=false;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para cancelar eventos';
  end if;

  case p_source_type
    when 'task' then
      update public.operational_tasks
      set status='cancelled',
          cancelled_at=now(),
          notes=concat_ws(E'\n',notes,nullif(btrim(p_reason),''))
      where id=p_source_id
        and status='planned';

    when 'interaction' then
      update public.customer_interactions
      set status='cancelled',
          completed_at=now(),
          notes=concat_ws(E'\n',notes,nullif(btrim(p_reason),''))
      where id=p_source_id
        and status='planned'
      returning customer_id into v_customer_id;

      update public.customers c
      set next_contact_at=(
            select min(ci.due_at)
            from public.customer_interactions ci
            where ci.customer_id=c.id
              and ci.status='planned'
          ),
          crm_status=case
            when exists(
              select 1
              from public.customer_interactions ci
              where ci.customer_id=c.id
                and ci.status='planned'
            )
            then 'follow_up'
            else 'active'
          end,
          updated_at=now()
      where c.id=v_customer_id;

    when 'sale_post_sale' then
      update public.post_sale_batches
      set status='cancelled',
          cancelled_at=now(),
          notes=concat_ws(E'\n',notes,nullif(btrim(p_reason),'')),
          updated_at=now()
      where id=p_source_id
        and status='planned';

      if found then
        v_handled:=true;

        update public.sales s
        set post_sale_status='cancelled',
            updated_at=now()
        from public.post_sale_batch_sales m
        where m.batch_id=p_source_id
          and m.sale_id=s.id;
      else
        update public.sales
        set post_sale_status='cancelled',
            updated_at=now(),
            notes=concat_ws(E'\n',notes,nullif(btrim(p_reason),''))
        where id=p_source_id;
      end if;

    else
      raise exception 'Este tipo de compromisso não pode ser cancelado pela Agenda';
  end case;

  if not found and not v_handled then
    raise exception 'Evento não encontrado ou já concluído';
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    'operational_event',
    p_source_id,
    'cancelled',
    jsonb_build_object('source_type',p_source_type,'reason',p_reason)
  );

  return p_source_id;
end;
$$;
