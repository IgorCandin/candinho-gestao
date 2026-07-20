create or replace function public.create_return_case(
  p_operation text,
  p_sale_id uuid,
  p_case_type text,
  p_reason text,
  p_requested_on date,
  p_items jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_case_id uuid:=gen_random_uuid();
  v_sale public.sales%rowtype;
  v_fitness_sale public.fitness_sales%rowtype;
  v_item jsonb;
  v_item_id uuid;
  v_quantity integer;
  v_already integer;
  v_sale_item public.sale_items%rowtype;
  v_fitness_item public.fitness_sale_items%rowtype;
  v_product public.products%rowtype;
  v_variant public.fitness_variants%rowtype;
  v_fitness_product_name text;
  v_flavor_name text;
  v_customer_name text;
  v_customer_phone text;
  v_customer_id uuid;
begin
  if p_operation not in ('supplements','fitness') then
    raise exception 'Operação inválida';
  end if;

  if p_operation='supplements' and not public.can_write() then
    raise exception 'Usuário sem permissão para registrar trocas/devoluções de Suplementos';
  end if;

  if p_operation='fitness' and not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para registrar trocas/devoluções da Fitness';
  end if;

  if nullif(btrim(p_reason),'') is null then
    raise exception 'Informe o motivo da ocorrência';
  end if;

  if p_requested_on is null then
    raise exception 'Informe a data da solicitação';
  end if;

  if p_items is null
     or jsonb_typeof(p_items)<>'array'
     or jsonb_array_length(p_items)=0
  then
    raise exception 'Selecione pelo menos um item';
  end if;

  if p_operation='supplements' then
    select *
    into v_sale
    from public.sales
    where id=p_sale_id
      and record_type='sale'
      and general_status<>'cancelled'
      and delivery_status='delivered'
    for update;

    if not found then
      raise exception 'Venda de Suplementos não encontrada ou ainda não entregue';
    end if;

    select
      coalesce(c.name,v_sale.reference,'Cliente'),
      coalesce(c.phone,v_sale.phone),
      v_sale.customer_id
    into
      v_customer_name,
      v_customer_phone,
      v_customer_id
    from (select 1) x
    left join public.customers c
      on c.id=v_sale.customer_id;

    insert into public.return_cases(
      id,operation,case_type,original_sale_id,customer_id,
      customer_name,customer_phone,reason,requested_on,notes
    )
    values(
      v_case_id,'supplements',p_case_type,v_sale.id,v_customer_id,
      v_customer_name,v_customer_phone,btrim(p_reason),
      p_requested_on,nullif(btrim(p_notes),'')
    );

    for v_item in
      select value from jsonb_array_elements(p_items)
    loop
      v_item_id:=(v_item->>'item_id')::uuid;
      v_quantity:=coalesce((v_item->>'quantity')::integer,0);

      if v_quantity<=0 then
        raise exception 'Quantidade de devolução inválida';
      end if;

      select *
      into v_sale_item
      from public.sale_items
      where id=v_item_id
        and sale_id=v_sale.id
      for update;

      if not found then
        raise exception 'Item da venda não encontrado';
      end if;

      select *
      into v_product
      from public.products
      where id=v_sale_item.product_id;

      select name
      into v_flavor_name
      from public.product_flavors
      where id=v_sale_item.flavor_id;

      select
        coalesce(sum(rci.quantity_requested),0)::integer
      into v_already
      from public.return_case_items rci
      join public.return_cases rc
        on rc.id=rci.case_id
      where rci.sale_item_id=v_sale_item.id
        and rc.status not in ('rejected','cancelled');

      if v_quantity>v_sale_item.quantity-v_already then
        raise exception
          'A quantidade de % excede o saldo disponível para troca/devolução de %',
          v_product.name,
          v_sale_item.quantity-v_already;
      end if;

      insert into public.return_case_items(
        case_id,sale_item_id,product_id,flavor_id,item_name,
        variant_label,quantity_sold,quantity_requested,
        unit_cost,unit_price
      )
      values(
        v_case_id,v_sale_item.id,v_sale_item.product_id,
        v_sale_item.flavor_id,v_product.name,v_flavor_name,
        v_sale_item.quantity,v_quantity,
        v_sale_item.unit_cost,v_sale_item.unit_price
      );
    end loop;
  else
    select *
    into v_fitness_sale
    from public.fitness_sales
    where id=p_sale_id
      and general_status<>'cancelled'
      and delivery_status='delivered'
    for update;

    if not found then
      raise exception 'Venda Fitness não encontrada ou ainda não entregue';
    end if;

    v_customer_name:=v_fitness_sale.customer_name;
    v_customer_phone:=v_fitness_sale.customer_phone;

    insert into public.return_cases(
      id,operation,case_type,original_fitness_sale_id,
      customer_name,customer_phone,reason,requested_on,notes
    )
    values(
      v_case_id,'fitness',p_case_type,v_fitness_sale.id,
      v_customer_name,v_customer_phone,btrim(p_reason),
      p_requested_on,nullif(btrim(p_notes),'')
    );

    for v_item in
      select value from jsonb_array_elements(p_items)
    loop
      v_item_id:=(v_item->>'item_id')::uuid;
      v_quantity:=coalesce((v_item->>'quantity')::integer,0);

      if v_quantity<=0 then
        raise exception 'Quantidade de devolução inválida';
      end if;

      select *
      into v_fitness_item
      from public.fitness_sale_items
      where id=v_item_id
        and sale_id=v_fitness_sale.id
      for update;

      if not found then
        raise exception 'Item da venda Fitness não encontrado';
      end if;

      select *
      into v_variant
      from public.fitness_variants
      where id=v_fitness_item.variant_id;

      select name
      into v_fitness_product_name
      from public.fitness_products
      where id=v_variant.product_id;

      select
        coalesce(sum(rci.quantity_requested),0)::integer
      into v_already
      from public.return_case_items rci
      join public.return_cases rc
        on rc.id=rci.case_id
      where rci.fitness_sale_item_id=v_fitness_item.id
        and rc.status not in ('rejected','cancelled');

      if v_quantity>v_fitness_item.quantity-v_already then
        raise exception
          'A quantidade de % excede o saldo disponível para troca/devolução de %',
          v_fitness_product_name,
          v_fitness_item.quantity-v_already;
      end if;

      insert into public.return_case_items(
        case_id,fitness_sale_item_id,variant_id,item_name,
        variant_label,quantity_sold,quantity_requested,
        unit_cost,unit_price
      )
      values(
        v_case_id,v_fitness_item.id,v_fitness_item.variant_id,
        v_fitness_product_name,
        concat_ws(' · ',v_variant.color,v_variant.size),
        v_fitness_item.quantity,v_quantity,
        v_fitness_item.unit_cost,v_fitness_item.unit_price
      );
    end loop;
  end if;

  insert into public.return_case_events(
    case_id,event_type,description,details
  )
  values(
    v_case_id,'created','Ocorrência de pós-venda criada',
    jsonb_build_object(
      'operation',p_operation,
      'case_type',p_case_type,
      'sale_id',p_sale_id
    )
  );

  insert into public.audit_events(
    entity_type,entity_id,action,details
  )
  values(
    'return_case',v_case_id,'created',
    jsonb_build_object(
      'operation',p_operation,
      'case_type',p_case_type,
      'sale_id',p_sale_id,
      'requested_on',p_requested_on
    )
  );

  return v_case_id;
end;
$$;

revoke all
on function public.create_return_case(
  text,uuid,text,text,date,jsonb,text
)
from public,anon;

grant execute
on function public.create_return_case(
  text,uuid,text,text,date,jsonb,text
)
to authenticated,service_role;

create or replace function public.receive_return_case(
  p_case_id uuid,
  p_received_on date,
  p_items jsonb,
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
  v_quantity integer;
  v_condition text;
  v_notes text;
  v_total integer:=0;
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
    raise exception 'Usuário sem permissão para receber devoluções de Suplementos';
  end if;

  if v_case.operation='fitness'
     and not public.can_write_fitness()
  then
    raise exception 'Usuário sem permissão para receber devoluções da Fitness';
  end if;

  if v_case.status in ('resolved','rejected','cancelled') then
    raise exception 'Esta ocorrência já está encerrada';
  end if;

  if p_received_on is null then
    raise exception 'Informe a data de recebimento';
  end if;

  if p_items is null
     or jsonb_typeof(p_items)<>'array'
     or jsonb_array_length(p_items)=0
  then
    raise exception 'Informe os itens recebidos';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_item_id:=(v_item->>'item_id')::uuid;
    v_quantity:=coalesce((v_item->>'quantity_received')::integer,0);
    v_condition:=coalesce(nullif(v_item->>'condition',''),'pending');
    v_notes:=nullif(btrim(v_item->>'notes'),'');

    select *
    into v_case_item
    from public.return_case_items
    where id=v_item_id
      and case_id=p_case_id
    for update;

    if not found then
      raise exception 'Item da ocorrência não encontrado';
    end if;

    if v_quantity<0
       or v_quantity>v_case_item.quantity_requested
    then
      raise exception
        'Quantidade recebida inválida para %',
        v_case_item.item_name;
    end if;

    if v_condition not in (
      'sealed','unused','opened','used',
      'damaged','defective','wrong_item'
    )
    then
      raise exception
        'Condição inválida para %',
        v_case_item.item_name;
    end if;

    update public.return_case_items
    set quantity_received=v_quantity,
        item_condition=v_condition,
        notes=coalesce(v_notes,notes),
        updated_at=now()
    where id=v_item_id;

    v_total:=v_total+v_quantity;
  end loop;

  if v_total<=0 then
    raise exception 'Nenhuma unidade foi recebida';
  end if;

  update public.return_cases
  set status='inspection',
      received_on=p_received_on,
      notes=case
        when nullif(btrim(p_notes),'') is null
          then notes
        when notes is null
          then btrim(p_notes)
        else notes||' | Recebimento: '||btrim(p_notes)
      end,
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_case_id;

  insert into public.return_case_events(
    case_id,event_type,description,details
  )
  values(
    p_case_id,'received','Itens recebidos para conferência',
    jsonb_build_object(
      'received_on',p_received_on,
      'units',v_total
    )
  );

  return p_case_id;
end;
$$;

revoke all
on function public.receive_return_case(
  uuid,date,jsonb,text
)
from public,anon;

grant execute
on function public.receive_return_case(
  uuid,date,jsonb,text
)
to authenticated,service_role;
