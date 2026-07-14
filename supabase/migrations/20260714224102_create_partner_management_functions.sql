create or replace function public.save_partner(
  p_partner_id uuid,
  p_name text,
  p_partner_type text,
  p_city text default null,
  p_reference text default null,
  p_contact_name text default null,
  p_phone text default null,
  p_status text default 'Ativo',
  p_start_date date default null,
  p_end_date date default null,
  p_partnership_model text default null,
  p_settlement_rule text default null,
  p_reward_type text default 'manual',
  p_target_sales integer default null,
  p_reward_value numeric default 0,
  p_reward_description text default null,
  p_settlement_frequency text default 'manual',
  p_settlement_day integer default null,
  p_coupon_code text default null,
  p_linked_location_id uuid default null,
  p_counts_only_delivered boolean default true,
  p_can_hold_stock boolean default false,
  p_can_pickup boolean default false,
  p_can_sell boolean default false,
  p_can_deliver boolean default false,
  p_notes text default null,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := nullif(btrim(p_name),'');
  v_type text := nullif(btrim(p_partner_type),'');
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para gerenciar parceiros'; end if;
  if v_name is null then raise exception 'Informe o nome do parceiro'; end if;
  if v_type is null or lower(v_type) = 'supplier' then raise exception 'Tipo de parceiro inválido'; end if;
  if p_reward_type not in ('gift_per_sales','fixed_per_sale','percentage','manual','none') then raise exception 'Modelo de recompensa inválido'; end if;
  if p_reward_type = 'gift_per_sales' and coalesce(p_target_sales,0) <= 0 then raise exception 'Informe a meta de vendas'; end if;
  if p_reward_type in ('fixed_per_sale','percentage') and coalesce(p_reward_value,0) < 0 then raise exception 'Valor da recompensa inválido'; end if;
  if p_settlement_frequency not in ('on_target','monthly','manual','none') then raise exception 'Frequência de acerto inválida'; end if;
  if p_settlement_day is not null and (p_settlement_day < 1 or p_settlement_day > 31) then raise exception 'Dia do acerto inválido'; end if;
  if p_linked_location_id is not null and not exists(select 1 from public.locations where id=p_linked_location_id and active) then raise exception 'Ponto físico inválido'; end if;

  if p_partner_id is null then
    insert into public.partners(
      name,partner_type,city,reference,contact_name,phone,status,start_date,end_date,
      partnership_model,settlement_rule,commission_pct,active,can_hold_stock,can_pickup,
      can_sell,can_deliver,can_receive_operations,notes,source_sheet,original_id,
      linked_location_id,reward_type,target_sales,reward_value,reward_description,
      settlement_frequency,settlement_day,coupon_code,counts_only_delivered,updated_at
    ) values (
      v_name,v_type,nullif(btrim(p_city),''),nullif(btrim(p_reference),''),nullif(btrim(p_contact_name),''),
      nullif(btrim(p_phone),''),coalesce(nullif(btrim(p_status),''),'Ativo'),coalesce(p_start_date,(now() at time zone 'America/Sao_Paulo')::date),p_end_date,
      nullif(btrim(p_partnership_model),''),nullif(btrim(p_settlement_rule),''),
      case when p_reward_type='percentage' then coalesce(p_reward_value,0)/100 else 0 end,
      p_active,p_can_hold_stock,p_can_pickup,p_can_sell,p_can_deliver,false,nullif(btrim(p_notes),''),
      'APP_MANUAL',gen_random_uuid()::text,p_linked_location_id,p_reward_type,p_target_sales,
      coalesce(p_reward_value,0),nullif(btrim(p_reward_description),''),p_settlement_frequency,
      p_settlement_day,nullif(upper(btrim(p_coupon_code)),''),coalesce(p_counts_only_delivered,true),now()
    ) returning id into v_id;
  else
    update public.partners
    set name=v_name, partner_type=v_type, city=nullif(btrim(p_city),''), reference=nullif(btrim(p_reference),''),
        contact_name=nullif(btrim(p_contact_name),''), phone=nullif(btrim(p_phone),''),
        status=coalesce(nullif(btrim(p_status),''),'Ativo'), start_date=p_start_date, end_date=p_end_date,
        partnership_model=nullif(btrim(p_partnership_model),''), settlement_rule=nullif(btrim(p_settlement_rule),''),
        commission_pct=case when p_reward_type='percentage' then coalesce(p_reward_value,0)/100 else 0 end,
        active=p_active, can_hold_stock=p_can_hold_stock, can_pickup=p_can_pickup, can_sell=p_can_sell,
        can_deliver=p_can_deliver, notes=nullif(btrim(p_notes),''), linked_location_id=p_linked_location_id,
        reward_type=p_reward_type, target_sales=p_target_sales, reward_value=coalesce(p_reward_value,0),
        reward_description=nullif(btrim(p_reward_description),''), settlement_frequency=p_settlement_frequency,
        settlement_day=p_settlement_day, coupon_code=nullif(upper(btrim(p_coupon_code)),''),
        counts_only_delivered=coalesce(p_counts_only_delivered,true), updated_at=now()
    where id=p_partner_id and lower(partner_type)<>'supplier'
    returning id into v_id;
    if v_id is null then raise exception 'Parceiro não encontrado'; end if;
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('partner',v_id,case when p_partner_id is null then 'created' else 'updated' end,
    jsonb_build_object('name',v_name,'partner_type',v_type,'reward_type',p_reward_type,'linked_location_id',p_linked_location_id));
  return v_id;
end;
$$;

create or replace function public.assign_sale_partner(p_sale_id uuid,p_partner_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_partner public.partners%rowtype; v_previous uuid;
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para vincular vendas'; end if;
  select partner_id into v_previous from public.sales where id=p_sale_id and record_type='sale' for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  if p_partner_id is not null then
    select * into v_partner from public.partners where id=p_partner_id and lower(partner_type)<>'supplier' and coalesce(active,true);
    if not found then raise exception 'Parceiro inválido ou inativo'; end if;
  end if;
  update public.sales set partner_id=p_partner_id,partnership=case when p_partner_id is null then 'false' else v_partner.name end,updated_at=now() where id=p_sale_id;
  insert into public.audit_events(entity_type,entity_id,action,details)
  values('sale',p_sale_id,'partner_assigned',jsonb_build_object('previous_partner_id',v_previous,'partner_id',p_partner_id));
  return p_sale_id;
end;
$$;

create or replace function public.register_partner_settlement(
  p_partner_id uuid,
  p_settled_on date,
  p_period_end date,
  p_reward_amount numeric default null,
  p_reward_description text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner public.partners%rowtype;
  v_id uuid;
  v_start date;
  v_end date := coalesce(p_period_end,p_settled_on,(now() at time zone 'America/Sao_Paulo')::date);
  v_settled date := coalesce(p_settled_on,(now() at time zone 'America/Sao_Paulo')::date);
  v_count integer;
  v_revenue numeric(12,2);
  v_profit numeric(12,2);
  v_units integer := 0;
  v_amount numeric(12,2);
begin
  if not public.can_write() then raise exception 'Usuário sem permissão para registrar acertos'; end if;
  select * into v_partner from public.partners where id=p_partner_id and lower(partner_type)<>'supplier' for update;
  if not found then raise exception 'Parceiro não encontrado'; end if;
  select coalesce(max(period_end)+1,coalesce(v_partner.start_date,date '2000-01-01')) into v_start
  from public.partnership_settlements where partner_id=p_partner_id;
  if v_end < v_start then raise exception 'O período do acerto é anterior ao início do ciclo'; end if;

  select count(*)::integer,coalesce(sum(total_amount),0)::numeric(12,2),coalesce(sum(total_profit),0)::numeric(12,2)
  into v_count,v_revenue,v_profit
  from public.sales s
  where s.partner_id=p_partner_id and s.record_type='sale' and s.general_status<>'cancelled'
    and (not v_partner.counts_only_delivered or s.delivery_status='delivered')
    and coalesce((s.delivered_at at time zone 'America/Sao_Paulo')::date,(s.quoted_at at time zone 'America/Sao_Paulo')::date) between v_start and v_end;

  if v_partner.reward_type='gift_per_sales' and coalesce(v_partner.target_sales,0)>0 then
    v_units:=floor(v_count::numeric/v_partner.target_sales)::integer;
  end if;
  v_amount:=case
    when v_partner.reward_type='fixed_per_sale' then round(v_count*coalesce(v_partner.reward_value,0),2)
    when v_partner.reward_type='percentage' then round(v_revenue*coalesce(v_partner.reward_value,0)/100,2)
    else coalesce(p_reward_amount,0)
  end;

  insert into public.partnership_settlements(partner_id,settled_on,period_start,period_end,sale_count,gross_sales,gross_profit,reward_units,reward_amount,reward_description,notes)
  values(p_partner_id,v_settled,v_start,v_end,v_count,v_revenue,v_profit,v_units,v_amount,
    coalesce(nullif(btrim(p_reward_description),''),v_partner.reward_description),nullif(btrim(p_notes),''))
  returning id into v_id;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('partner',p_partner_id,'settlement_registered',jsonb_build_object('settlement_id',v_id,'period_start',v_start,'period_end',v_end,'sale_count',v_count,'gross_sales',v_revenue,'reward_units',v_units,'reward_amount',v_amount));
  return v_id;
end;
$$;
