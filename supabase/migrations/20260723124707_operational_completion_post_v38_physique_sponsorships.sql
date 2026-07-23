create table if not exists public.physique_sponsorships (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.physique_athletes(id) on delete cascade,
  event_name text not null,
  event_type text,
  event_date date,
  event_location text,
  starts_on date,
  ends_on date,
  sponsorship_type text not null check (sponsorship_type in ('money','products','mixed')),
  cash_amount numeric(12,2) not null default 0 check (cash_amount>=0),
  objective text,
  consideration text,
  notes text,
  status text not null default 'planned' check (status in ('planned','approved','fulfilled','finalized','cancelled')),
  products_delivered_at timestamptz,
  cash_paid_at timestamptz,
  finalized_at timestamptz,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.physique_sponsorship_items (
  id uuid primary key default gen_random_uuid(),
  sponsorship_id uuid not null references public.physique_sponsorships(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  flavor_id uuid references public.product_flavors(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  quantity integer not null check (quantity>0),
  product_name_snapshot text not null,
  flavor_name_snapshot text,
  unit_cost_snapshot numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_physique_sponsorships_athlete_event
  on public.physique_sponsorships(athlete_id,event_date desc,created_at desc);
create index if not exists idx_physique_sponsorships_status
  on public.physique_sponsorships(status);
create index if not exists idx_physique_sponsorship_items_sponsorship
  on public.physique_sponsorship_items(sponsorship_id);
alter table public.physique_sponsorships enable row level security;
alter table public.physique_sponsorship_items enable row level security;
drop policy if exists physique_sponsorships_manage on public.physique_sponsorships;
create policy physique_sponsorships_manage
on public.physique_sponsorships
for all
to authenticated
using (public.can_manage_physique())
with check (public.can_manage_physique());
drop policy if exists physique_sponsorship_items_manage on public.physique_sponsorship_items;
create policy physique_sponsorship_items_manage
on public.physique_sponsorship_items
for all
to authenticated
using (public.can_manage_physique())
with check (public.can_manage_physique());
grant select,insert,update,delete on public.physique_sponsorships to authenticated;
grant select,insert,update,delete on public.physique_sponsorship_items to authenticated;
create or replace function public.physique_sponsorship_snapshot(p_athlete_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path=public
as $$
declare
  v_sponsorships jsonb;
  v_items jsonb;
  v_products jsonb;
  v_flavors jsonb;
  v_locations jsonb;
begin
  if not public.can_manage_physique() then raise exception 'Sem permissão para gerenciar patrocínios da Physique'; end if;
  if not exists(select 1 from public.physique_athletes where id=p_athlete_id) then raise exception 'Atleta não encontrado'; end if;
  select coalesce(jsonb_agg(to_jsonb(s) order by coalesce(s.event_date,s.starts_on,s.created_at::date) desc,s.created_at desc),'[]'::jsonb)
  into v_sponsorships
  from public.physique_sponsorships s
  where s.athlete_id=p_athlete_id;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at,x.id),'[]'::jsonb)
  into v_items
  from (
    select
      i.id,i.sponsorship_id,i.product_id,
      i.product_name_snapshot as product_name,
      i.flavor_id,i.flavor_name_snapshot as flavor_name,
      i.location_id,l.code as location_code,l.name as location_name,
      i.quantity,i.unit_cost_snapshot,i.created_at
    from public.physique_sponsorship_items i
    join public.physique_sponsorships s on s.id=i.sponsorship_id
    join public.locations l on l.id=i.location_id
    where s.athlete_id=p_athlete_id
  ) x;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,
    'name',p.name,
    'flavor_tracking_enabled',coalesce(p.flavor_tracking_enabled,false)
  ) order by p.name),'[]'::jsonb)
  into v_products
  from public.products p
  where p.active;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id,'product_id',f.product_id,'name',f.name
  ) order by f.product_id,f.display_order,f.name),'[]'::jsonb)
  into v_flavors
  from public.product_flavors f
  where f.active;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',l.id,'code',l.code,'name',l.name
  ) order by l.code,l.name),'[]'::jsonb)
  into v_locations
  from public.locations l
  where l.active and l.tracks_inventory;
  return jsonb_build_object(
    'sponsorships',v_sponsorships,
    'items',v_items,
    'products',v_products,
    'flavors',v_flavors,
    'locations',v_locations
  );
end;
$$;
create or replace function public.create_physique_sponsorship(
  p_athlete_id uuid,
  p_event_name text,
  p_event_type text default null,
  p_event_date date default null,
  p_event_location text default null,
  p_starts_on date default null,
  p_ends_on date default null,
  p_sponsorship_type text default 'products',
  p_cash_amount numeric default 0,
  p_objective text default null,
  p_consideration text default null,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_flavor_name text;
  v_location public.locations%rowtype;
  v_product_id uuid;
  v_flavor_id uuid;
  v_location_id uuid;
  v_quantity integer;
  v_item_count integer := case when jsonb_typeof(coalesce(p_items,'[]'::jsonb))='array' then jsonb_array_length(coalesce(p_items,'[]'::jsonb)) else 0 end;
  v_event_name text := nullif(btrim(p_event_name),'');
  v_type text := coalesce(nullif(btrim(p_sponsorship_type),''),'products');
  v_cash numeric(12,2) := greatest(coalesce(p_cash_amount,0),0);
begin
  if not public.can_manage_physique() then raise exception 'Sem permissão para gerenciar patrocínios da Physique'; end if;
  if not exists(select 1 from public.physique_athletes where id=p_athlete_id) then raise exception 'Atleta não encontrado'; end if;
  if v_event_name is null then raise exception 'Informe o nome do evento'; end if;
  if v_type not in ('money','products','mixed') then raise exception 'Tipo de patrocínio inválido'; end if;
  if p_ends_on is not null and p_starts_on is not null and p_ends_on<p_starts_on then raise exception 'A data final não pode ser anterior ao início do apoio'; end if;
  if v_type='money' and v_cash<=0 then raise exception 'Informe o valor do patrocínio em dinheiro'; end if;
  if v_type='products' and v_item_count<=0 then raise exception 'Adicione pelo menos um suplemento ao patrocínio'; end if;
  if v_type='mixed' and (v_cash<=0 or v_item_count<=0) then raise exception 'No patrocínio misto, informe dinheiro e pelo menos um suplemento'; end if;
  insert into public.physique_sponsorships(
    athlete_id,event_name,event_type,event_date,event_location,starts_on,ends_on,
    sponsorship_type,cash_amount,objective,consideration,notes,status,created_by
  ) values (
    p_athlete_id,v_event_name,nullif(btrim(p_event_type),''),p_event_date,
    nullif(btrim(p_event_location),''),p_starts_on,p_ends_on,v_type,v_cash,
    nullif(btrim(p_objective),''),nullif(btrim(p_consideration),''),nullif(btrim(p_notes),''),
    'planned',auth.uid()
  ) returning id into v_id;
  if v_type in ('products','mixed') then
    if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' then raise exception 'Lista de produtos inválida'; end if;
    for v_item in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb))
    loop
      v_product_id:=nullif(v_item->>'product_id','')::uuid;
      v_flavor_id:=nullif(v_item->>'flavor_id','')::uuid;
      v_location_id:=nullif(v_item->>'location_id','')::uuid;
      v_quantity:=greatest(coalesce((v_item->>'quantity')::integer,0),0);
      if v_product_id is null or v_location_id is null or v_quantity<=0 then
        raise exception 'Produto, local e quantidade são obrigatórios no patrocínio';
      end if;
      select * into v_product from public.products where id=v_product_id and active;
      if not found then raise exception 'Produto inválido ou inativo'; end if;
      select * into v_location from public.locations where id=v_location_id and active and tracks_inventory;
      if not found then raise exception 'Local de estoque inválido ou inativo'; end if;
      if coalesce(v_product.flavor_tracking_enabled,false) then
        if v_flavor_id is null then raise exception 'Selecione o sabor de %',v_product.name; end if;
        select name into v_flavor_name
        from public.product_flavors
        where id=v_flavor_id and product_id=v_product_id and active;
        if not found then raise exception 'Sabor inválido para %',v_product.name; end if;
      else
        if v_flavor_id is not null then raise exception 'O produto % não utiliza controle por sabor',v_product.name; end if;
        v_flavor_name:=null;
      end if;
      insert into public.physique_sponsorship_items(
        sponsorship_id,product_id,flavor_id,location_id,quantity,
        product_name_snapshot,flavor_name_snapshot,unit_cost_snapshot
      ) values (
        v_id,v_product_id,v_flavor_id,v_location_id,v_quantity,
        v_product.name,v_flavor_name,
        coalesce(v_product.cost_price,0)
      );
    end loop;
  end if;
  insert into public.audit_events(entity_type,entity_id,action,details)
  values('physique_sponsorship',v_id,'created',jsonb_build_object(
    'athlete_id',p_athlete_id,
    'event_name',v_event_name,
    'sponsorship_type',v_type,
    'cash_amount',v_cash,
    'product_lines',v_item_count
  ));
  return v_id;
end;
$$;
create or replace function public.physique_sponsorship_action(
  p_sponsorship_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_s public.physique_sponsorships%rowtype;
  v_item public.physique_sponsorship_items%rowtype;
  v_action text := lower(coalesce(nullif(btrim(p_action),''),''));
  v_needs_products boolean;
  v_needs_cash boolean;
  v_fulfilled boolean;
begin
  if not public.can_manage_physique() then raise exception 'Sem permissão para gerenciar patrocínios da Physique'; end if;
  select * into v_s
  from public.physique_sponsorships
  where id=p_sponsorship_id
  for update;
  if not found then raise exception 'Patrocínio não encontrado'; end if;
  v_needs_products:=v_s.sponsorship_type in ('products','mixed');
  v_needs_cash:=v_s.sponsorship_type in ('money','mixed');
  if v_action='approve' then
    if v_s.status<>'planned' then raise exception 'Somente patrocínios planejados podem ser aprovados'; end if;
    update public.physique_sponsorships set status='approved',updated_at=now() where id=v_s.id;
  elsif v_action='cancel' then
    if v_s.status not in ('planned','approved') then raise exception 'Este patrocínio não pode mais ser cancelado'; end if;
    if v_s.products_delivered_at is not null or v_s.cash_paid_at is not null then
      raise exception 'Não é possível cancelar depois que dinheiro ou produtos já foram entregues';
    end if;
    update public.physique_sponsorships set status='cancelled',updated_at=now() where id=v_s.id;
  elsif v_action='deliver_products' then
    if v_s.status<>'approved' then raise exception 'Aprove o patrocínio antes de entregar os produtos'; end if;
    if not v_needs_products then raise exception 'Este patrocínio não possui suplementos'; end if;
    if v_s.products_delivered_at is not null then raise exception 'Os suplementos deste patrocínio já foram entregues'; end if;
    if not exists(select 1 from public.physique_sponsorship_items where sponsorship_id=v_s.id) then
      raise exception 'Nenhum suplemento foi vinculado a este patrocínio';
    end if;
    for v_item in
      select * from public.physique_sponsorship_items where sponsorship_id=v_s.id order by created_at,id
    loop
      insert into public.inventory_movements(
        product_id,location_id,flavor_id,movement_type,quantity_delta,notes,idempotency_key,created_by
      ) values (
        v_item.product_id,
        v_item.location_id,
        v_item.flavor_id,
        'adjustment',
        -v_item.quantity,
        'Patrocínio Physique · '||v_s.event_name,
        'physique:sponsorship:'||v_s.id::text||':item:'||v_item.id::text||':delivery',
        auth.uid()
      ) on conflict(idempotency_key) do nothing;
    end loop;
    update public.physique_sponsorships set products_delivered_at=now(),updated_at=now() where id=v_s.id;
  elsif v_action='mark_cash_paid' then
    if v_s.status<>'approved' then raise exception 'Aprove o patrocínio antes de confirmar o pagamento'; end if;
    if not v_needs_cash then raise exception 'Este patrocínio não possui valor em dinheiro'; end if;
    if v_s.cash_paid_at is not null then raise exception 'O pagamento deste patrocínio já foi confirmado'; end if;
    update public.physique_sponsorships set cash_paid_at=now(),updated_at=now() where id=v_s.id;
  elsif v_action='finalize' then
    if v_s.status<>'fulfilled' then raise exception 'Conclua as entregas e pagamentos antes de finalizar'; end if;
    update public.physique_sponsorships set status='finalized',finalized_at=now(),updated_at=now() where id=v_s.id;
  else
    raise exception 'Ação de patrocínio inválida';
  end if;
  select * into v_s from public.physique_sponsorships where id=p_sponsorship_id;
  if v_s.status='approved' then
    v_fulfilled:=
      (not v_needs_products or v_s.products_delivered_at is not null)
      and (not v_needs_cash or v_s.cash_paid_at is not null);
    if v_fulfilled then
      update public.physique_sponsorships set status='fulfilled',updated_at=now() where id=v_s.id;
      select * into v_s from public.physique_sponsorships where id=p_sponsorship_id;
    end if;
  end if;
  insert into public.audit_events(entity_type,entity_id,action,details)
  values('physique_sponsorship',v_s.id,'sponsorship_'||v_action,jsonb_build_object(
    'status',v_s.status,
    'products_delivered_at',v_s.products_delivered_at,
    'cash_paid_at',v_s.cash_paid_at,
    'finalized_at',v_s.finalized_at
  ));
  return to_jsonb(v_s);
end;
$$;
revoke all on function public.physique_sponsorship_snapshot(uuid) from public,anon;
revoke all on function public.create_physique_sponsorship(uuid,text,text,date,text,date,date,text,numeric,text,text,text,jsonb) from public,anon;
revoke all on function public.physique_sponsorship_action(uuid,text) from public,anon;
grant execute on function public.physique_sponsorship_snapshot(uuid) to authenticated;
grant execute on function public.create_physique_sponsorship(uuid,text,text,date,text,date,date,text,numeric,text,text,text,jsonb) to authenticated;
grant execute on function public.physique_sponsorship_action(uuid,text) to authenticated;
