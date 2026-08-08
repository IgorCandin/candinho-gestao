begin;

-- V45.12 · Política temporária de caixa para reposição.
-- Uma unidade de produto A continua sendo atenção, mas deixa de ser compra obrigatória.
create or replace view public.replenishment_overview as
with company_stock as (
  select
    sb.product_id,
    coalesce(sum(sb.quantity), 0)::integer as company_quantity
  from public.stock_balances sb
  join public.locations l on l.id = sb.location_id
  where l.active
    and l.tracks_inventory
    and l.counts_for_replenishment
  group by sb.product_id
)
select
  p.id as product_id,
  p.name as product_name,
  p.category,
  coalesce(cs.company_quantity, 0) as company_quantity,
  p.min_stock,
  p.ideal_stock,
  case
    when upper(coalesce(p.sales_category, '')) in ('C', 'Z') then false
    when upper(coalesce(p.sales_category, '')) in ('A', 'B') then coalesce(cs.company_quantity, 0) <= 0
    else false
  end as needs_replenishment,
  case
    when upper(coalesce(p.sales_category, '')) in ('A', 'B')
      and coalesce(cs.company_quantity, 0) <= 0
      then greatest(
        greatest(coalesce(nullif(p.ideal_stock, 0), 1), 1)
        - coalesce(cs.company_quantity, 0),
        0
      )
    else 0
  end as suggested_order_quantity,
  case
    when upper(coalesce(p.sales_category, '')) in ('C', 'Z') then 'healthy'::text
    when upper(coalesce(p.sales_category, '')) = 'B' then
      case
        when coalesce(cs.company_quantity, 0) <= 0 then 'out_of_stock'::text
        else 'healthy'::text
      end
    when upper(coalesce(p.sales_category, '')) = 'A' then
      case
        when coalesce(cs.company_quantity, 0) <= 0 then 'out_of_stock'::text
        when coalesce(cs.company_quantity, 0) <= 1 then 'below_minimum'::text
        else 'healthy'::text
      end
    else 'healthy'::text
  end as stock_status
from public.products p
left join company_stock cs on cs.product_id = p.id
where p.active;

-- O gerador legado cria todo stockout como urgente. Este normalizador fica
-- na borda da tabela e aplica a política baseada em giro real A/B/C.
create or replace function public.normalize_nexus_stockout_priority_v45_12()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_category text := 'C';
  v_available integer := 0;
  v_incoming integer := 0;
begin
  if new.signal_type <> 'stockout' then
    return new;
  end if;

  select
    upper(coalesce(psi.suggested_category, p.sales_category, 'C')),
    coalesce(ico.available_quantity, 0),
    coalesce(ico.incoming_quantity, 0)
  into v_category, v_available, v_incoming
  from public.products p
  left join public.product_sales_category_intelligence psi
    on psi.product_id = p.id
  left join public.inventory_control_overview ico
    on ico.product_id = p.id
  where p.id = new.product_id;

  if coalesce(v_available, 0) > 0 or coalesce(v_incoming, 0) > 0 then
    new.severity := 'info';
    new.score := 0;
    new.status := 'resolved';
    new.resolved_at := coalesce(new.resolved_at, clock_timestamp());
    new.rationale := 'Já existe saldo disponível ou reposição a caminho.';
    new.recommended_action := 'Nenhuma compra urgente necessária agora.';
    return new;
  end if;

  if v_category = 'A' then
    new.severity := 'urgent';
    new.score := greatest(coalesce(new.score, 0), 86);
    new.rationale := 'Produto de alto giro está zerado e sem reposição a caminho.';
    new.recommended_action := 'Priorize a reposição quando houver caixa disponível.';
  elsif v_category = 'B' then
    new.severity := 'attention';
    new.score := least(greatest(coalesce(new.score, 0), 55), 70);
    new.rationale := 'Produto de giro regular está zerado; acompanhar sem tratar como urgência máxima.';
    new.recommended_action := 'Avalie incluir no próximo pedido quando houver caixa.';
  else
    new.severity := 'info';
    new.score := 0;
    new.status := 'resolved';
    new.resolved_at := coalesce(new.resolved_at, clock_timestamp());
    new.rationale := 'Produto de baixo giro não exige reposição automática no cenário atual.';
    new.recommended_action := 'Repor sob demanda ou quando houver folga de caixa.';
  end if;

  return new;
end;
$$;

drop trigger if exists nexus_stockout_priority_v45_12 on public.nexus_signals;
create trigger nexus_stockout_priority_v45_12
before insert or update on public.nexus_signals
for each row
execute function public.normalize_nexus_stockout_priority_v45_12();

update public.nexus_signals
set score = score
where signal_type = 'stockout';

commit;
