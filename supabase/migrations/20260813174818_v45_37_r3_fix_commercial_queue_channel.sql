-- V45.37.R3 · Fila Comercial
-- Corrige o canal gravado em customer_interactions para respeitar
-- customer_interactions_channel_valid ("WhatsApp", ...).

create or replace function public.commercial_contact_action_v1(
  p_source_type text,
  p_source_id uuid,
  p_action text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_customer_id uuid;
  v_product_id uuid;
  v_sale_id uuid;
  v_customer_name text;
  v_product_name text;
  v_next date;
  v_attempt_id uuid;
  v_interaction_note text;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para trabalhar a fila comercial';
  end if;
  if p_source_type not in ('repurchase','lead') then raise exception 'Origem comercial inválida'; end if;
  if p_action not in ('contacted','skipped','no_response','responded') then raise exception 'Ação comercial inválida'; end if;

  if p_source_type='repurchase' then
    select r.customer_id,r.product_id,r.sale_id,c.name,p.name
    into v_customer_id,v_product_id,v_sale_id,v_customer_name,v_product_name
    from public.sale_replenishment_reminders r
    join public.customers c on c.id=r.customer_id
    join public.products p on p.id=r.product_id
    where r.id=p_source_id and r.status='planned';
  else
    select l.customer_id,
      (array_agg(si.product_id order by si.id) filter (where si.product_id is not null))[1],
      l.id,coalesce(c.name,'Lead'),
      coalesce(string_agg(p.name,', ' order by p.name) filter (where p.name is not null),'Interesse sem produto definido')
    into v_customer_id,v_product_id,v_sale_id,v_customer_name,v_product_name
    from public.sales l
    left join public.customers c on c.id=l.customer_id
    left join public.sale_items si on si.sale_id=l.id
    left join public.products p on p.id=si.product_id
    where l.id=p_source_id and l.record_type='lead' and l.general_status<>'cancelled'
    group by l.id,l.customer_id,c.name;
  end if;

  if v_customer_id is null then raise exception 'Contato comercial não encontrado ou já encerrado'; end if;

  v_next := case p_action
    when 'contacted' then v_today+2
    when 'skipped' then v_today
    when 'no_response' then v_today+7
    when 'responded' then v_today+3
  end;

  insert into public.commercial_contact_attempts(
    source_type,source_id,customer_id,product_id,action,next_eligible_on,notes,created_by
  ) values (
    p_source_type,p_source_id,v_customer_id,v_product_id,p_action,v_next,
    nullif(btrim(coalesce(p_notes,'')),''),auth.uid()
  ) returning id into v_attempt_id;

  if p_action<>'skipped' then
    v_interaction_note := concat_ws(E'\n',
      '[Fila Comercial] '||case p_source_type when 'repurchase' then 'Recompra' else 'Lead' end||
      ' · '||coalesce(v_product_name,'Produto não informado')||' · ação: '||p_action,
      nullif(btrim(coalesce(p_notes,'')),'')
    );
    insert into public.customer_interactions(
      customer_id,sale_id,interaction_type,status,channel,occurred_at,completed_at,outcome,notes,created_by
    ) values (
      v_customer_id,v_sale_id,'follow_up','completed','WhatsApp',now(),now(),p_action,v_interaction_note,auth.uid()
    );
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('commercial_contact',v_attempt_id,'queue_action',jsonb_build_object(
    'source_type',p_source_type,'source_id',p_source_id,'customer_id',v_customer_id,
    'customer_name',v_customer_name,'product_id',v_product_id,'product_name',v_product_name,
    'action',p_action,'next_eligible_on',v_next
  ));

  return jsonb_build_object('ok',true,'attempt_id',v_attempt_id,'action',p_action,'customer_id',v_customer_id,'next_eligible_on',v_next);
end;
$$;
