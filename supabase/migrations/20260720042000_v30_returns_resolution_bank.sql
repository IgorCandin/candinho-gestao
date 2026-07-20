create or replace function public.resolve_return_case(
  p_case_id uuid,
  p_resolution text,
  p_items jsonb,
  p_refund_amount numeric default 0,
  p_resolved_on date default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_case public.return_cases%rowtype;
  v_item jsonb;
  v_case_item public.return_case_items%rowtype;
  v_item_id uuid;
  v_disposition text;
  v_lot_id uuid;
  v_lot public.inventory_lots%rowtype;
  v_product public.products%rowtype;
  v_sale_location uuid;
  v_restock integer;
  v_total_value numeric:=0;
  v_unique_lot_count integer:=0;
  v_auto_lot_id uuid;
  v_pending integer:=0;
begin
  select *
  into v_case
  from public.return_cases
  where id=p_case_id
  for update;

  if not found then
    raise exception 'Ocorrência não encontrada';
  end if;

  if v_case.operation='supplements' and not public.can_write() then
    raise exception 'Usuário sem permissão para resolver devoluções de Suplementos';
  end if;

  if v_case.operation='fitness' and not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para resolver devoluções da Fitness';
  end if;

  if v_case.status in ('resolved','rejected','cancelled') then
    raise exception 'Esta ocorrência já está encerrada';
  end if;

  if p_resolution not in ('exchange','refund','replacement','no_action') then
    raise exception 'Resolução inválida';
  end if;

  if p_items is null or jsonb_typeof(p_items)<>'array' then
    raise exception 'Informe a destinação dos itens';
  end if;

  select
    coalesce(sum(quantity_received*unit_price),0)
  into v_total_value
  from public.return_case_items
  where case_id=p_case_id;

  if coalesce(p_refund_amount,0)<0
     or coalesce(p_refund_amount,0)>v_total_value
  then
    raise exception
      'Valor de reembolso inválido. Máximo recebido: %',
      v_total_value;
  end if;

  if p_resolution='refund'
     and coalesce(p_refund_amount,0)<=0
  then
    raise exception 'Informe o valor do reembolso';
  end if;

  if v_case.operation='supplements' then
    select location_id
    into v_sale_location
    from public.sales
    where id=v_case.original_sale_id;
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_item_id:=(v_item->>'item_id')::uuid;
    v_disposition:=coalesce(
      nullif(v_item->>'disposition',''),
      'pending'
    );
    v_lot_id:=nullif(v_item->>'lot_id','')::uuid;

    select *
    into v_case_item
    from public.return_case_items
    where id=v_item_id
      and case_id=p_case_id
    for update;

    if not found then
      raise exception 'Item da ocorrência não encontrado';
    end if;

    if v_case_item.quantity_received<=0 then
      raise exception
        'O item % não possui quantidade recebida para resolver',
        v_case_item.item_name;
    end if;

    if v_disposition not in (
      'restock',
      'quarantine',
      'discard',
      'return_supplier'
    )
    then
      raise exception
        'Destinação inválida para %',
        v_case_item.item_name;
    end if;

    v_restock:=0;

    if v_disposition='restock' then
      if v_case.operation='supplements' then
        select *
        into v_product
        from public.products
        where id=v_case_item.product_id;

        v_auto_lot_id:=null;
        v_unique_lot_count:=0;

        if v_product.lot_tracking_enabled
           and v_lot_id is null
        then
          select
            count(distinct lot_id)::integer,
            min(lot_id)
          into
            v_unique_lot_count,
            v_auto_lot_id
          from public.inventory_lot_traceability
          where sale_id=v_case.original_sale_id
            and product_id=v_case_item.product_id
            and flavor_id is not distinct from v_case_item.flavor_id
            and allocation_kind='tracked'
            and quantity_delta<0
            and lot_id is not null;

          if v_unique_lot_count=1 then
            v_lot_id:=v_auto_lot_id;
          end if;
        end if;

        if v_lot_id is not null then
          select *
          into v_lot
          from public.inventory_lots
          where id=v_lot_id;

          if not found
             or v_lot.product_id<>v_case_item.product_id
             or v_lot.flavor_id is distinct from v_case_item.flavor_id
          then
            raise exception
              'O lote selecionado não pertence ao item %',
              v_case_item.item_name;
          end if;
        end if;

        insert into public.inventory_movements(
          product_id,
          location_id,
          flavor_id,
          movement_type,
          quantity_delta,
          sale_id,
          lot_number,
          expires_on,
          notes,
          idempotency_key
        )
        values(
          v_case_item.product_id,
          v_sale_location,
          v_case_item.flavor_id,
          'adjustment',
          v_case_item.quantity_received,
          v_case.original_sale_id,
          case
            when v_lot_id is null
              then null
            else v_lot.lot_number
          end,
          case
            when v_lot_id is null
              then null
            else v_lot.expires_on
          end,
          'Retorno ao estoque pela ocorrência #'
            ||v_case.case_number,
          'return-case:'
            ||p_case_id::text
            ||':item:'
            ||v_case_item.id::text
        );

        v_restock:=v_case_item.quantity_received;
      else
        insert into public.fitness_inventory_movements(
          variant_id,
          movement_type,
          quantity_delta,
          sale_id,
          notes,
          idempotency_key
        )
        values(
          v_case_item.variant_id,
          'return_in',
          v_case_item.quantity_received,
          v_case.original_fitness_sale_id,
          'Retorno ao estoque pela ocorrência #'
            ||v_case.case_number,
          'fitness:return-case:'
            ||p_case_id::text
            ||':item:'
            ||v_case_item.id::text
        );

        v_restock:=v_case_item.quantity_received;
      end if;
    end if;

    update public.return_case_items
    set disposition=v_disposition,
        lot_id=coalesce(v_lot_id,lot_id),
        restocked_quantity=v_restock,
        notes=case
          when nullif(btrim(v_item->>'notes'),'') is null
            then notes
          when notes is null
            then btrim(v_item->>'notes')
          else notes||' | '||btrim(v_item->>'notes')
        end,
        processed_at=now(),
        updated_at=now()
    where id=v_case_item.id;
  end loop;

  select count(*)::integer
  into v_pending
  from public.return_case_items
  where case_id=p_case_id
    and quantity_received>0
    and disposition='pending';

  if v_pending>0 then
    raise exception
      'Ainda existem % item(ns) recebidos sem destinação',
      v_pending;
  end if;

  update public.return_cases
  set status='resolved',
      resolution=p_resolution,
      refund_amount=coalesce(p_refund_amount,0),
      financial_status=case
        when coalesce(p_refund_amount,0)>0
          then 'pending'
        else 'not_applicable'
      end,
      resolved_on=coalesce(
        p_resolved_on,
        (now() at time zone 'America/Sao_Paulo')::date
      ),
      notes=case
        when nullif(btrim(p_notes),'') is null
          then notes
        when notes is null
          then btrim(p_notes)
        else notes||' | Resolução: '||btrim(p_notes)
      end,
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_case_id;

  insert into public.return_case_events(
    case_id,event_type,description,details
  )
  values(
    p_case_id,
    'resolved',
    'Ocorrência resolvida',
    jsonb_build_object(
      'resolution',p_resolution,
      'refund_amount',coalesce(p_refund_amount,0)
    )
  );

  insert into public.audit_events(
    entity_type,entity_id,action,details
  )
  values(
    'return_case',
    p_case_id,
    'resolved',
    jsonb_build_object(
      'operation',v_case.operation,
      'resolution',p_resolution,
      'refund_amount',coalesce(p_refund_amount,0)
    )
  );

  return p_case_id;
end;
$$;

revoke all
on function public.resolve_return_case(
  uuid,text,jsonb,numeric,date,text
)
from public,anon;

grant execute
on function public.resolve_return_case(
  uuid,text,jsonb,numeric,date,text
)
to authenticated,service_role;

create or replace function public.schedule_return_refund_in_bank(
  p_case_id uuid,
  p_due_date date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_case public.return_cases%rowtype;
  v_charge_id uuid;
  v_title text;
  v_origin text;
begin
  select *
  into v_case
  from public.return_cases
  where id=p_case_id
  for update;

  if not found then
    raise exception 'Ocorrência não encontrada';
  end if;

  if v_case.status<>'resolved' then
    raise exception
      'Resolva a ocorrência antes de agendar o reembolso';
  end if;

  if v_case.refund_amount<=0 then
    raise exception
      'Esta ocorrência não possui valor de reembolso';
  end if;

  if v_case.bank_charge_id is not null then
    return v_case.bank_charge_id;
  end if;

  if p_due_date is null then
    raise exception
      'Informe a data prevista do reembolso';
  end if;

  v_title:=
    'Reembolso pós-venda #'
    ||v_case.case_number
    ||' · '
    ||v_case.customer_name;

  v_origin:=case
    when v_case.operation='supplements'
      then 'Candinho Suplementos'
    else 'Candinho Fitness'
  end;

  v_charge_id:=public.bank_create_charge(
    v_title,
    'Reembolso vinculado à ocorrência de pós-venda #'
      ||v_case.case_number,
    v_case.refund_amount,
    p_due_date,
    'Trocas e devoluções',
    v_origin,
    coalesce(
      nullif(btrim(p_notes),''),
      'Gerado automaticamente pela Central de Trocas e Devoluções'
    )
  );

  update public.return_cases
  set bank_charge_id=v_charge_id,
      financial_status='scheduled',
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_case_id;

  insert into public.return_case_events(
    case_id,event_type,description,details
  )
  values(
    p_case_id,
    'refund_scheduled',
    'Reembolso agendado no Candinho Bank',
    jsonb_build_object(
      'bank_charge_id',v_charge_id,
      'due_date',p_due_date,
      'amount',v_case.refund_amount
    )
  );

  return v_charge_id;
end;
$$;

revoke all
on function public.schedule_return_refund_in_bank(
  uuid,date,text
)
from public,anon;

grant execute
on function public.schedule_return_refund_in_bank(
  uuid,date,text
)
to authenticated,service_role;

create or replace function public.close_return_case(
  p_case_id uuid,
  p_status text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_case public.return_cases%rowtype;
  v_restocked integer:=0;
begin
  select *
  into v_case
  from public.return_cases
  where id=p_case_id
  for update;

  if not found then
    raise exception 'Ocorrência não encontrada';
  end if;

  if v_case.operation='supplements'
     and not public.can_write()
  then
    raise exception
      'Usuário sem permissão para encerrar ocorrências de Suplementos';
  end if;

  if v_case.operation='fitness'
     and not public.can_write_fitness()
  then
    raise exception
      'Usuário sem permissão para encerrar ocorrências da Fitness';
  end if;

  if p_status not in ('rejected','cancelled') then
    raise exception
      'Status de encerramento inválido';
  end if;

  if v_case.status='resolved' then
    raise exception
      'Ocorrência resolvida não pode ser descartada';
  end if;

  if v_case.status in ('rejected','cancelled') then
    return p_case_id;
  end if;

  select
    coalesce(sum(restocked_quantity),0)::integer
  into v_restocked
  from public.return_case_items
  where case_id=p_case_id;

  if v_restocked>0 then
    raise exception
      'A ocorrência já movimentou estoque e não pode ser simplesmente encerrada';
  end if;

  update public.return_cases
  set status=p_status,
      notes=case
        when nullif(btrim(p_notes),'') is null
          then notes
        when notes is null
          then btrim(p_notes)
        else notes||' | Encerramento: '||btrim(p_notes)
      end,
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_case_id;

  insert into public.return_case_events(
    case_id,event_type,description,details
  )
  values(
    p_case_id,
    p_status,
    case
      when p_status='rejected'
        then 'Ocorrência recusada'
      else 'Ocorrência cancelada'
    end,
    jsonb_build_object(
      'notes',
      nullif(btrim(p_notes),'')
    )
  );

  return p_case_id;
end;
$$;

revoke all
on function public.close_return_case(
  uuid,text,text
)
from public,anon;

grant execute
on function public.close_return_case(
  uuid,text,text
)
to authenticated,service_role;
