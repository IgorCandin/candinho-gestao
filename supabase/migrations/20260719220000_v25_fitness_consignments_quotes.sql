-- V25 · Fitness Consignações + Orçamentos
-- Espelho canônico do backend já aplicado diretamente em produção.

create sequence if not exists public.fitness_quote_number_seq start 1;

create table if not exists public.fitness_consignments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.fitness_customers(id) on delete restrict,
  started_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  expected_return_on date,
  status text not null default 'open' check (status in ('open','partial','closed','cancelled')),
  responsible text, notes text,
  sale_id uuid references public.fitness_sales(id) on delete set null,
  closed_on date,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fitness_consignment_items (
  id uuid primary key default gen_random_uuid(),
  consignment_id uuid not null references public.fitness_consignments(id) on delete cascade,
  variant_id uuid not null references public.fitness_variants(id) on delete restrict,
  quantity_sent integer not null check(quantity_sent>0),
  quantity_returned integer not null default 0 check(quantity_returned>=0),
  quantity_sold integer not null default 0 check(quantity_sold>=0),
  unit_price numeric(12,2) not null check(unit_price>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(consignment_id,variant_id),
  check(quantity_returned+quantity_sold<=quantity_sent)
);

create table if not exists public.fitness_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number bigint not null default nextval('public.fitness_quote_number_seq') unique,
  customer_id uuid not null references public.fitness_customers(id) on delete restrict,
  status text not null default 'quoted' check(status in ('quoted','confirmed','lost','cancelled')),
  quoted_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  valid_until date not null default (((now() at time zone 'America/Sao_Paulo')::date)+7),
  gross_amount numeric(12,2) not null default 0 check(gross_amount>=0),
  discount_amount numeric(12,2) not null default 0 check(discount_amount>=0),
  total_amount numeric(12,2) not null default 0 check(total_amount>=0),
  responsible text, notes text,
  sale_id uuid references public.fitness_sales(id) on delete set null,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fitness_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.fitness_quotes(id) on delete cascade,
  variant_id uuid not null references public.fitness_variants(id) on delete restrict,
  quantity integer not null check(quantity>0),
  unit_price numeric(12,2) not null check(unit_price>=0),
  total_price numeric(12,2) generated always as ((quantity::numeric*unit_price)::numeric(12,2)) stored,
  created_at timestamptz not null default now(),
  unique(quote_id,variant_id)
);

alter table public.fitness_sales add column if not exists source_quote_id uuid references public.fitness_quotes(id) on delete set null;
alter table public.fitness_sales add column if not exists source_consignment_id uuid references public.fitness_consignments(id) on delete set null;
create unique index if not exists fitness_sales_source_quote_uidx on public.fitness_sales(source_quote_id) where source_quote_id is not null;
create unique index if not exists fitness_sales_source_consignment_uidx on public.fitness_sales(source_consignment_id) where source_consignment_id is not null;
create index if not exists fitness_consignments_customer_status_idx on public.fitness_consignments(customer_id,status);
create index if not exists fitness_consignments_expected_return_idx on public.fitness_consignments(expected_return_on) where status in ('open','partial');
create index if not exists fitness_consignment_items_variant_idx on public.fitness_consignment_items(variant_id);
create index if not exists fitness_quotes_customer_status_idx on public.fitness_quotes(customer_id,status);
create index if not exists fitness_quotes_valid_until_idx on public.fitness_quotes(valid_until) where status='quoted';
create index if not exists fitness_quote_items_variant_idx on public.fitness_quote_items(variant_id);

alter table public.fitness_consignments enable row level security;
alter table public.fitness_consignment_items enable row level security;
alter table public.fitness_quotes enable row level security;
alter table public.fitness_quote_items enable row level security;

drop policy if exists fitness_consignments_read on public.fitness_consignments;
create policy fitness_consignments_read on public.fitness_consignments for select to authenticated using ((select public.can_access_operation('fitness')));
drop policy if exists fitness_consignment_items_read on public.fitness_consignment_items;
create policy fitness_consignment_items_read on public.fitness_consignment_items for select to authenticated using ((select public.can_access_operation('fitness')));
drop policy if exists fitness_quotes_read on public.fitness_quotes;
create policy fitness_quotes_read on public.fitness_quotes for select to authenticated using ((select public.can_access_operation('fitness')));
drop policy if exists fitness_quote_items_read on public.fitness_quote_items;
create policy fitness_quote_items_read on public.fitness_quote_items for select to authenticated using ((select public.can_access_operation('fitness')));

revoke all on public.fitness_consignments,public.fitness_consignment_items,public.fitness_quotes,public.fitness_quote_items from anon,authenticated;
grant select on public.fitness_consignments,public.fitness_consignment_items,public.fitness_quotes,public.fitness_quote_items to authenticated,service_role;
grant all on public.fitness_consignments,public.fitness_consignment_items,public.fitness_quotes,public.fitness_quote_items to service_role;
grant usage,select on sequence public.fitness_quote_number_seq to service_role;

create or replace function public.fitness_resolve_customer(
  p_customer_id uuid,p_name text,p_phone text default null,p_instagram text default null,p_city text default null,p_source text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid:=p_customer_id;
begin
  if not public.can_write_fitness() then raise exception 'Usuário sem permissão para alterar clientes Fitness';end if;
  if v_id is not null then
    if not exists(select 1 from public.fitness_customers where id=v_id and active) then raise exception 'Cliente Fitness inválido';end if;
    update public.fitness_customers set phone=coalesce(nullif(btrim(p_phone),''),phone),instagram=coalesce(nullif(btrim(p_instagram),''),instagram),city=coalesce(nullif(btrim(p_city),''),city),source=coalesce(nullif(btrim(p_source),''),source),updated_at=now() where id=v_id;
    return v_id;
  end if;
  if nullif(btrim(p_name),'') is null then raise exception 'Informe o cliente';end if;
  if nullif(btrim(p_phone),'') is not null then select id into v_id from public.fitness_customers where active and phone=btrim(p_phone) order by updated_at desc limit 1;end if;
  if v_id is null then select id into v_id from public.fitness_customers where active and lower(name)=lower(btrim(p_name)) order by updated_at desc limit 1;end if;
  if v_id is null then
    insert into public.fitness_customers(name,phone,instagram,city,source) values(btrim(p_name),nullif(btrim(p_phone),''),nullif(btrim(p_instagram),''),nullif(btrim(p_city),''),nullif(btrim(p_source),'')) returning id into v_id;
  else
    update public.fitness_customers set phone=coalesce(nullif(btrim(p_phone),''),phone),instagram=coalesce(nullif(btrim(p_instagram),''),instagram),city=coalesce(nullif(btrim(p_city),''),city),source=coalesce(nullif(btrim(p_source),''),source),updated_at=now() where id=v_id;
  end if;
  return v_id;
end;$$;
revoke all on function public.fitness_resolve_customer(uuid,text,text,text,text,text) from public,anon,authenticated;

create or replace view public.fitness_stock_overview with (security_invoker=true) as
with reserved as (
 select variant_id,coalesce(sum(quantity_reserved),0)::integer reserved_quantity from public.fitness_stock_reservations where status in ('reserved','partial') group by variant_id
), incoming as (
 select i.variant_id,coalesce(sum(i.quantity_ordered-i.quantity_received),0)::integer incoming_quantity from public.fitness_purchase_order_items i join public.fitness_purchase_orders o on o.id=i.purchase_order_id where o.status in ('pending','partial') group by i.variant_id
), consigned as (
 select i.variant_id,coalesce(sum(i.quantity_sent-i.quantity_returned-i.quantity_sold),0)::integer consigned_quantity from public.fitness_consignment_items i join public.fitness_consignments c on c.id=i.consignment_id where c.status in ('open','partial') group by i.variant_id
)
select v.id variant_id,p.id product_id,p.name product_name,p.category,p.image_url,p.active product_active,v.size,v.color,v.sku,v.cost_price,v.sale_price,v.active variant_active,
 coalesce(b.quantity,0)::integer physical_quantity,coalesce(r.reserved_quantity,0)::integer reserved_quantity,
 greatest(coalesce(b.quantity,0)-coalesce(r.reserved_quantity,0)-coalesce(c.consigned_quantity,0),0)::integer available_quantity,
 coalesce(inc.incoming_quantity,0)::integer incoming_quantity,
 (coalesce(b.quantity,0)*v.cost_price)::numeric(12,2) stock_cost_value,(coalesce(b.quantity,0)*v.sale_price)::numeric(12,2) stock_sale_value,
 case when coalesce(b.quantity,0)=0 and coalesce(inc.incoming_quantity,0)>0 then 'incoming'
      when coalesce(b.quantity,0)=0 then 'out_of_stock'
      when greatest(coalesce(b.quantity,0)-coalesce(r.reserved_quantity,0)-coalesce(c.consigned_quantity,0),0)=0 and coalesce(c.consigned_quantity,0)>0 then 'consigned'
      when greatest(coalesce(b.quantity,0)-coalesce(r.reserved_quantity,0)-coalesce(c.consigned_quantity,0),0)=0 then 'reserved'
      else 'available' end stock_status,
 coalesce(c.consigned_quantity,0)::integer consigned_quantity
from public.fitness_variants v join public.fitness_products p on p.id=v.product_id
left join public.fitness_stock_balances b on b.variant_id=v.id
left join reserved r on r.variant_id=v.id
left join incoming inc on inc.variant_id=v.id
left join consigned c on c.variant_id=v.id;
grant select on public.fitness_stock_overview to authenticated,service_role;

create or replace view public.fitness_stock_operational with (security_invoker=true) as
select s.variant_id,s.product_id,s.product_name,s.category,s.image_url,s.product_active,s.size,s.color,s.sku,s.cost_price,s.sale_price,s.variant_active,
 s.physical_quantity,s.reserved_quantity,s.available_quantity,s.incoming_quantity,s.stock_cost_value,s.stock_sale_value,s.stock_status,
 v.minimum_stock,v.reorder_target,v.default_supplier_id,fs.name default_supplier_name,
 greatest(v.minimum_stock-s.available_quantity,0)::integer quantity_below_minimum,
 greatest(greatest(v.reorder_target,v.minimum_stock)-s.available_quantity-s.incoming_quantity,0)::integer suggested_reorder_quantity,
 case when not s.product_active or not s.variant_active then 'inactive' when s.available_quantity<=0 and s.incoming_quantity>0 then 'incoming' when s.available_quantity<=0 then 'out_of_stock' when s.available_quantity<=v.minimum_stock then 'low_stock' else 'available' end operational_status,
 s.consigned_quantity
from public.fitness_stock_overview s join public.fitness_variants v on v.id=s.variant_id left join public.fitness_suppliers fs on fs.id=v.default_supplier_id;

grant select on public.fitness_stock_operational to authenticated,service_role;

create or replace view public.fitness_product_catalog_v2
with (security_invoker=true)
as
select
  p.id,p.name,p.category,p.description,p.image_url,p.active,
  count(v.id)::integer variant_count,
  coalesce(sum(s.physical_quantity),0)::integer physical_quantity,
  coalesce(sum(s.reserved_quantity),0)::integer reserved_quantity,
  coalesce(sum(s.available_quantity),0)::integer available_quantity,
  coalesce(sum(s.incoming_quantity),0)::integer incoming_quantity,
  min(v.sale_price)::numeric(12,2) min_sale_price,
  max(v.sale_price)::numeric(12,2) max_sale_price,
  count(*) filter(
    where s.operational_status in ('out_of_stock','low_stock')
  )::integer attention_variants,
  p.updated_at,
  coalesce(sum(s.consigned_quantity),0)::integer consigned_quantity
from public.fitness_products p
left join public.fitness_variants v on v.product_id=p.id
left join public.fitness_stock_operational s on s.variant_id=v.id
group by p.id;

grant select on public.fitness_product_catalog_v2
to authenticated,service_role;

create or replace function public.create_fitness_consignment(
 p_customer_id uuid,p_customer_name text,p_customer_phone text,p_customer_instagram text,p_city text,p_customer_source text,
 p_started_on date,p_expected_return_on date,p_items jsonb,p_responsible text default null,p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_customer uuid;v_id uuid;v_item record;v_variant public.fitness_variants%rowtype;v_physical integer;v_reserved integer;v_consigned integer;v_available integer;
begin
 if not public.can_write_fitness() then raise exception 'Usuário sem permissão para registrar consignações Fitness';end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Adicione pelo menos uma peça para prova';end if;
 v_customer:=public.fitness_resolve_customer(p_customer_id,p_customer_name,p_customer_phone,p_customer_instagram,p_city,p_customer_source);
 insert into public.fitness_consignments(customer_id,started_on,expected_return_on,responsible,notes)
 values(v_customer,coalesce(p_started_on,(now() at time zone 'America/Sao_Paulo')::date),p_expected_return_on,nullif(btrim(p_responsible),''),nullif(btrim(p_notes),'')) returning id into v_id;
 for v_item in select * from jsonb_to_recordset(p_items) as x(variant_id uuid,quantity integer,unit_price numeric) loop
  if coalesce(v_item.quantity,0)<=0 then raise exception 'Quantidade inválida na consignação';end if;
  select * into v_variant from public.fitness_variants where id=v_item.variant_id and active for share;if not found then raise exception 'Variação inválida ou inativa';end if;
  insert into public.fitness_stock_balances(variant_id,quantity) values(v_variant.id,0) on conflict(variant_id) do nothing;
  select quantity into v_physical from public.fitness_stock_balances where variant_id=v_variant.id for update;
  select coalesce(sum(quantity_reserved),0)::integer into v_reserved from public.fitness_stock_reservations where variant_id=v_variant.id and status in ('reserved','partial');
  select coalesce(sum(i.quantity_sent-i.quantity_returned-i.quantity_sold),0)::integer into v_consigned from public.fitness_consignment_items i join public.fitness_consignments c on c.id=i.consignment_id where i.variant_id=v_variant.id and c.status in ('open','partial');
  v_available:=greatest(v_physical-v_reserved-v_consigned,0);
  if v_available<v_item.quantity then raise exception 'Estoque insuficiente para consignar % / % / %. Disponível: %',(select name from public.fitness_products where id=v_variant.product_id),v_variant.size,v_variant.color,v_available;end if;
  insert into public.fitness_consignment_items(consignment_id,variant_id,quantity_sent,unit_price) values(v_id,v_variant.id,v_item.quantity,coalesce(v_item.unit_price,v_variant.sale_price));
 end loop;
 insert into public.audit_events(entity_type,entity_id,action,details) values('fitness_consignment',v_id,'created',jsonb_build_object('customer_id',v_customer,'items',jsonb_array_length(p_items)));
 return v_id;
end;$$;

create or replace function public.settle_fitness_consignment(
 p_consignment_id uuid,p_items jsonb,p_settled_on date default null,p_payment_mode text default 'receivable',p_paid_on date default null,p_payment_method text default null,p_payment_due_on date default null,p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_c public.fitness_consignments%rowtype;v_item record;v_choice record;v_sold integer;v_outstanding integer;v_sale uuid;v_customer public.fitness_customers%rowtype;v_variant public.fitness_variants%rowtype;v_sale_item uuid;v_total_sold integer:=0;v_on date:=coalesce(p_settled_on,(now() at time zone 'America/Sao_Paulo')::date);
begin
 if not public.can_write_fitness() then raise exception 'Usuário sem permissão para acertar consignações Fitness';end if;
 if p_payment_mode not in ('receivable','paid','combined') then raise exception 'Situação de pagamento inválida';end if;
 if p_payment_mode='paid' and (p_paid_on is null or nullif(btrim(p_payment_method),'') is null) then raise exception 'Informe data e forma de pagamento';end if;
 if p_payment_mode='combined' and p_payment_due_on is null then raise exception 'Informe a data combinada';end if;
 select * into v_c from public.fitness_consignments where id=p_consignment_id for update;if not found then raise exception 'Consignação não encontrada';end if;
 if v_c.status not in ('open','partial') then raise exception 'Esta consignação já foi encerrada';end if;
 select * into v_customer from public.fitness_customers where id=v_c.customer_id;
 for v_item in select * from public.fitness_consignment_items where consignment_id=p_consignment_id order by created_at,id loop
  v_outstanding:=v_item.quantity_sent-v_item.quantity_returned-v_item.quantity_sold;
  select * into v_choice from jsonb_to_recordset(coalesce(p_items,'[]'::jsonb)) as x(item_id uuid,quantity_sold integer) where x.item_id=v_item.id limit 1;
  v_sold:=coalesce(v_choice.quantity_sold,0);if v_sold<0 or v_sold>v_outstanding then raise exception 'Quantidade escolhida inválida no acerto da consignação';end if;
  update public.fitness_consignment_items set quantity_sold=quantity_sold+v_sold,quantity_returned=quantity_returned+(v_outstanding-v_sold),updated_at=now() where id=v_item.id;
  v_total_sold:=v_total_sold+v_sold;
 end loop;
 if v_total_sold>0 then
  insert into public.fitness_sales(customer_name,customer_phone,city,quoted_on,general_status,payment_status,delivery_status,payment_method,payment_due_on,paid_on,delivered_on,notes,customer_id,responsible,source_consignment_id)
  values(v_customer.name,v_customer.phone,v_customer.city,v_on,'active',case when p_payment_mode='paid' then 'received' else 'receivable' end,'delivered',case when p_payment_mode='paid' then p_payment_method else null end,case when p_payment_mode='combined' then p_payment_due_on else null end,case when p_payment_mode='paid' then p_paid_on else null end,v_on,concat_ws(E'\n',nullif(btrim(v_c.notes),''),nullif(btrim(p_notes),'')),v_c.customer_id,v_c.responsible,p_consignment_id) returning id into v_sale;
  for v_item in select * from public.fitness_consignment_items where consignment_id=p_consignment_id and quantity_sold>0 loop
   select * into v_variant from public.fitness_variants where id=v_item.variant_id;
   insert into public.fitness_sale_items(sale_id,variant_id,quantity,unit_cost,unit_price) values(v_sale,v_item.variant_id,v_item.quantity_sold,v_variant.cost_price,v_item.unit_price) returning id into v_sale_item;
   insert into public.fitness_inventory_movements(variant_id,movement_type,quantity_delta,sale_id,notes,idempotency_key)
   values(v_item.variant_id,'sale',-v_item.quantity_sold,v_sale,'Venda originada do acerto da consignação','fitness:consignment-sale:'||p_consignment_id||':item:'||v_item.id) on conflict(idempotency_key) do nothing;
  end loop;
  update public.fitness_sales set general_status=case when payment_status='received' then 'finalized' else 'active' end,updated_at=now() where id=v_sale;
 end if;
 update public.fitness_consignments set status='closed',closed_on=v_on,sale_id=v_sale,notes=concat_ws(E'\n',notes,nullif(btrim(p_notes),'')),updated_at=now() where id=p_consignment_id;
 insert into public.audit_events(entity_type,entity_id,action,details) values('fitness_consignment',p_consignment_id,'settled',jsonb_build_object('sale_id',v_sale,'sold_units',v_total_sold,'settled_on',v_on));
 return v_sale;
end;$$;

create or replace function public.cancel_fitness_consignment(p_consignment_id uuid,p_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_c public.fitness_consignments%rowtype;
begin
 if not public.can_write_fitness() then raise exception 'Usuário sem permissão para cancelar consignações Fitness';end if;
 select * into v_c from public.fitness_consignments where id=p_consignment_id for update;if not found then raise exception 'Consignação não encontrada';end if;
 if v_c.status not in ('open','partial') then raise exception 'Esta consignação já foi encerrada';end if;
 if exists(select 1 from public.fitness_consignment_items where consignment_id=p_consignment_id and quantity_sold>0) then raise exception 'Consignação com peças vendidas deve ser acertada, não cancelada';end if;
 update public.fitness_consignment_items set quantity_returned=quantity_sent,updated_at=now() where consignment_id=p_consignment_id;
 update public.fitness_consignments set status='cancelled',closed_on=(now() at time zone 'America/Sao_Paulo')::date,notes=concat_ws(E'\n',notes,nullif(btrim(p_reason),'')),updated_at=now() where id=p_consignment_id;
 insert into public.audit_events(entity_type,entity_id,action,details) values('fitness_consignment',p_consignment_id,'cancelled',jsonb_build_object('reason',p_reason));
 return p_consignment_id;
end;$$;

create or replace function public.fitness_refresh_quote_totals() returns trigger language plpgsql security definer set search_path=public as $$
declare v_quote uuid:=coalesce(new.quote_id,old.quote_id);v_gross numeric(12,2);
begin
 select coalesce(sum(total_price),0)::numeric(12,2) into v_gross from public.fitness_quote_items where quote_id=v_quote;
 update public.fitness_quotes set gross_amount=v_gross,total_amount=greatest(v_gross-discount_amount,0),updated_at=now() where id=v_quote;
 return coalesce(new,old);
end;$$;
drop trigger if exists fitness_refresh_quote_totals_trg on public.fitness_quote_items;
create trigger fitness_refresh_quote_totals_trg after insert or update or delete on public.fitness_quote_items for each row execute function public.fitness_refresh_quote_totals();

create or replace function public.save_fitness_quote(
 p_quote_id uuid,p_customer_id uuid,p_customer_name text,p_customer_phone text,p_customer_instagram text,p_city text,p_customer_source text,
 p_quoted_on date,p_valid_until date,p_items jsonb,p_discount_amount numeric default 0,p_responsible text default null,p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_customer uuid;v_id uuid:=p_quote_id;v_status text;v_item record;v_variant public.fitness_variants%rowtype;
begin
 if not public.can_write_fitness() then raise exception 'Usuário sem permissão para registrar orçamentos Fitness';end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Adicione pelo menos um item';end if;
 if coalesce(p_discount_amount,0)<0 then raise exception 'Desconto inválido';end if;
 v_customer:=public.fitness_resolve_customer(p_customer_id,p_customer_name,p_customer_phone,p_customer_instagram,p_city,p_customer_source);
 if v_id is null then
  insert into public.fitness_quotes(customer_id,quoted_on,valid_until,discount_amount,responsible,notes) values(v_customer,coalesce(p_quoted_on,(now() at time zone 'America/Sao_Paulo')::date),coalesce(p_valid_until,coalesce(p_quoted_on,(now() at time zone 'America/Sao_Paulo')::date)+7),coalesce(p_discount_amount,0),nullif(btrim(p_responsible),''),nullif(btrim(p_notes),'')) returning id into v_id;
 else
  select status into v_status from public.fitness_quotes where id=v_id for update;if not found then raise exception 'Orçamento Fitness não encontrado';end if;if v_status<>'quoted' then raise exception 'Somente orçamentos em aberto podem ser editados';end if;
  update public.fitness_quotes set customer_id=v_customer,quoted_on=coalesce(p_quoted_on,quoted_on),valid_until=coalesce(p_valid_until,valid_until),discount_amount=coalesce(p_discount_amount,0),responsible=nullif(btrim(p_responsible),''),notes=nullif(btrim(p_notes),''),updated_at=now() where id=v_id;
  delete from public.fitness_quote_items where quote_id=v_id;
 end if;
 for v_item in select * from jsonb_to_recordset(p_items) as x(variant_id uuid,quantity integer,unit_price numeric) loop
  if coalesce(v_item.quantity,0)<=0 then raise exception 'Quantidade inválida';end if;
  select * into v_variant from public.fitness_variants where id=v_item.variant_id and active;if not found then raise exception 'Variação inválida ou inativa';end if;
  insert into public.fitness_quote_items(quote_id,variant_id,quantity,unit_price) values(v_id,v_variant.id,v_item.quantity,coalesce(v_item.unit_price,v_variant.sale_price));
 end loop;
 return v_id;
end;$$;

create or replace function public.convert_fitness_quote_to_sale(
 p_quote_id uuid,p_payment_mode text default 'receivable',p_paid_on date default null,p_payment_method text default null,p_payment_due_on date default null,p_delivered boolean default false,p_delivered_on date default null,p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_q public.fitness_quotes%rowtype;v_c public.fitness_customers%rowtype;v_items jsonb;v_sale uuid;
begin
 if not public.can_write_fitness() then raise exception 'Usuário sem permissão para converter orçamentos Fitness';end if;
 select * into v_q from public.fitness_quotes where id=p_quote_id for update;if not found then raise exception 'Orçamento Fitness não encontrado';end if;if v_q.status<>'quoted' then raise exception 'Este orçamento não está mais em aberto';end if;
 select * into v_c from public.fitness_customers where id=v_q.customer_id;
 select jsonb_agg(jsonb_build_object('variant_id',i.variant_id,'quantity',i.quantity,'unit_price',i.unit_price) order by i.created_at) into v_items from public.fitness_quote_items i where i.quote_id=p_quote_id;if v_items is null then raise exception 'Orçamento sem itens';end if;
 v_sale:=public.create_fitness_sale_v2(v_c.id,v_c.name,v_c.phone,v_c.instagram,v_c.city,v_c.source,(now() at time zone 'America/Sao_Paulo')::date,v_items,p_payment_mode,p_paid_on,p_payment_method,p_payment_due_on,p_delivered,p_delivered_on,v_q.responsible,concat_ws(E'\n',v_q.notes,nullif(btrim(p_notes),'')));
 update public.fitness_sales set source_quote_id=p_quote_id where id=v_sale;
 update public.fitness_quotes set status='confirmed',sale_id=v_sale,updated_at=now() where id=p_quote_id;
 insert into public.audit_events(entity_type,entity_id,action,details) values('fitness_quote',p_quote_id,'converted',jsonb_build_object('sale_id',v_sale));
 return v_sale;
end;$$;

create or replace function public.update_fitness_quote_status(p_quote_id uuid,p_status text,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
begin
 if not public.can_write_fitness() then raise exception 'Usuário sem permissão para alterar orçamentos Fitness';end if;
 if p_status not in ('quoted','lost','cancelled') then raise exception 'Situação inválida';end if;
 update public.fitness_quotes set status=p_status,notes=concat_ws(E'\n',notes,nullif(btrim(p_notes),'')),updated_at=now() where id=p_quote_id and status<>'confirmed';
 if not found then raise exception 'Orçamento não encontrado ou já convertido';end if;
 return p_quote_id;
end;$$;

create or replace view public.fitness_consignments_overview with (security_invoker=true) as
select c.id,c.customer_id,fc.name customer_name,fc.phone customer_phone,fc.instagram customer_instagram,fc.city,c.started_on,c.expected_return_on,c.status,c.responsible,c.notes,c.sale_id,c.closed_on,c.created_at,c.updated_at,
 count(i.id)::integer item_count,coalesce(sum(i.quantity_sent),0)::integer units_sent,coalesce(sum(i.quantity_returned),0)::integer units_returned,coalesce(sum(i.quantity_sold),0)::integer units_sold,
 coalesce(sum(i.quantity_sent-i.quantity_returned-i.quantity_sold),0)::integer units_outstanding,
 coalesce(sum((i.quantity_sent-i.quantity_returned-i.quantity_sold)*i.unit_price),0)::numeric(12,2) outstanding_value,
 string_agg(distinct p.name||' · '||v.size||' · '||v.color,', ' order by p.name||' · '||v.size||' · '||v.color) product_summary
from public.fitness_consignments c join public.fitness_customers fc on fc.id=c.customer_id
left join public.fitness_consignment_items i on i.consignment_id=c.id left join public.fitness_variants v on v.id=i.variant_id left join public.fitness_products p on p.id=v.product_id group by c.id,fc.id;

create or replace view public.fitness_consignment_items_overview with (security_invoker=true) as
select i.id,i.consignment_id,i.variant_id,p.id product_id,p.name product_name,p.image_url,v.size,v.color,v.sku,i.quantity_sent,i.quantity_returned,i.quantity_sold,(i.quantity_sent-i.quantity_returned-i.quantity_sold)::integer quantity_outstanding,i.unit_price,i.created_at,i.updated_at
from public.fitness_consignment_items i join public.fitness_variants v on v.id=i.variant_id join public.fitness_products p on p.id=v.product_id;

create or replace view public.fitness_quotes_overview with (security_invoker=true) as
select q.id,q.quote_number,q.customer_id,c.name customer_name,c.phone customer_phone,c.city,q.status,q.quoted_on,q.valid_until,q.gross_amount,q.discount_amount,q.total_amount,q.responsible,q.notes,q.sale_id,q.created_at,q.updated_at,
 count(i.id)::integer item_count,coalesce(sum(i.quantity),0)::integer total_units,string_agg(distinct p.name||' · '||v.size||' · '||v.color,', ' order by p.name||' · '||v.size||' · '||v.color) product_summary
from public.fitness_quotes q join public.fitness_customers c on c.id=q.customer_id left join public.fitness_quote_items i on i.quote_id=q.id left join public.fitness_variants v on v.id=i.variant_id left join public.fitness_products p on p.id=v.product_id group by q.id,c.id;

create or replace view public.fitness_quote_items_overview with (security_invoker=true) as
select i.id,i.quote_id,i.variant_id,p.id product_id,p.name product_name,p.image_url,p.category,v.size,v.color,v.sku,i.quantity,i.unit_price,i.total_price,i.created_at
from public.fitness_quote_items i join public.fitness_variants v on v.id=i.variant_id join public.fitness_products p on p.id=v.product_id;

create or replace view public.fitness_commercial_pipeline_summary with (security_invoker=true) as
select (select count(*)::integer from public.fitness_consignments where status in ('open','partial')) open_consignments,
 (select coalesce(sum(quantity_sent-quantity_returned-quantity_sold),0)::integer from public.fitness_consignment_items i join public.fitness_consignments c on c.id=i.consignment_id where c.status in ('open','partial')) consigned_units,
 (select count(*)::integer from public.fitness_quotes where status='quoted') open_quotes,
 (select coalesce(sum(total_amount),0)::numeric(12,2) from public.fitness_quotes where status='quoted') open_quote_value;

grant select on public.fitness_consignments_overview,public.fitness_consignment_items_overview,public.fitness_quotes_overview,public.fitness_quote_items_overview,public.fitness_commercial_pipeline_summary to authenticated,service_role;

revoke all on function public.create_fitness_consignment(uuid,text,text,text,text,text,date,date,jsonb,text,text) from public,anon;
revoke all on function public.settle_fitness_consignment(uuid,jsonb,date,text,date,text,date,text) from public,anon;
revoke all on function public.cancel_fitness_consignment(uuid,text) from public,anon;
revoke all on function public.save_fitness_quote(uuid,uuid,text,text,text,text,text,date,date,jsonb,numeric,text,text) from public,anon;
revoke all on function public.convert_fitness_quote_to_sale(uuid,text,date,text,date,boolean,date,text) from public,anon;
revoke all on function public.update_fitness_quote_status(uuid,text,text) from public,anon;
grant execute on function public.create_fitness_consignment(uuid,text,text,text,text,text,date,date,jsonb,text,text) to authenticated,service_role;
grant execute on function public.settle_fitness_consignment(uuid,jsonb,date,text,date,text,date,text) to authenticated,service_role;
grant execute on function public.cancel_fitness_consignment(uuid,text) to authenticated,service_role;
grant execute on function public.save_fitness_quote(uuid,uuid,text,text,text,text,text,date,date,jsonb,numeric,text,text) to authenticated,service_role;
grant execute on function public.convert_fitness_quote_to_sale(uuid,text,date,text,date,boolean,date,text) to authenticated,service_role;
grant execute on function public.update_fitness_quote_status(uuid,text,text) to authenticated,service_role;
