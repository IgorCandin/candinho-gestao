-- Candinho Company
-- Custos operacionais profissionais: custo médio, insumos, receitas de uso,
-- snapshot de custos por venda, margem de contribuição e integração com Bank.
-- Estrutura aditiva e compatível com vendas antigas.

begin;

-- -----------------------------------------------------------------------------
-- 1. Permissão central do módulo
-- -----------------------------------------------------------------------------
create or replace function public.can_manage_operational_costs()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select auth.uid() is not null
    and (
      public.can_write()
      or public.can_write_fitness()
      or public.can_write_bank()
    );
$$;

revoke all on function public.can_manage_operational_costs() from public,anon;
grant execute on function public.can_manage_operational_costs() to authenticated,service_role;

-- -----------------------------------------------------------------------------
-- 2. Estoque de insumos operacionais
-- -----------------------------------------------------------------------------
create table if not exists public.operational_supplies (
  id uuid primary key default gen_random_uuid(),
  operation_scope text not null default 'shared'
    check (operation_scope in ('shared','supplements','fitness')),
  name text not null,
  sku text,
  unit_name text not null default 'unidade',
  quantity_on_hand numeric(14,3) not null default 0,
  average_unit_cost numeric(14,4) not null default 0
    check (average_unit_cost>=0),
  min_quantity numeric(14,3) not null default 0
    check (min_quantity>=0),
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (btrim(name)<>''),
  check (btrim(unit_name)<>'')
);

create unique index if not exists operational_supplies_name_scope_uidx
on public.operational_supplies(operation_scope,lower(btrim(name)));

create index if not exists operational_supplies_active_idx
on public.operational_supplies(active,operation_scope,name);

create table if not exists public.operational_supply_receipts (
  id uuid primary key default gen_random_uuid(),
  supply_id uuid not null references public.operational_supplies(id) on delete restrict,
  received_on date not null,
  quantity numeric(14,3) not null check (quantity>0),
  total_cost numeric(14,2) not null check (total_cost>=0),
  unit_cost numeric(14,4) not null check (unit_cost>=0),
  supplier_name text,
  financial_status text not null default 'not_informed'
    check (financial_status in ('not_informed','paid','payable')),
  due_on date,
  payment_account_id uuid references public.bank_accounts(id) on delete set null,
  bank_charge_id uuid references public.bank_charges(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (financial_status<>'payable' or due_on is not null)
);

create index if not exists operational_supply_receipts_supply_date_idx
on public.operational_supply_receipts(supply_id,received_on desc,created_at desc);

create table if not exists public.operational_supply_movements (
  id uuid primary key default gen_random_uuid(),
  supply_id uuid not null references public.operational_supplies(id) on delete restrict,
  movement_type text not null
    check (movement_type in ('opening','purchase','sale_usage','adjustment','reversal')),
  quantity_delta numeric(14,3) not null check (quantity_delta<>0),
  unit_cost_snapshot numeric(14,4) not null default 0 check (unit_cost_snapshot>=0),
  total_cost_snapshot numeric(14,2) not null default 0 check (total_cost_snapshot>=0),
  operation_scope text
    check (operation_scope is null or operation_scope in ('supplements','fitness')),
  sale_id uuid references public.sales(id) on delete set null,
  fitness_sale_id uuid references public.fitness_sales(id) on delete set null,
  receipt_id uuid references public.operational_supply_receipts(id) on delete set null,
  notes text,
  idempotency_key text unique,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (not (sale_id is not null and fitness_sale_id is not null))
);

create index if not exists operational_supply_movements_supply_date_idx
on public.operational_supply_movements(supply_id,created_at desc);

-- -----------------------------------------------------------------------------
-- 3. Perfis/receitas de consumo
-- -----------------------------------------------------------------------------
create table if not exists public.operational_cost_profiles (
  id uuid primary key default gen_random_uuid(),
  operation_scope text not null check (operation_scope in ('supplements','fitness')),
  channel text not null default 'retail'
    check (channel in ('retail','delivery','partner','consignment')),
  name text not null,
  is_default boolean not null default false,
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (btrim(name)<>'')
);

create unique index if not exists operational_cost_profiles_name_uidx
on public.operational_cost_profiles(operation_scope,channel,lower(btrim(name)));

create unique index if not exists operational_cost_profiles_default_uidx
on public.operational_cost_profiles(operation_scope,channel)
where is_default and active;

create table if not exists public.operational_cost_profile_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.operational_cost_profiles(id) on delete cascade,
  supply_id uuid not null references public.operational_supplies(id) on delete restrict,
  usage_basis text not null default 'per_sale'
    check (usage_basis in ('per_sale','per_line','per_unit')),
  quantity numeric(14,3) not null check (quantity>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id,supply_id,usage_basis)
);

create table if not exists public.product_operational_supply_requirements (
  id uuid primary key default gen_random_uuid(),
  operation_scope text not null check (operation_scope in ('supplements','fitness')),
  product_id uuid references public.products(id) on delete cascade,
  fitness_product_id uuid references public.fitness_products(id) on delete cascade,
  supply_id uuid not null references public.operational_supplies(id) on delete restrict,
  quantity_per_unit numeric(14,3) not null check (quantity_per_unit>0),
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (operation_scope='supplements' and product_id is not null and fitness_product_id is null)
    or
    (operation_scope='fitness' and fitness_product_id is not null and product_id is null)
  )
);

create unique index if not exists product_operational_supply_req_supp_uidx
on public.product_operational_supply_requirements(product_id,supply_id)
where operation_scope='supplements';

create unique index if not exists product_operational_supply_req_fit_uidx
on public.product_operational_supply_requirements(fitness_product_id,supply_id)
where operation_scope='fitness';

-- -----------------------------------------------------------------------------
-- 4. Snapshot de custo por venda
-- -----------------------------------------------------------------------------
alter table public.sales
  add column if not exists operational_cost_profile_id uuid
    references public.operational_cost_profiles(id) on delete set null,
  add column if not exists operational_cost_total numeric(12,2) not null default 0,
  add column if not exists contribution_margin numeric(12,2) not null default 0,
  add column if not exists cost_snapshot_status text not null default 'legacy'
    check (cost_snapshot_status in ('legacy','pending','finalized','reversed'));

alter table public.fitness_sales
  add column if not exists operational_cost_profile_id uuid
    references public.operational_cost_profiles(id) on delete set null,
  add column if not exists operational_cost_total numeric(12,2) not null default 0,
  add column if not exists contribution_margin numeric(12,2) not null default 0,
  add column if not exists cost_snapshot_status text not null default 'legacy'
    check (cost_snapshot_status in ('legacy','pending','finalized','reversed'));

create table if not exists public.sale_operational_cost_snapshots (
  id uuid primary key default gen_random_uuid(),
  operation_scope text not null check (operation_scope in ('supplements','fitness')),
  sale_id uuid references public.sales(id) on delete cascade,
  fitness_sale_id uuid references public.fitness_sales(id) on delete cascade,
  profile_id uuid references public.operational_cost_profiles(id) on delete set null,
  channel text not null,
  merchandise_cost_total numeric(12,2) not null default 0,
  operational_cost_total numeric(12,2) not null default 0,
  variable_cost_total numeric(12,2) not null default 0,
  revenue_total numeric(12,2) not null default 0,
  gross_profit numeric(12,2) not null default 0,
  contribution_margin numeric(12,2) not null default 0,
  negative_supply_count integer not null default 0,
  status text not null default 'finalized' check (status in ('finalized','reversed')),
  applied_at timestamptz not null default now(),
  reversed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (
    (operation_scope='supplements' and sale_id is not null and fitness_sale_id is null)
    or
    (operation_scope='fitness' and fitness_sale_id is not null and sale_id is null)
  )
);

create unique index if not exists sale_operational_cost_snapshot_supp_uidx
on public.sale_operational_cost_snapshots(sale_id)
where operation_scope='supplements';

create unique index if not exists sale_operational_cost_snapshot_fit_uidx
on public.sale_operational_cost_snapshots(fitness_sale_id)
where operation_scope='fitness';

create table if not exists public.sale_operational_cost_snapshot_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.sale_operational_cost_snapshots(id) on delete cascade,
  supply_id uuid not null references public.operational_supplies(id) on delete restrict,
  source_type text not null check (source_type in ('profile','product')),
  source_label text,
  usage_basis text not null check (usage_basis in ('per_sale','per_line','per_unit')),
  quantity numeric(14,3) not null check (quantity>0),
  unit_cost numeric(14,4) not null check (unit_cost>=0),
  total_cost numeric(12,2) not null check (total_cost>=0),
  created_at timestamptz not null default now()
);

create index if not exists sale_operational_cost_snapshot_items_snapshot_idx
on public.sale_operational_cost_snapshot_items(snapshot_id,supply_id);

-- -----------------------------------------------------------------------------
-- 5. Custo médio móvel dos produtos recebidos
-- -----------------------------------------------------------------------------
alter table public.products
  add column if not exists cost_method text not null default 'moving_average'
    check (cost_method in ('moving_average','manual')),
  add column if not exists last_purchase_cost numeric(12,2),
  add column if not exists last_purchase_on date,
  add column if not exists cost_updated_from_receipt_id uuid
    references public.purchase_receipts(id) on delete set null;

alter table public.purchase_receipts
  add column if not exists previous_stock_quantity numeric(14,3),
  add column if not exists previous_average_unit_cost numeric(14,4),
  add column if not exists calculated_average_unit_cost numeric(14,4);

create or replace function public.capture_product_moving_average_before_receipt()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_product_id uuid;
  v_current_stock numeric(14,3);
  v_previous_stock numeric(14,3);
  v_previous_cost numeric(14,4);
begin
  select poi.product_id
  into v_product_id
  from public.purchase_order_items poi
  where poi.id=new.purchase_order_item_id;

  if v_product_id is null then
    return new;
  end if;

  select coalesce(sum(sb.quantity),0)::numeric(14,3)
  into v_current_stock
  from public.stock_balances sb
  where sb.product_id=v_product_id;

  select coalesce(p.cost_price,0)::numeric(14,4)
  into v_previous_cost
  from public.products p
  where p.id=v_product_id;

  -- O movimento de entrada já foi registrado antes do receipt.
  v_previous_stock:=greatest(v_current_stock-new.quantity_received,0);

  new.previous_stock_quantity:=v_previous_stock;
  new.previous_average_unit_cost:=v_previous_cost;
  new.calculated_average_unit_cost:=case
    when v_previous_stock<=0 then new.unit_cost
    else round(
      (
        v_previous_stock*v_previous_cost
        +new.quantity_received*new.unit_cost
      )/(v_previous_stock+new.quantity_received),
      4
    )
  end;

  return new;
end;
$$;

drop trigger if exists purchase_receipts_capture_moving_average
on public.purchase_receipts;
create trigger purchase_receipts_capture_moving_average
before insert on public.purchase_receipts
for each row execute function public.capture_product_moving_average_before_receipt();

create or replace function public.apply_product_moving_average_after_receipt()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_product_id uuid;
begin
  select poi.product_id
  into v_product_id
  from public.purchase_order_items poi
  where poi.id=new.purchase_order_item_id;

  if v_product_id is not null then
    update public.products
    set cost_price=round(coalesce(new.calculated_average_unit_cost,new.unit_cost),2),
        last_purchase_cost=new.unit_cost,
        last_purchase_on=new.received_on,
        cost_updated_from_receipt_id=new.id,
        updated_at=now()
    where id=v_product_id
      and cost_method='moving_average';
  end if;

  return null;
end;
$$;

drop trigger if exists purchase_receipts_apply_moving_average
on public.purchase_receipts;
create constraint trigger purchase_receipts_apply_moving_average
after insert on public.purchase_receipts
deferrable initially deferred
for each row execute function public.apply_product_moving_average_after_receipt();

-- -----------------------------------------------------------------------------
-- 6. Escritas seguras para insumos e perfis
-- -----------------------------------------------------------------------------
create or replace function public.create_operational_supply(
  p_operation_scope text,
  p_name text,
  p_unit_name text default 'unidade',
  p_sku text default null,
  p_min_quantity numeric default 0,
  p_opening_quantity numeric default 0,
  p_opening_total_cost numeric default 0,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
  v_unit_cost numeric(14,4):=0;
begin
  if not public.can_manage_operational_costs() then
    raise exception 'Usuário sem permissão para cadastrar insumos';
  end if;
  if p_operation_scope not in ('shared','supplements','fitness') then
    raise exception 'Operação inválida';
  end if;
  if nullif(btrim(p_name),'') is null then raise exception 'Informe o nome do insumo'; end if;
  if coalesce(p_min_quantity,0)<0 or coalesce(p_opening_quantity,0)<0 or coalesce(p_opening_total_cost,0)<0 then
    raise exception 'Quantidade e custos não podem ser negativos';
  end if;
  if coalesce(p_opening_quantity,0)=0 and coalesce(p_opening_total_cost,0)>0 then
    raise exception 'Informe a quantidade inicial para registrar o custo inicial';
  end if;

  if coalesce(p_opening_quantity,0)>0 then
    v_unit_cost:=round(coalesce(p_opening_total_cost,0)/p_opening_quantity,4);
  end if;

  insert into public.operational_supplies(
    operation_scope,name,sku,unit_name,quantity_on_hand,average_unit_cost,
    min_quantity,notes,created_by,updated_by
  ) values (
    p_operation_scope,btrim(p_name),nullif(btrim(p_sku),''),coalesce(nullif(btrim(p_unit_name),''),'unidade'),
    coalesce(p_opening_quantity,0),v_unit_cost,coalesce(p_min_quantity,0),nullif(btrim(p_notes),''),auth.uid(),auth.uid()
  ) returning id into v_id;

  if coalesce(p_opening_quantity,0)>0 then
    insert into public.operational_supply_movements(
      supply_id,movement_type,quantity_delta,unit_cost_snapshot,total_cost_snapshot,
      notes,idempotency_key
    ) values (
      v_id,'opening',p_opening_quantity,v_unit_cost,round(p_opening_quantity*v_unit_cost,2),
      'Saldo inicial do insumo','operational-supply:opening:'||v_id::text
    );
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('operational_supply',v_id,'created',jsonb_build_object(
    'operation_scope',p_operation_scope,
    'opening_quantity',coalesce(p_opening_quantity,0),
    'opening_unit_cost',v_unit_cost
  ));

  return v_id;
end;
$$;

create or replace function public.receive_operational_supply(
  p_supply_id uuid,
  p_received_on date,
  p_quantity numeric,
  p_total_cost numeric,
  p_supplier_name text default null,
  p_financial_status text default 'not_informed',
  p_due_on date default null,
  p_payment_account_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_supply public.operational_supplies%rowtype;
  v_receipt_id uuid:=gen_random_uuid();
  v_charge_id uuid;
  v_unit_cost numeric(14,4);
  v_new_average numeric(14,4);
  v_base_quantity numeric(14,3);
  v_charge_due date;
  v_charge_status text;
  v_paid_amount numeric(14,2);
begin
  if not public.can_manage_operational_costs() then
    raise exception 'Usuário sem permissão para receber insumos';
  end if;
  if p_received_on is null then raise exception 'Informe a data da compra'; end if;
  if coalesce(p_quantity,0)<=0 then raise exception 'A quantidade precisa ser maior que zero'; end if;
  if coalesce(p_total_cost,0)<0 then raise exception 'O custo total não pode ser negativo'; end if;
  if p_financial_status not in ('not_informed','paid','payable') then raise exception 'Situação financeira inválida'; end if;
  if p_financial_status='payable' and p_due_on is null then raise exception 'Informe o vencimento da compra a pagar'; end if;

  select * into v_supply
  from public.operational_supplies
  where id=p_supply_id and active
  for update;
  if not found then raise exception 'Insumo não encontrado ou inativo'; end if;

  v_unit_cost:=round(p_total_cost/p_quantity,4);
  v_base_quantity:=greatest(v_supply.quantity_on_hand,0);
  v_new_average:=case
    when v_base_quantity<=0 then v_unit_cost
    else round(
      (v_base_quantity*v_supply.average_unit_cost+p_quantity*v_unit_cost)
      /(v_base_quantity+p_quantity),
      4
    )
  end;

  insert into public.operational_supply_receipts(
    id,supply_id,received_on,quantity,total_cost,unit_cost,supplier_name,
    financial_status,due_on,payment_account_id,notes
  ) values (
    v_receipt_id,p_supply_id,p_received_on,p_quantity,round(p_total_cost,2),v_unit_cost,
    nullif(btrim(p_supplier_name),''),p_financial_status,p_due_on,p_payment_account_id,
    nullif(btrim(p_notes),'')
  );

  update public.operational_supplies
  set quantity_on_hand=quantity_on_hand+p_quantity,
      average_unit_cost=v_new_average,
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_supply_id;

  insert into public.operational_supply_movements(
    supply_id,movement_type,quantity_delta,unit_cost_snapshot,total_cost_snapshot,
    receipt_id,notes,idempotency_key
  ) values (
    p_supply_id,'purchase',p_quantity,v_unit_cost,round(p_total_cost,2),v_receipt_id,
    concat_ws(' · ','Compra de insumo',nullif(btrim(p_supplier_name),'')),
    'operational-supply:receipt:'||v_receipt_id::text
  );

  if p_financial_status in ('paid','payable') then
    v_charge_due:=case when p_financial_status='paid' then p_received_on else p_due_on end;
    v_charge_status:=case when p_financial_status='paid' then 'paid' else 'pending' end;
    v_paid_amount:=case when p_financial_status='paid' then round(p_total_cost,2) else 0 end;

    insert into public.bank_charges(
      title,description,amount,paid_amount,due_date,status,category,origin,
      charge_type,source_id,payment_account_id,paid_on,notes,created_by,updated_by
    ) values (
      'Compra de insumo: '||v_supply.name,
      concat_ws(' · ',nullif(btrim(p_supplier_name),''),p_quantity::text||' '||v_supply.unit_name),
      round(p_total_cost,2),v_paid_amount,v_charge_due,v_charge_status,
      'Insumos operacionais','Candinho Company','other',v_receipt_id,
      p_payment_account_id,case when p_financial_status='paid' then p_received_on else null end,
      nullif(btrim(p_notes),''),auth.uid(),auth.uid()
    ) returning id into v_charge_id;

    update public.operational_supply_receipts
    set bank_charge_id=v_charge_id
    where id=v_receipt_id;
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('operational_supply',p_supply_id,'receipt',jsonb_build_object(
    'receipt_id',v_receipt_id,
    'quantity',p_quantity,
    'unit_cost',v_unit_cost,
    'new_average_cost',v_new_average,
    'financial_status',p_financial_status,
    'bank_charge_id',v_charge_id
  ));

  return v_receipt_id;
end;
$$;

create or replace function public.count_operational_supply(
  p_supply_id uuid,
  p_counted_quantity numeric,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_supply public.operational_supplies%rowtype;
  v_delta numeric(14,3);
  v_movement_id uuid;
begin
  if not public.can_manage_operational_costs() then raise exception 'Usuário sem permissão para contar insumos'; end if;
  if coalesce(p_counted_quantity,-1)<0 then raise exception 'A contagem não pode ser negativa'; end if;

  select * into v_supply from public.operational_supplies where id=p_supply_id for update;
  if not found then raise exception 'Insumo não encontrado'; end if;

  v_delta:=p_counted_quantity-v_supply.quantity_on_hand;
  if v_delta=0 then return null; end if;

  update public.operational_supplies
  set quantity_on_hand=p_counted_quantity,updated_by=auth.uid(),updated_at=now()
  where id=p_supply_id;

  insert into public.operational_supply_movements(
    supply_id,movement_type,quantity_delta,unit_cost_snapshot,total_cost_snapshot,notes,idempotency_key
  ) values (
    p_supply_id,'adjustment',v_delta,v_supply.average_unit_cost,
    round(abs(v_delta)*v_supply.average_unit_cost,2),nullif(btrim(p_notes),''),
    'operational-supply:count:'||gen_random_uuid()::text
  ) returning id into v_movement_id;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('operational_supply',p_supply_id,'counted',jsonb_build_object(
    'previous_quantity',v_supply.quantity_on_hand,
    'counted_quantity',p_counted_quantity,
    'delta',v_delta,
    'movement_id',v_movement_id
  ));

  return v_movement_id;
end;
$$;

create or replace function public.save_operational_cost_profile(
  p_profile_id uuid,
  p_operation_scope text,
  p_channel text,
  p_name text,
  p_is_default boolean,
  p_active boolean,
  p_items jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
  v_item record;
begin
  if not public.can_manage_operational_costs() then raise exception 'Usuário sem permissão para configurar custos'; end if;
  if p_operation_scope not in ('supplements','fitness') then raise exception 'Operação inválida'; end if;
  if p_channel not in ('retail','delivery','partner','consignment') then raise exception 'Canal inválido'; end if;
  if nullif(btrim(p_name),'') is null then raise exception 'Informe o nome do perfil'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Itens do perfil inválidos'; end if;

  if coalesce(p_is_default,false) then
    update public.operational_cost_profiles
    set is_default=false,updated_by=auth.uid(),updated_at=now()
    where operation_scope=p_operation_scope and channel=p_channel and is_default;
  end if;

  if p_profile_id is null then
    insert into public.operational_cost_profiles(
      operation_scope,channel,name,is_default,active,notes,created_by,updated_by
    ) values (
      p_operation_scope,p_channel,btrim(p_name),coalesce(p_is_default,false),coalesce(p_active,true),
      nullif(btrim(p_notes),''),auth.uid(),auth.uid()
    ) returning id into v_id;
  else
    update public.operational_cost_profiles
    set operation_scope=p_operation_scope,channel=p_channel,name=btrim(p_name),
        is_default=coalesce(p_is_default,false),active=coalesce(p_active,true),
        notes=nullif(btrim(p_notes),''),updated_by=auth.uid(),updated_at=now()
    where id=p_profile_id
    returning id into v_id;
    if v_id is null then raise exception 'Perfil não encontrado'; end if;
  end if;

  delete from public.operational_cost_profile_items where profile_id=v_id;

  for v_item in
    select *
    from jsonb_to_recordset(p_items)
      as x(supply_id uuid,usage_basis text,quantity numeric)
  loop
    if v_item.supply_id is null or coalesce(v_item.quantity,0)<=0 then
      raise exception 'Revise o insumo e a quantidade do perfil';
    end if;
    if v_item.usage_basis not in ('per_sale','per_line','per_unit') then
      raise exception 'Base de consumo inválida';
    end if;
    if not exists(
      select 1 from public.operational_supplies s
      where s.id=v_item.supply_id and s.active
        and s.operation_scope in ('shared',p_operation_scope)
    ) then
      raise exception 'Insumo incompatível com a operação';
    end if;

    insert into public.operational_cost_profile_items(profile_id,supply_id,usage_basis,quantity)
    values(v_id,v_item.supply_id,v_item.usage_basis,v_item.quantity);
  end loop;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values('operational_cost_profile',v_id,'saved',jsonb_build_object(
    'operation_scope',p_operation_scope,'channel',p_channel,
    'is_default',p_is_default,'item_count',jsonb_array_length(p_items)
  ));

  return v_id;
end;
$$;

create or replace function public.save_product_operational_requirement(
  p_operation_scope text,
  p_product_id uuid,
  p_supply_id uuid,
  p_quantity_per_unit numeric,
  p_active boolean default true,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
begin
  if not public.can_manage_operational_costs() then raise exception 'Usuário sem permissão para configurar custos do produto'; end if;
  if p_operation_scope not in ('supplements','fitness') then raise exception 'Operação inválida'; end if;
  if coalesce(p_quantity_per_unit,0)<=0 then raise exception 'A quantidade por unidade precisa ser maior que zero'; end if;
  if not exists(
    select 1 from public.operational_supplies s
    where s.id=p_supply_id and s.active and s.operation_scope in ('shared',p_operation_scope)
  ) then raise exception 'Insumo inválido para a operação'; end if;

  if p_operation_scope='supplements' then
    if not exists(select 1 from public.products where id=p_product_id) then raise exception 'Produto não encontrado'; end if;
    insert into public.product_operational_supply_requirements(
      operation_scope,product_id,supply_id,quantity_per_unit,active,notes,created_by,updated_by
    ) values (
      'supplements',p_product_id,p_supply_id,p_quantity_per_unit,coalesce(p_active,true),
      nullif(btrim(p_notes),''),auth.uid(),auth.uid()
    )
    on conflict(product_id,supply_id) where operation_scope='supplements'
    do update set quantity_per_unit=excluded.quantity_per_unit,active=excluded.active,
      notes=excluded.notes,updated_by=auth.uid(),updated_at=now()
    returning id into v_id;
  else
    if not exists(select 1 from public.fitness_products where id=p_product_id) then raise exception 'Produto Fitness não encontrado'; end if;
    insert into public.product_operational_supply_requirements(
      operation_scope,fitness_product_id,supply_id,quantity_per_unit,active,notes,created_by,updated_by
    ) values (
      'fitness',p_product_id,p_supply_id,p_quantity_per_unit,coalesce(p_active,true),
      nullif(btrim(p_notes),''),auth.uid(),auth.uid()
    )
    on conflict(fitness_product_id,supply_id) where operation_scope='fitness'
    do update set quantity_per_unit=excluded.quantity_per_unit,active=excluded.active,
      notes=excluded.notes,updated_by=auth.uid(),updated_at=now()
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.remove_product_operational_requirement(p_requirement_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.can_manage_operational_costs() then raise exception 'Usuário sem permissão para remover o custo do produto'; end if;
  delete from public.product_operational_supply_requirements where id=p_requirement_id;
  return p_requirement_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Motor de custos por venda
-- -----------------------------------------------------------------------------
create or replace function public.apply_sale_operational_costs(
  p_operation_scope text,
  p_sale_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_snapshot_id uuid;
  v_profile_id uuid;
  v_channel text;
  v_line_count integer:=0;
  v_unit_count numeric(14,3):=0;
  v_merchandise_cost numeric(12,2):=0;
  v_revenue numeric(12,2):=0;
  v_gross_profit numeric(12,2):=0;
  v_operational_cost numeric(12,2):=0;
  v_negative_count integer:=0;
  v_has_rules boolean:=false;
  v_row record;
begin
  if p_operation_scope not in ('supplements','fitness') then
    raise exception 'Operação inválida para custeio';
  end if;

  if p_operation_scope='supplements' then
    if not exists(
      select 1 from public.sales s
      where s.id=p_sale_id and s.record_type='sale'
        and s.general_status<>'cancelled' and s.delivery_status='delivered'
    ) then return null; end if;

    select id into v_snapshot_id
    from public.sale_operational_cost_snapshots
    where operation_scope='supplements' and sale_id=p_sale_id and status='finalized';
    if v_snapshot_id is not null then return v_snapshot_id; end if;

    select
      case when s.partner_id is not null then 'partner' else 'retail' end,
      count(si.id)::integer,
      coalesce(sum(si.quantity),0)::numeric(14,3),
      coalesce(s.total_cost,0),coalesce(s.total_amount,0),coalesce(s.total_profit,0)
    into v_channel,v_line_count,v_unit_count,v_merchandise_cost,v_revenue,v_gross_profit
    from public.sales s
    left join public.sale_items si on si.sale_id=s.id
    where s.id=p_sale_id
    group by s.id;
  else
    if not exists(
      select 1 from public.fitness_sales s
      where s.id=p_sale_id and s.general_status<>'cancelled' and s.delivery_status='delivered'
    ) then return null; end if;

    select id into v_snapshot_id
    from public.sale_operational_cost_snapshots
    where operation_scope='fitness' and fitness_sale_id=p_sale_id and status='finalized';
    if v_snapshot_id is not null then return v_snapshot_id; end if;

    select
      case when s.source_consignment_id is not null then 'consignment' else 'retail' end,
      count(si.id)::integer,
      coalesce(sum(si.quantity),0)::numeric(14,3),
      coalesce(s.total_cost,0),coalesce(s.total_amount,0),coalesce(s.total_profit,0)
    into v_channel,v_line_count,v_unit_count,v_merchandise_cost,v_revenue,v_gross_profit
    from public.fitness_sales s
    left join public.fitness_sale_items si on si.sale_id=s.id
    where s.id=p_sale_id
    group by s.id;
  end if;

  select p.id into v_profile_id
  from public.operational_cost_profiles p
  where p.operation_scope=p_operation_scope and p.channel=v_channel
    and p.active and p.is_default
  limit 1;

  if v_profile_id is null then
    select p.id into v_profile_id
    from public.operational_cost_profiles p
    where p.operation_scope=p_operation_scope and p.channel='retail'
      and p.active and p.is_default
    limit 1;
  end if;

  select
    exists(
      select 1 from public.operational_cost_profile_items i
      join public.operational_supplies s on s.id=i.supply_id and s.active
      where i.profile_id=v_profile_id
    )
    or exists(
      select 1
      from public.product_operational_supply_requirements r
      where r.operation_scope=p_operation_scope and r.active
        and (
          (p_operation_scope='supplements' and exists(
            select 1 from public.sale_items si
            where si.sale_id=p_sale_id and si.product_id=r.product_id
          ))
          or
          (p_operation_scope='fitness' and exists(
            select 1 from public.fitness_sale_items fsi
            join public.fitness_variants fv on fv.id=fsi.variant_id
            where fsi.sale_id=p_sale_id and fv.product_id=r.fitness_product_id
          ))
        )
    )
  into v_has_rules;

  -- Não congela custo zero enquanto a operação ainda não foi configurada.
  if not v_has_rules then
    if p_operation_scope='supplements' then
      update public.sales set cost_snapshot_status='pending',updated_at=now()
      where id=p_sale_id and cost_snapshot_status<>'finalized';
    else
      update public.fitness_sales set cost_snapshot_status='pending',updated_at=now()
      where id=p_sale_id and cost_snapshot_status<>'finalized';
    end if;
    return null;
  end if;

  insert into public.sale_operational_cost_snapshots(
    operation_scope,sale_id,fitness_sale_id,profile_id,channel,
    merchandise_cost_total,revenue_total,gross_profit,status
  ) values (
    p_operation_scope,
    case when p_operation_scope='supplements' then p_sale_id else null end,
    case when p_operation_scope='fitness' then p_sale_id else null end,
    v_profile_id,v_channel,v_merchandise_cost,v_revenue,v_gross_profit,'finalized'
  ) returning id into v_snapshot_id;

  if v_profile_id is not null then
    insert into public.sale_operational_cost_snapshot_items(
      snapshot_id,supply_id,source_type,source_label,usage_basis,quantity,unit_cost,total_cost
    )
    select
      v_snapshot_id,i.supply_id,'profile',p.name,i.usage_basis,
      case i.usage_basis
        when 'per_sale' then i.quantity
        when 'per_line' then i.quantity*v_line_count
        else i.quantity*v_unit_count
      end,
      s.average_unit_cost,
      round(
        (case i.usage_basis
          when 'per_sale' then i.quantity
          when 'per_line' then i.quantity*v_line_count
          else i.quantity*v_unit_count
        end)*s.average_unit_cost,
        2
      )
    from public.operational_cost_profile_items i
    join public.operational_cost_profiles p on p.id=i.profile_id
    join public.operational_supplies s on s.id=i.supply_id and s.active
    where i.profile_id=v_profile_id;
  end if;

  if p_operation_scope='supplements' then
    insert into public.sale_operational_cost_snapshot_items(
      snapshot_id,supply_id,source_type,source_label,usage_basis,quantity,unit_cost,total_cost
    )
    select
      v_snapshot_id,r.supply_id,'product',p.name,'per_unit',
      sum(si.quantity*r.quantity_per_unit)::numeric(14,3),
      s.average_unit_cost,
      round(sum(si.quantity*r.quantity_per_unit)*s.average_unit_cost,2)
    from public.sale_items si
    join public.products p on p.id=si.product_id
    join public.product_operational_supply_requirements r
      on r.operation_scope='supplements' and r.product_id=si.product_id and r.active
    join public.operational_supplies s on s.id=r.supply_id and s.active
    where si.sale_id=p_sale_id
    group by r.supply_id,p.name,s.average_unit_cost;
  else
    insert into public.sale_operational_cost_snapshot_items(
      snapshot_id,supply_id,source_type,source_label,usage_basis,quantity,unit_cost,total_cost
    )
    select
      v_snapshot_id,r.supply_id,'product',fp.name,'per_unit',
      sum(si.quantity*r.quantity_per_unit)::numeric(14,3),
      s.average_unit_cost,
      round(sum(si.quantity*r.quantity_per_unit)*s.average_unit_cost,2)
    from public.fitness_sale_items si
    join public.fitness_variants fv on fv.id=si.variant_id
    join public.fitness_products fp on fp.id=fv.product_id
    join public.product_operational_supply_requirements r
      on r.operation_scope='fitness' and r.fitness_product_id=fv.product_id and r.active
    join public.operational_supplies s on s.id=r.supply_id and s.active
    where si.sale_id=p_sale_id
    group by r.supply_id,fp.name,s.average_unit_cost;
  end if;

  for v_row in
    select supply_id,sum(quantity)::numeric(14,3) quantity,
      max(unit_cost)::numeric(14,4) unit_cost,
      sum(total_cost)::numeric(12,2) total_cost
    from public.sale_operational_cost_snapshot_items
    where snapshot_id=v_snapshot_id
    group by supply_id
    order by supply_id
  loop
    perform 1 from public.operational_supplies where id=v_row.supply_id for update;

    update public.operational_supplies
    set quantity_on_hand=quantity_on_hand-v_row.quantity,
        updated_by=auth.uid(),updated_at=now()
    where id=v_row.supply_id;

    insert into public.operational_supply_movements(
      supply_id,movement_type,quantity_delta,unit_cost_snapshot,total_cost_snapshot,
      operation_scope,sale_id,fitness_sale_id,notes,idempotency_key
    ) values (
      v_row.supply_id,'sale_usage',-v_row.quantity,v_row.unit_cost,v_row.total_cost,
      p_operation_scope,
      case when p_operation_scope='supplements' then p_sale_id else null end,
      case when p_operation_scope='fitness' then p_sale_id else null end,
      'Consumo reconhecido na entrega da venda',
      'operational-cost:'||p_operation_scope||':'||p_sale_id::text||':'||v_row.supply_id::text
    ) on conflict(idempotency_key) do nothing;
  end loop;

  select coalesce(sum(total_cost),0)::numeric(12,2)
  into v_operational_cost
  from public.sale_operational_cost_snapshot_items
  where snapshot_id=v_snapshot_id;

  select count(*)::integer into v_negative_count
  from (
    select distinct i.supply_id
    from public.sale_operational_cost_snapshot_items i
    join public.operational_supplies s on s.id=i.supply_id
    where i.snapshot_id=v_snapshot_id and s.quantity_on_hand<0
  ) x;

  update public.sale_operational_cost_snapshots
  set operational_cost_total=v_operational_cost,
      variable_cost_total=v_merchandise_cost+v_operational_cost,
      contribution_margin=v_gross_profit-v_operational_cost,
      negative_supply_count=v_negative_count
  where id=v_snapshot_id;

  if p_operation_scope='supplements' then
    update public.sales
    set operational_cost_profile_id=v_profile_id,
        operational_cost_total=v_operational_cost,
        contribution_margin=v_gross_profit-v_operational_cost,
        cost_snapshot_status='finalized',updated_at=now()
    where id=p_sale_id;
  else
    update public.fitness_sales
    set operational_cost_profile_id=v_profile_id,
        operational_cost_total=v_operational_cost,
        contribution_margin=v_gross_profit-v_operational_cost,
        cost_snapshot_status='finalized',updated_at=now()
    where id=p_sale_id;
  end if;

  insert into public.audit_events(entity_type,entity_id,action,details)
  values(
    case when p_operation_scope='supplements' then 'sale' else 'fitness_sale' end,
    p_sale_id,'operational_costs_applied',jsonb_build_object(
      'snapshot_id',v_snapshot_id,'profile_id',v_profile_id,'channel',v_channel,
      'operational_cost_total',v_operational_cost,
      'contribution_margin',v_gross_profit-v_operational_cost,
      'negative_supply_count',v_negative_count
    )
  );

  return v_snapshot_id;
end;
$$;

create or replace function public.reverse_sale_operational_costs(
  p_operation_scope text,
  p_sale_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_snapshot public.sale_operational_cost_snapshots%rowtype;
  v_row record;
begin
  select * into v_snapshot
  from public.sale_operational_cost_snapshots s
  where s.operation_scope=p_operation_scope
    and (
      (p_operation_scope='supplements' and s.sale_id=p_sale_id)
      or (p_operation_scope='fitness' and s.fitness_sale_id=p_sale_id)
    )
  for update;

  if not found or v_snapshot.status='reversed' then return v_snapshot.id; end if;

  for v_row in
    select supply_id,sum(quantity)::numeric(14,3) quantity,
      max(unit_cost)::numeric(14,4) unit_cost,
      sum(total_cost)::numeric(12,2) total_cost
    from public.sale_operational_cost_snapshot_items
    where snapshot_id=v_snapshot.id
    group by supply_id
    order by supply_id
  loop
    perform 1 from public.operational_supplies where id=v_row.supply_id for update;
    update public.operational_supplies
    set quantity_on_hand=quantity_on_hand+v_row.quantity,updated_by=auth.uid(),updated_at=now()
    where id=v_row.supply_id;

    insert into public.operational_supply_movements(
      supply_id,movement_type,quantity_delta,unit_cost_snapshot,total_cost_snapshot,
      operation_scope,sale_id,fitness_sale_id,notes,idempotency_key
    ) values (
      v_row.supply_id,'reversal',v_row.quantity,v_row.unit_cost,v_row.total_cost,
      p_operation_scope,
      case when p_operation_scope='supplements' then p_sale_id else null end,
      case when p_operation_scope='fitness' then p_sale_id else null end,
      'Estorno do consumo por cancelamento da venda',
      'operational-cost-reversal:'||p_operation_scope||':'||p_sale_id::text||':'||v_row.supply_id::text
    ) on conflict(idempotency_key) do nothing;
  end loop;

  update public.sale_operational_cost_snapshots
  set status='reversed',reversed_at=now()
  where id=v_snapshot.id;

  if p_operation_scope='supplements' then
    update public.sales
    set operational_cost_total=0,contribution_margin=0,cost_snapshot_status='reversed',updated_at=now()
    where id=p_sale_id;
  else
    update public.fitness_sales
    set operational_cost_total=0,contribution_margin=0,cost_snapshot_status='reversed',updated_at=now()
    where id=p_sale_id;
  end if;

  return v_snapshot.id;
end;
$$;

-- Entrega futura: atualiza o custo da mercadoria para o custo médio vigente e
-- aplica os insumos após a atualização dos totais.
create or replace function public.handle_supplement_sale_cost_status()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.general_status<>'cancelled' and new.general_status='cancelled' then
    perform public.reverse_sale_operational_costs('supplements',new.id);
    return new;
  end if;

  if old.delivery_status<>'delivered' and new.delivery_status='delivered'
     and new.general_status<>'cancelled'
  then
    update public.sale_items si
    set unit_cost=p.cost_price
    from public.products p
    where si.sale_id=new.id and p.id=si.product_id;

    perform public.apply_sale_operational_costs('supplements',new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists sales_operational_cost_status on public.sales;
create trigger sales_operational_cost_status
after update of delivery_status,general_status on public.sales
for each row execute function public.handle_supplement_sale_cost_status();

create or replace function public.handle_fitness_sale_cost_status()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.general_status<>'cancelled' and new.general_status='cancelled' then
    perform public.reverse_sale_operational_costs('fitness',new.id);
    return new;
  end if;

  if old.delivery_status<>'delivered' and new.delivery_status='delivered'
     and new.general_status<>'cancelled'
  then
    update public.fitness_sale_items si
    set unit_cost=fv.cost_price
    from public.fitness_variants fv
    where si.sale_id=new.id and fv.id=si.variant_id;

    perform public.apply_sale_operational_costs('fitness',new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists fitness_sales_operational_cost_status on public.fitness_sales;
create trigger fitness_sales_operational_cost_status
after update of delivery_status,general_status on public.fitness_sales
for each row execute function public.handle_fitness_sale_cost_status();

-- Venda criada já entregue: o trigger diferido enxerga todos os itens ao final
-- da transação, evitando snapshot parcial.
create or replace function public.apply_supplement_cost_after_item_deferred()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.apply_sale_operational_costs('supplements',new.sale_id);
  return null;
end;
$$;

drop trigger if exists sale_items_operational_cost_deferred on public.sale_items;
create constraint trigger sale_items_operational_cost_deferred
after insert or update on public.sale_items
deferrable initially deferred
for each row execute function public.apply_supplement_cost_after_item_deferred();

create or replace function public.apply_fitness_cost_after_item_deferred()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.apply_sale_operational_costs('fitness',new.sale_id);
  return null;
end;
$$;

drop trigger if exists fitness_sale_items_operational_cost_deferred on public.fitness_sale_items;
create constraint trigger fitness_sale_items_operational_cost_deferred
after insert or update on public.fitness_sale_items
deferrable initially deferred
for each row execute function public.apply_fitness_cost_after_item_deferred();

-- -----------------------------------------------------------------------------
-- 8. Leituras e indicadores
-- -----------------------------------------------------------------------------
create or replace view public.operational_supplies_overview
with (security_invoker=true)
as
select
  s.*,
  round(greatest(s.quantity_on_hand,0)*s.average_unit_cost,2)::numeric(14,2) as stock_value,
  case
    when not s.active then 'inactive'
    when s.quantity_on_hand<0 then 'negative'
    when s.quantity_on_hand<=s.min_quantity then 'low'
    else 'healthy'
  end as stock_status,
  coalesce((
    select sum(abs(m.quantity_delta))
    from public.operational_supply_movements m
    where m.supply_id=s.id and m.movement_type='sale_usage'
      and m.created_at>=date_trunc('month',now())
  ),0)::numeric(14,3) as consumed_this_month,
  (
    select max(r.received_on)
    from public.operational_supply_receipts r
    where r.supply_id=s.id
  ) as last_received_on
from public.operational_supplies s;

create or replace view public.operational_cost_profiles_overview
with (security_invoker=true)
as
select
  p.*,
  coalesce(jsonb_agg(
    jsonb_build_object(
      'id',i.id,'supply_id',i.supply_id,'supply_name',s.name,
      'usage_basis',i.usage_basis,'quantity',i.quantity,
      'unit_cost',s.average_unit_cost,
      'estimated_one_item_cost',round(i.quantity*s.average_unit_cost,2)
    ) order by s.name
  ) filter(where i.id is not null),'[]'::jsonb) as items,
  coalesce(sum(
    case i.usage_basis
      when 'per_sale' then i.quantity*s.average_unit_cost
      when 'per_line' then i.quantity*s.average_unit_cost
      else i.quantity*s.average_unit_cost
    end
  ),0)::numeric(14,2) as estimated_one_item_cost
from public.operational_cost_profiles p
left join public.operational_cost_profile_items i on i.profile_id=p.id
left join public.operational_supplies s on s.id=i.supply_id
group by p.id;

create or replace view public.product_operational_requirements_overview
with (security_invoker=true)
as
select
  r.id,r.operation_scope,r.product_id,r.fitness_product_id,
  case when r.operation_scope='supplements' then p.name else fp.name end as product_name,
  r.supply_id,s.name as supply_name,s.unit_name,
  r.quantity_per_unit,s.average_unit_cost,
  round(r.quantity_per_unit*s.average_unit_cost,2)::numeric(14,2) as cost_per_product_unit,
  r.active,r.notes,r.created_at,r.updated_at
from public.product_operational_supply_requirements r
join public.operational_supplies s on s.id=r.supply_id
left join public.products p on p.id=r.product_id
left join public.fitness_products fp on fp.id=r.fitness_product_id;

create or replace view public.operational_cost_sales_overview
with (security_invoker=true)
as
select
  s.operation_scope,
  s.id as snapshot_id,
  coalesce(s.sale_id,s.fitness_sale_id) as sale_id,
  case
    when s.operation_scope='supplements' then coalesce(c.name,sp.reference,'Cliente')
    else fs.customer_name
  end as customer_name,
  case
    when s.operation_scope='supplements' then sp.delivered_at::date
    else fs.delivered_on
  end as delivered_on,
  s.channel,p.name as profile_name,
  s.revenue_total,s.merchandise_cost_total,s.operational_cost_total,
  s.variable_cost_total,s.gross_profit,s.contribution_margin,
  s.negative_supply_count,s.status,s.applied_at
from public.sale_operational_cost_snapshots s
left join public.operational_cost_profiles p on p.id=s.profile_id
left join public.sales sp on sp.id=s.sale_id
left join public.customers c on c.id=sp.customer_id
left join public.fitness_sales fs on fs.id=s.fitness_sale_id;

create or replace view public.operational_cost_monthly_results
with (security_invoker=true)
as
select
  date_trunc('month',delivered_on)::date as reference_month,
  operation_scope,
  count(*)::integer as sale_count,
  coalesce(sum(revenue_total),0)::numeric(14,2) as revenue,
  coalesce(sum(merchandise_cost_total),0)::numeric(14,2) as merchandise_cost,
  coalesce(sum(gross_profit),0)::numeric(14,2) as gross_profit,
  coalesce(sum(operational_cost_total),0)::numeric(14,2) as operational_cost,
  coalesce(sum(contribution_margin),0)::numeric(14,2) as contribution_margin
from public.operational_cost_sales_overview
where status='finalized' and delivered_on is not null
group by date_trunc('month',delivered_on)::date,operation_scope;

create or replace function public.operational_cost_product_preview(
  p_operation_scope text,
  p_product_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_acquisition numeric(14,2):=0;
  v_default_profile numeric(14,2):=0;
  v_product_specific numeric(14,2):=0;
  v_sale_price numeric(14,2):=0;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária'; end if;

  if p_operation_scope='supplements' then
    select cost_price,sale_price into v_acquisition,v_sale_price from public.products where id=p_product_id;
  elsif p_operation_scope='fitness' then
    select min(cost_price),min(sale_price) into v_acquisition,v_sale_price
    from public.fitness_variants where product_id=p_product_id and active;
  else raise exception 'Operação inválida'; end if;

  select coalesce(sum(i.quantity*s.average_unit_cost),0)::numeric(14,2)
  into v_default_profile
  from public.operational_cost_profiles p
  join public.operational_cost_profile_items i on i.profile_id=p.id
  join public.operational_supplies s on s.id=i.supply_id and s.active
  where p.operation_scope=p_operation_scope and p.channel='retail' and p.is_default and p.active;

  select coalesce(sum(r.quantity_per_unit*s.average_unit_cost),0)::numeric(14,2)
  into v_product_specific
  from public.product_operational_supply_requirements r
  join public.operational_supplies s on s.id=r.supply_id and s.active
  where r.operation_scope=p_operation_scope and r.active
    and (
      (p_operation_scope='supplements' and r.product_id=p_product_id)
      or (p_operation_scope='fitness' and r.fitness_product_id=p_product_id)
    );

  return jsonb_build_object(
    'acquisition_cost',coalesce(v_acquisition,0),
    'default_operational_cost',coalesce(v_default_profile,0),
    'product_specific_cost',coalesce(v_product_specific,0),
    'estimated_operational_cost',coalesce(v_default_profile,0)+coalesce(v_product_specific,0),
    'estimated_variable_cost',coalesce(v_acquisition,0)+coalesce(v_default_profile,0)+coalesce(v_product_specific,0),
    'sale_price',coalesce(v_sale_price,0),
    'estimated_contribution_margin',coalesce(v_sale_price,0)-coalesce(v_acquisition,0)-coalesce(v_default_profile,0)-coalesce(v_product_specific,0)
  );
end;
$$;

create or replace function public.operational_cost_dashboard_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_result jsonb;
begin
  if not public.can_manage_operational_costs() then raise exception 'Usuário sem acesso aos custos operacionais'; end if;

  select jsonb_build_object(
    'summary',jsonb_build_object(
      'active_supplies',(select count(*) from public.operational_supplies where active),
      'stock_value',(select coalesce(sum(stock_value),0) from public.operational_supplies_overview where active),
      'low_stock',(select count(*) from public.operational_supplies_overview where active and stock_status in ('low','negative')),
      'negative_stock',(select count(*) from public.operational_supplies_overview where active and stock_status='negative'),
      'profiles',(select count(*) from public.operational_cost_profiles where active),
      'costed_sales_this_month',(
        select count(*) from public.operational_cost_sales_overview
        where status='finalized' and delivered_on>=date_trunc('month',current_date)::date
      ),
      'operational_cost_this_month',(
        select coalesce(sum(operational_cost_total),0) from public.operational_cost_sales_overview
        where status='finalized' and delivered_on>=date_trunc('month',current_date)::date
      ),
      'contribution_margin_this_month',(
        select coalesce(sum(contribution_margin),0) from public.operational_cost_sales_overview
        where status='finalized' and delivered_on>=date_trunc('month',current_date)::date
      )
    ),
    'supplies',(select coalesce(jsonb_agg(to_jsonb(x) order by x.stock_status desc,x.name),'[]'::jsonb) from public.operational_supplies_overview x),
    'profiles',(select coalesce(jsonb_agg(to_jsonb(x) order by x.operation_scope,x.channel,x.name),'[]'::jsonb) from public.operational_cost_profiles_overview x),
    'requirements',(select coalesce(jsonb_agg(to_jsonb(x) order by x.operation_scope,x.product_name,x.supply_name),'[]'::jsonb) from public.product_operational_requirements_overview x),
    'recent_sales',(select coalesce(jsonb_agg(to_jsonb(x) order by x.delivered_on desc,x.applied_at desc),'[]'::jsonb) from (select * from public.operational_cost_sales_overview limit 20) x),
    'recent_receipts',(select coalesce(jsonb_agg(to_jsonb(x) order by x.received_on desc,x.created_at desc),'[]'::jsonb) from (
      select r.*,s.name supply_name,s.unit_name from public.operational_supply_receipts r join public.operational_supplies s on s.id=r.supply_id limit 20
    ) x)
  ) into v_result;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. Integração patrimonial com o Bank, sem duplicar caixa
-- -----------------------------------------------------------------------------
alter table public.bank_month_closures
  add column if not exists operational_supplies_stock_cost numeric(14,2) not null default 0;

create or replace function public.include_supplies_in_bank_month_closure()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_supply_value numeric(14,2);
begin
  select coalesce(sum(greatest(quantity_on_hand,0)*average_unit_cost),0)::numeric(14,2)
  into v_supply_value
  from public.operational_supplies
  where active;

  new.operational_supplies_stock_cost:=v_supply_value;

  new.operational_net_position:=new.operational_net_position+v_supply_value;
  new.total_net_position:=new.total_net_position+v_supply_value;

  return new;
end;
$$;

drop trigger if exists bank_month_closures_include_supplies
on public.bank_month_closures;
create trigger bank_month_closures_include_supplies
before insert or update on public.bank_month_closures
for each row execute function public.include_supplies_in_bank_month_closure();

create or replace function public.bank_get_company_patrimony_v2()
returns table(
  total_cash_balance numeric,
  company_cash_balance numeric,
  supplements_stock_cost numeric,
  supplements_stock_sale_value numeric,
  fitness_stock_cost numeric,
  fitness_stock_sale_value numeric,
  operational_supplies_stock_cost numeric,
  total_inventory_cost numeric,
  bank_receivables numeric,
  operation_receivables numeric,
  total_receivables numeric,
  company_debt_remaining numeric,
  total_debt_remaining numeric,
  operational_net_position numeric,
  total_net_position numeric
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.can_access_bank() then raise exception 'Usuário sem acesso à Candinho Bank'; end if;

  return query
  with latest_balances as (
    select distinct on (s.account_id) s.account_id,s.balance
    from public.bank_balance_snapshots s
    join public.bank_accounts a on a.id=s.account_id and a.is_active
    order by s.account_id,s.balance_date desc,s.created_at desc
  ), cash as (
    select coalesce(sum(lb.balance),0)::numeric(14,2) total_cash,
      coalesce(sum(lb.balance) filter(where lower(coalesce(a.origin,'')) like '%company%' or lower(coalesce(a.origin,'')) like '%candinho%'),0)::numeric(14,2) company_cash
    from latest_balances lb join public.bank_accounts a on a.id=lb.account_id
  ), supp as (
    select coalesce(sum(stock_cost_value),0)::numeric(14,2) cost_value,
      coalesce(sum(stock_sale_value),0)::numeric(14,2) sale_value
    from public.inventory_control_overview
  ), fit as (
    select coalesce(sum(sb.quantity*fv.cost_price),0)::numeric(14,2) cost_value,
      coalesce(sum(sb.quantity*fv.sale_price),0)::numeric(14,2) sale_value
    from public.fitness_stock_balances sb join public.fitness_variants fv on fv.id=sb.variant_id where fv.active
  ), supplies as (
    select coalesce(sum(greatest(quantity_on_hand,0)*average_unit_cost),0)::numeric(14,2) cost_value
    from public.operational_supplies where active
  ), bank_recv as (
    select coalesce(sum(greatest(amount-received_amount,0)) filter(where status not in ('received','cancelled')),0)::numeric(14,2) total
    from public.bank_receivables
  ), operation_recv as (
    select (
      coalesce((select sum(total_amount) from public.sales where record_type='sale' and general_status<>'cancelled' and payment_status='receivable'),0)
      +coalesce((select sum(total_amount) from public.fitness_sales where general_status<>'cancelled' and payment_status='receivable'),0)
    )::numeric(14,2) total
  ), debts as (
    select
      coalesce(sum(greatest(original_amount-total_paid,0)) filter(where status in ('active','paused') and (lower(coalesce(origin,'')) like '%company%' or lower(coalesce(origin,'')) like '%candinho%')),0)::numeric(14,2) company_total,
      coalesce(sum(greatest(original_amount-total_paid,0)) filter(where status in ('active','paused')),0)::numeric(14,2) all_total
    from public.bank_debts
  )
  select
    c.total_cash,c.company_cash,ss.cost_value,ss.sale_value,fs.cost_value,fs.sale_value,os.cost_value,
    (ss.cost_value+fs.cost_value+os.cost_value)::numeric(14,2),
    br.total,orc.total,(br.total+orc.total)::numeric(14,2),d.company_total,d.all_total,
    (c.company_cash+ss.cost_value+fs.cost_value+os.cost_value+orc.total-d.company_total)::numeric(14,2),
    (c.total_cash+ss.cost_value+fs.cost_value+os.cost_value+br.total+orc.total-d.all_total)::numeric(14,2)
  from cash c cross join supp ss cross join fit fs cross join supplies os cross join bank_recv br cross join operation_recv orc cross join debts d;
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. RLS, grants e perfis iniciais vazios
-- -----------------------------------------------------------------------------
insert into public.operational_cost_profiles(operation_scope,channel,name,is_default,active,notes)
values
  ('supplements','retail','Venda padrão de Suplementos',true,true,'Perfil padrão. Cadastre sacola, etiqueta e demais insumos conforme o uso real.'),
  ('supplements','partner','Venda via parceiro',true,true,'Perfil para vendas registradas com parceiro.'),
  ('fitness','retail','Venda padrão Fitness',true,true,'Perfil padrão da Candinho Fitness.'),
  ('fitness','consignment','Venda por consignação Fitness',true,true,'Perfil para vendas provenientes de consignação.')
on conflict do nothing;

alter table public.operational_supplies enable row level security;
alter table public.operational_supply_receipts enable row level security;
alter table public.operational_supply_movements enable row level security;
alter table public.operational_cost_profiles enable row level security;
alter table public.operational_cost_profile_items enable row level security;
alter table public.product_operational_supply_requirements enable row level security;
alter table public.sale_operational_cost_snapshots enable row level security;
alter table public.sale_operational_cost_snapshot_items enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'operational_supplies','operational_supply_receipts','operational_supply_movements',
    'operational_cost_profiles','operational_cost_profile_items','product_operational_supply_requirements',
    'sale_operational_cost_snapshots','sale_operational_cost_snapshot_items'
  ] loop
    execute format('drop policy if exists %I on public.%I',t||'_select',t);
    execute format('create policy %I on public.%I for select to authenticated using (public.can_manage_operational_costs())',t||'_select',t);
  end loop;
end $$;

revoke all on public.operational_supplies from public,anon;
revoke all on public.operational_supply_receipts from public,anon;
revoke all on public.operational_supply_movements from public,anon;
revoke all on public.operational_cost_profiles from public,anon;
revoke all on public.operational_cost_profile_items from public,anon;
revoke all on public.product_operational_supply_requirements from public,anon;
revoke all on public.sale_operational_cost_snapshots from public,anon;
revoke all on public.sale_operational_cost_snapshot_items from public,anon;

grant select on public.operational_supplies,public.operational_supply_receipts,
  public.operational_supply_movements,public.operational_cost_profiles,
  public.operational_cost_profile_items,public.product_operational_supply_requirements,
  public.sale_operational_cost_snapshots,public.sale_operational_cost_snapshot_items
  to authenticated;
grant all on public.operational_supplies,public.operational_supply_receipts,
  public.operational_supply_movements,public.operational_cost_profiles,
  public.operational_cost_profile_items,public.product_operational_supply_requirements,
  public.sale_operational_cost_snapshots,public.sale_operational_cost_snapshot_items
  to service_role;

grant select on public.operational_supplies_overview,public.operational_cost_profiles_overview,
  public.product_operational_requirements_overview,public.operational_cost_sales_overview,
  public.operational_cost_monthly_results to authenticated,service_role;

revoke all on function public.create_operational_supply(text,text,text,text,numeric,numeric,numeric,text) from public,anon;
revoke all on function public.receive_operational_supply(uuid,date,numeric,numeric,text,text,date,uuid,text) from public,anon;
revoke all on function public.count_operational_supply(uuid,numeric,text) from public,anon;
revoke all on function public.save_operational_cost_profile(uuid,text,text,text,boolean,boolean,jsonb,text) from public,anon;
revoke all on function public.save_product_operational_requirement(text,uuid,uuid,numeric,boolean,text) from public,anon;
revoke all on function public.remove_product_operational_requirement(uuid) from public,anon;
revoke all on function public.operational_cost_product_preview(text,uuid) from public,anon;
revoke all on function public.operational_cost_dashboard_snapshot() from public,anon;
revoke all on function public.bank_get_company_patrimony_v2() from public,anon;

grant execute on function public.create_operational_supply(text,text,text,text,numeric,numeric,numeric,text) to authenticated,service_role;
grant execute on function public.receive_operational_supply(uuid,date,numeric,numeric,text,text,date,uuid,text) to authenticated,service_role;
grant execute on function public.count_operational_supply(uuid,numeric,text) to authenticated,service_role;
grant execute on function public.save_operational_cost_profile(uuid,text,text,text,boolean,boolean,jsonb,text) to authenticated,service_role;
grant execute on function public.save_product_operational_requirement(text,uuid,uuid,numeric,boolean,text) to authenticated,service_role;
grant execute on function public.remove_product_operational_requirement(uuid) to authenticated,service_role;
grant execute on function public.operational_cost_product_preview(text,uuid) to authenticated,service_role;
grant execute on function public.operational_cost_dashboard_snapshot() to authenticated,service_role;
grant execute on function public.bank_get_company_patrimony_v2() to authenticated,service_role;

-- Somente funções internas/triggers usam aplicação e reversão direta.
revoke all on function public.apply_sale_operational_costs(text,uuid) from public,anon,authenticated;
revoke all on function public.reverse_sale_operational_costs(text,uuid) from public,anon,authenticated;
grant execute on function public.apply_sale_operational_costs(text,uuid) to service_role;
grant execute on function public.reverse_sale_operational_costs(text,uuid) to service_role;

commit;
