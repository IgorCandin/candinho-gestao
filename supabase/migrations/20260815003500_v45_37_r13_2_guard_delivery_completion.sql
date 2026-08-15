-- V45.37.R13.2
-- Trava estrutural: uma entrega de venda de Suplementos não pode mais ser
-- concluída pela Agenda sem passar pela confirmação de sacola/cartão.

create or replace function public.complete_operational_event(
  p_source_type text,
  p_source_id uuid,
  p_completed_on date default null,
  p_outcome text default null,
  p_notes text default null,
  p_payment_method text default null
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare
  v_on date:=coalesce(p_completed_on,(now() at time zone 'America/Sao_Paulo')::date);
  v_at timestamptz:=((coalesce(p_completed_on,(now() at time zone 'America/Sao_Paulo')::date))::timestamp+interval '12 hours') at time zone 'America/Sao_Paulo';
  v_customer_id uuid;
  v_sale_id uuid;
  v_amount numeric(12,2);
  v_handled boolean:=false;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para concluir eventos';
  end if;

  case p_source_type
    when 'task' then
      update public.operational_tasks
      set status='completed',completed_at=v_at,cancelled_at=null,
          notes=case when nullif(btrim(p_notes),'') is null then notes else concat_ws(E'\n',notes,'Concluído: '||btrim(p_notes)) end
      where id=p_source_id and status='planned';

    when 'interaction' then
      select customer_id,sale_id into v_customer_id,v_sale_id
      from public.customer_interactions
      where id=p_source_id and status='planned';

      if not found then
        raise exception 'Retorno não encontrado ou já concluído';
      end if;

      perform public.register_customer_interaction(
        v_customer_id,'contact',v_on,'Outro',
        coalesce(nullif(btrim(p_outcome),''),'Concluído pela Agenda'),
        p_notes,v_sale_id,null,p_source_id
      );
      return p_source_id;

    when 'sale_payment' then
      if p_payment_method is null then
        raise exception 'Informe a forma de pagamento';
      end if;

      select sale_id into v_sale_id
      from public.sale_payment_installments
      where id=p_source_id;

      if found then
        select outstanding_amount into v_amount
        from public.sale_payment_installment_overview
        where id=p_source_id;

        if coalesce(v_amount,0)<=0.005 then
          raise exception 'Esta parcela já foi recebida';
        end if;

        perform public.register_sale_payment(
          v_sale_id,v_amount,v_on,p_payment_method,p_source_id,
          coalesce(nullif(btrim(p_notes),''),'Recebido pela Agenda')
        );
      else
        perform public.mark_sale_received(
          p_source_id,v_on,p_payment_method
        );
      end if;

      return p_source_id;

    when 'sale_delivery' then
      raise exception 'Finalize a entrega pelo fluxo de embalagem da venda. Confirme sacola/cartão antes de concluir.';

    when 'sale_post_sale' then
      select customer_id,latest_sale_id
      into v_customer_id,v_sale_id
      from public.post_sale_batch_overview
      where id=p_source_id and status='planned';

      if found then
        v_handled:=true;

        update public.post_sale_batches
        set status='completed',completed_at=v_at,cancelled_at=null,
            notes=case when nullif(btrim(p_notes),'') is null then notes else concat_ws(E'\n',notes,'Concluído: '||btrim(p_notes)) end,
            updated_at=now()
        where id=p_source_id;

        update public.sales s
        set post_sale_status='completed',updated_at=now()
        from public.post_sale_batch_sales m
        where m.batch_id=p_source_id and m.sale_id=s.id;

        if v_customer_id is not null then
          perform public.register_customer_interaction(
            v_customer_id,'post_sale',v_on,'Outro',
            coalesce(nullif(btrim(p_outcome),''),'Pós-venda concluído pela Agenda'),
            p_notes,v_sale_id,null,null
          );
        end if;
      else
        select customer_id into v_customer_id
        from public.sales
        where id=p_source_id and record_type='sale';

        if not found then
          raise exception 'Venda não encontrada';
        end if;

        if v_customer_id is not null then
          perform public.register_customer_interaction(
            v_customer_id,'post_sale',v_on,'Outro',
            coalesce(nullif(btrim(p_outcome),''),'Pós-venda concluído pela Agenda'),
            p_notes,p_source_id,null,null
          );
        end if;

        update public.sales
        set post_sale_status='completed',updated_at=now()
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

  insert into public.audit_events(
    entity_type,entity_id,action,details
  )
  values(
    'operational_event',
    p_source_id,
    'completed',
    jsonb_build_object(
      'source_type',p_source_type,
      'completed_on',v_on
    )
  );

  return p_source_id;
end;
$$;

grant execute on function public.complete_operational_event(
  text,uuid,date,text,text,text
) to authenticated,service_role;
