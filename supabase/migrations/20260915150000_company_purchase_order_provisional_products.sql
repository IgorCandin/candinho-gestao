-- Cadastro rápido do item e pedido no mesmo commit: qualquer erro reverte ambos.
create or replace function public.create_company_purchase_order_with_products_v1(
  p_operation text,
  p_supplier_id uuid,
  p_supplier_name text,
  p_ordered_on date,
  p_expected_on date,
  p_destination_location_id uuid,
  p_freight numeric,
  p_responsible text,
  p_items jsonb,
  p_notes text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_draft jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_order_id uuid;
  v_name text;
  v_size text;
  v_color text;
begin
  if p_operation not in ('supplements', 'fitness') then raise exception 'Operação inválida'; end if;
  if p_operation = 'supplements' and not public.can_write() then raise exception 'Sem permissão para cadastrar Suplementos'; end if;
  if p_operation = 'fitness' and not public.can_write_fitness() then raise exception 'Sem permissão para cadastrar Fitness'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Informe de 1 a 50 itens';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_draft := v_item->'draft_product';
    if v_draft is not null and jsonb_typeof(v_draft) <> 'null' then
      v_name := nullif(btrim(v_draft->>'name'), '');
      if v_name is null then raise exception 'Informe o nome do novo produto'; end if;
      if p_operation = 'supplements' then
        v_product_id := public.create_product_record(
          p_name => v_name,
          p_category => coalesce(nullif(btrim(v_draft->>'category'), ''), 'Sem categoria'),
          p_cost_price => coalesce((v_item->>'unit_cost')::numeric, 0)
        );
        v_item := jsonb_set(v_item - 'draft_product', '{product_id}', to_jsonb(v_product_id::text));
      else
        v_size := coalesce(nullif(btrim(v_draft->>'size'), ''), 'Único');
        v_color := coalesce(nullif(btrim(v_draft->>'color'), ''), 'Sem cor');
        v_product_id := public.save_fitness_product_v2(
          null, v_name,
          coalesce(nullif(btrim(v_draft->>'category'), ''), 'Vestuário'),
          null, null, true, null,
          jsonb_build_array(jsonb_build_object('size', v_size, 'color', v_color,
            'cost_price', coalesce((v_item->>'unit_cost')::numeric, 0), 'sale_price', 0, 'active', true))
        );
        select id into v_variant_id from public.fitness_variants
        where product_id = v_product_id and size = v_size and color = v_color;
        if v_variant_id is null then raise exception 'Não foi possível criar a variação Fitness'; end if;
        v_item := jsonb_set(v_item - 'draft_product', '{variant_id}', to_jsonb(v_variant_id::text));
      end if;
    end if;
    v_items := v_items || jsonb_build_array(v_item);
  end loop;

  if p_operation = 'supplements' then
    v_order_id := public.create_purchase_order(p_supplier_id, p_ordered_on, p_destination_location_id, v_items, p_notes);
    if p_expected_on is not null then
      perform public.reschedule_operational_event('purchase_order', v_order_id, (p_expected_on::text || 'T12:00:00-03:00')::timestamptz);
    end if;
  else
    v_order_id := public.create_fitness_purchase_order_v2(p_supplier_id, p_supplier_name, p_ordered_on,
      p_expected_on, p_freight, p_responsible, v_items, p_notes);
  end if;
  return v_order_id;
end;
$$;

revoke all on function public.create_company_purchase_order_with_products_v1(text,uuid,text,date,date,uuid,numeric,text,jsonb,text) from public, anon;
grant execute on function public.create_company_purchase_order_with_products_v1(text,uuid,text,date,date,uuid,numeric,text,jsonb,text) to authenticated, service_role;

-- Cliente digitado na venda permanece provisório até o orçamento ser salvo.
create or replace function public.save_company_quote_with_customer_v1(p_customer_draft jsonb, p_quote jsonb)
returns table(quote_id uuid, lead_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_customer_id uuid;
begin
  if not public.can_write() then raise exception 'Sem permissão para registrar orçamento'; end if;
  if p_customer_draft is null or nullif(btrim(p_customer_draft->>'name'), '') is null then
    raise exception 'Informe o nome do novo cliente';
  end if;
  if p_quote is null or jsonb_typeof(p_quote) <> 'object' then raise exception 'Dados do orçamento inválidos'; end if;
  v_customer_id := public.create_customer(p_customer_draft->>'name', null, p_customer_draft->>'city', null, null);
  return query select r.quote_id, r.lead_id from public.save_budget_quote_v4(
    p_customer_id => v_customer_id,
    p_location_id => (p_quote->>'p_location_id')::uuid,
    p_quoted_on => (p_quote->>'p_quoted_on')::date,
    p_valid_until => (p_quote->>'p_valid_until')::date,
    p_items => p_quote->'p_items',
    p_discount_amount => coalesce((p_quote->>'p_discount_amount')::numeric, 0),
    p_gift_product_id => nullif(p_quote->>'p_gift_product_id', '')::uuid,
    p_gift_quantity => coalesce((p_quote->>'p_gift_quantity')::integer, 0),
    p_payment_mode => p_quote->>'p_payment_mode',
    p_paid_on => nullif(p_quote->>'p_paid_on', '')::date,
    p_payment_method => p_quote->>'p_payment_method',
    p_payment_due_on => nullif(p_quote->>'p_payment_due_on', '')::date,
    p_delivered => coalesce((p_quote->>'p_delivered')::boolean, false),
    p_delivered_on => nullif(p_quote->>'p_delivered_on', '')::date,
    p_delivery_due_on => nullif(p_quote->>'p_delivery_due_on', '')::date,
    p_schedule_post_sale => coalesce((p_quote->>'p_schedule_post_sale')::boolean, false),
    p_post_sale_due_on => nullif(p_quote->>'p_post_sale_due_on', '')::date,
    p_notes => p_quote->>'p_notes',
    p_partner_id => nullif(p_quote->>'p_partner_id', '')::uuid,
    p_existing_quote_id => nullif(p_quote->>'p_existing_quote_id', '')::uuid,
    p_payment_installments => coalesce(p_quote->'p_payment_installments', '[]'::jsonb),
    p_agreed_markup_amount => coalesce((p_quote->>'p_agreed_markup_amount')::numeric, 0)
  ) r;
end;
$$;
revoke all on function public.save_company_quote_with_customer_v1(jsonb,jsonb) from public, anon;
grant execute on function public.save_company_quote_with_customer_v1(jsonb,jsonb) to authenticated, service_role;
