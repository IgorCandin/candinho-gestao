-- Company: politica reversivel de estoque com caixa enxuto.
-- Preserva todos os valores de estoque ideal e muda apenas o alvo efetivo.

create table if not exists public.inventory_policy_settings (
  id text primary key default 'company',
  mode text not null default 'lean' check (mode in ('lean', 'standard')),
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id),
  constraint inventory_policy_settings_singleton check (id = 'company')
);

alter table public.inventory_policy_settings enable row level security;

drop policy if exists inventory_policy_settings_read on public.inventory_policy_settings;
create policy inventory_policy_settings_read
on public.inventory_policy_settings for select
to authenticated
using (true);

drop policy if exists inventory_policy_settings_admin_update on public.inventory_policy_settings;
create policy inventory_policy_settings_admin_update
on public.inventory_policy_settings for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.active
      and profiles.role = 'admin'
  )
)
with check (
  id = 'company'
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.active
      and profiles.role = 'admin'
  )
);

grant select on public.inventory_policy_settings to authenticated;
grant update (mode, updated_at, updated_by) on public.inventory_policy_settings to authenticated;

insert into public.inventory_policy_settings (id, mode)
values ('company', 'lean')
on conflict (id) do nothing;

create or replace function public.inventory_policy_mode()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select s.mode from public.inventory_policy_settings s where s.id = 'company'),
    'standard'
  );
$$;

grant execute on function public.inventory_policy_mode() to authenticated, service_role;

create or replace function public.inventory_effective_target(
  p_product_id uuid,
  p_minimum integer,
  p_ideal integer,
  p_weighted_daily_demand numeric,
  p_lead_time_days integer,
  p_target_cover_days integer
)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when public.inventory_policy_mode() = 'lean' then
      case
        when coalesce(upper(p.sales_category), 'C') = 'A'
          and not coalesce(p.restricted, false)
          then greatest(coalesce(p_minimum, 0), 1)
        else 0
      end
    else greatest(
      coalesce(p_ideal, p_minimum, 0),
      ceil(
        coalesce(p_weighted_daily_demand, 0)
        * (coalesce(p_lead_time_days, 0) + coalesce(p_target_cover_days, 0))::numeric
      )::integer
    )
  end
  from public.products p
  where p.id = p_product_id;
$$;

grant execute on function public.inventory_effective_target(uuid, integer, integer, numeric, integer, integer)
to authenticated, service_role;

-- Z deixa de ser sinonimo de restrito. A inteligencia pode sugerir A/B/C para
-- qualquer produto publico; somente restricted=true permanece Z.
create or replace view public.product_sales_category_intelligence as
with sales_stats as (
  select
    si.product_id,
    coalesce(sum(case when coalesce(s.delivered_at,s.quoted_at,s.created_at)>=now()-interval '30 days' then si.quantity else 0 end),0)::integer units_30d,
    coalesce(sum(case when coalesce(s.delivered_at,s.quoted_at,s.created_at)>=now()-interval '90 days' then si.quantity else 0 end),0)::integer units_90d,
    coalesce(sum(si.quantity),0)::integer units_all,
    max(coalesce(s.delivered_at,s.quoted_at,s.created_at)) last_sale_at
  from public.sale_items si
  join public.sales s on s.id=si.sale_id
  where s.record_type::text='sale' and s.general_status::text<>'cancelled'
  group by si.product_id
), stock as (
  select sb.product_id,coalesce(sum(sb.quantity),0)::integer physical_quantity
  from public.stock_balances sb
  join public.locations l on l.id=sb.location_id
  where l.active and l.tracks_inventory and l.counts_for_replenishment
  group by sb.product_id
)
select
  p.id product_id,p.name product_name,p.brand,p.category,
  upper(coalesce(p.sales_category,'C')) current_category,
  case
    when p.restricted then 'Z'
    when coalesce(ss.units_30d,0)>=2 or coalesce(ss.units_90d,0)>=5 then 'A'
    when coalesce(ss.units_90d,0)>=2 or (coalesce(ss.units_all,0)>=4 and ss.last_sale_at>=now()-interval '180 days') then 'B'
    else 'C'
  end suggested_category,
  coalesce(ss.units_30d,0) units_30d,coalesce(ss.units_90d,0) units_90d,
  coalesce(ss.units_all,0) units_all,ss.last_sale_at,
  coalesce(st.physical_quantity,0) company_quantity,p.min_stock,p.ideal_stock,
  case
    when p.restricted then 'Produto restrito: permanece fora das areas publicas'
    when coalesce(ss.units_30d,0)>=2 then 'Alto giro: 2 ou mais unidades nos ultimos 30 dias'
    when coalesce(ss.units_90d,0)>=5 then 'Alto giro: 5 ou mais unidades nos ultimos 90 dias'
    when coalesce(ss.units_90d,0)>=2 then 'Giro regular: 2 ou mais unidades nos ultimos 90 dias'
    when coalesce(ss.units_all,0)>=4 and ss.last_sale_at>=now()-interval '180 days' then 'Historico relevante com venda nos ultimos 180 dias'
    else 'Baixo giro recente: tratar como sob encomenda'
  end classification_reason,
  case
    when p.restricted then 'Sem alerta automatico e sem exposicao publica'
    when coalesce(ss.units_30d,0)>=2 or coalesce(ss.units_90d,0)>=5 then 'Alertar pelo minimo da categoria A'
    when coalesce(ss.units_90d,0)>=2 or (coalesce(ss.units_all,0)>=4 and ss.last_sale_at>=now()-interval '180 days') then 'Pode zerar no modo caixa enxuto'
    else 'Sob encomenda: zero sem urgencia'
  end stock_policy
from public.products p
left join sales_stats ss on ss.product_id=p.id
left join stock st on st.product_id=p.id
where p.active and coalesce(p.brand,'')<>'Combo' and upper(p.name) not like 'COMBO %';

-- Reposicao usa apenas saldo central disponivel, reservas, mercadoria a caminho
-- e a curva explicitamente aprovada no produto.
create or replace view public.replenishment_overview as
with central_stock as (
  select
    ilo.product_id,
    coalesce(sum(ilo.physical_quantity),0)::integer company_quantity,
    coalesce(sum(ilo.reserved_quantity),0)::integer reserved_quantity,
    coalesce(sum(ilo.available_quantity),0)::integer available_quantity,
    coalesce(sum(ilo.incoming_quantity),0)::integer incoming_quantity
  from public.inventory_location_overview ilo
  join public.locations l on l.id=ilo.location_id
  where l.active and l.tracks_inventory and l.counts_for_replenishment
  group by ilo.product_id
), backlog as (
  select sr.product_id,
    coalesce(sum(greatest(sr.quantity_requested-sr.quantity_reserved,0)),0)::integer backlog_quantity
  from public.stock_reservations sr
  join public.locations l on l.id=sr.location_id
  where sr.status in ('awaiting_stock','partial')
    and l.active and l.tracks_inventory and l.counts_for_replenishment
  group by sr.product_id
), base as (
  select p.*,
    upper(coalesce(p.sales_category,'C')) effective_sales_category,
    coalesce(cs.company_quantity,0) company_quantity,
    coalesce(cs.reserved_quantity,0) reserved_quantity,
    coalesce(cs.available_quantity,0) available_quantity,
    coalesce(cs.incoming_quantity,0) incoming_quantity,
    coalesce(b.backlog_quantity,0) backlog_quantity
  from public.products p
  left join central_stock cs on cs.product_id=p.id
  left join backlog b on b.product_id=p.id
  where p.active
)
select
  p.id product_id,p.name product_name,p.category,p.company_quantity,p.min_stock,p.ideal_stock,
  case
    when public.inventory_policy_mode()='lean' then
      p.effective_sales_category='A' and not p.restricted
      and p.available_quantity+p.incoming_quantity-p.backlog_quantity < greatest(p.min_stock,1)
    else
      p.effective_sales_category in ('A','B') and not p.restricted
      and p.available_quantity+p.incoming_quantity-p.backlog_quantity < greatest(coalesce(nullif(p.ideal_stock,0),p.min_stock),1)
  end needs_replenishment,
  case
    when public.inventory_policy_mode()='lean' and p.effective_sales_category='A' and not p.restricted
      then greatest(greatest(p.min_stock,1)+p.backlog_quantity-p.available_quantity-p.incoming_quantity,0)
    when public.inventory_policy_mode()<>'lean' and p.effective_sales_category in ('A','B') and not p.restricted
      then greatest(greatest(coalesce(nullif(p.ideal_stock,0),p.min_stock),1)+p.backlog_quantity-p.available_quantity-p.incoming_quantity,0)
    else 0
  end suggested_order_quantity,
  case
    when p.restricted or p.effective_sales_category in ('C','Z') then 'healthy'
    when p.available_quantity+p.incoming_quantity-p.backlog_quantity<=0 then 'out_of_stock'
    when p.effective_sales_category='A' and p.available_quantity+p.incoming_quantity-p.backlog_quantity<greatest(p.min_stock,1) then 'below_minimum'
    else 'healthy'
  end stock_status,
  p.available_quantity,p.incoming_quantity,p.reserved_quantity,p.backlog_quantity,
  p.effective_sales_category,public.inventory_policy_mode() policy_mode
from base p;

-- Mantem a estrutura existente do planejador, trocando somente o alvo calculado.
do $$
declare
  view_sql text;
  old_expression text := 'GREATEST(b.ideal_stock, ceil(b.weighted_daily_demand * (b.lead_time_days + b.target_cover_days)::numeric)::integer)';
  new_expression text := 'public.inventory_effective_target(b.product_id, b.min_stock, b.ideal_stock, b.weighted_daily_demand, b.lead_time_days, b.target_cover_days)';
begin
  view_sql := pg_get_viewdef('public.purchase_planning_overview'::regclass,true);
  if position(old_expression in view_sql)=0 then
    raise exception 'purchase_planning_overview mudou: expressao de alvo nao encontrada';
  end if;
  view_sql := replace(view_sql,old_expression,new_expression);
  execute 'create or replace view public.purchase_planning_overview as '||view_sql;
end $$;

-- Correcoes aprovadas pelo diagnostico. Valores ideais nao sao apagados.
update public.products
set sales_category='B',updated_at=now()
where name='Creatina Mastigável 120 Comprimidos | Strong Pharma'
  and coalesce(sales_category,'')<>'B';

update public.products
set sales_category='C',updated_at=now()
where name in ('Amassador e Porta-Comprimidos','Chaveiro Mini Scoop')
  and coalesce(restricted,false)=false;

update public.products
set restricted=true,sales_category='Z',updated_at=now()
where name='Cobavital Estimulante de Apetite 16 Comprimidos | Abbott';

comment on table public.inventory_policy_settings is
'Politica reversivel de estoque. lean ignora o ideal nos alertas e compras sem apagar o valor cadastrado.';
