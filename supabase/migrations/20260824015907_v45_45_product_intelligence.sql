-- Candinho Company · V45.45
-- Inteligência de Produto
-- 1) products.cost_price passa a ser referência fixa de mercado/compra normal.
-- 2) Cada recebimento mantém seu custo real e cria uma camada de custo interna.
-- 3) Transferências preservam o custo da unidade e vendas usam FIFO/FEFO real.
-- 4) O custo real vendido é gravado em sale_items/sales sem alterar a referência do produto.

begin;

-- -----------------------------------------------------------------------------
-- 1. Semântica do custo do cadastro
-- -----------------------------------------------------------------------------

alter table public.products
  drop constraint if exists products_cost_method_check;

alter table public.products
  add constraint products_cost_method_check
  check (cost_method in ('reference','moving_average','manual'));

-- A operação de Suplementos passa a usar custo de referência por padrão.
update public.products
set cost_method='reference'
where cost_method='moving_average';

-- O recebimento antigo atualiza products.cost_price dentro da própria RPC.
-- O trigger abaixo roda diferido no fim da transação e restaura a referência
-- quando o produto usa reference/manual. Em moving_average, preserva o cálculo antigo.
create or replace function public.apply_product_moving_average_after_receipt()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_product_id uuid;
  v_method text;
begin
  select poi.product_id
  into v_product_id
  from public.purchase_order_items poi
  where poi.id=new.purchase_order_item_id;

  if v_product_id is null then
    return null;
  end if;

  select p.cost_method
  into v_method
  from public.products p
  where p.id=v_product_id;

  update public.products
  set cost_price=case
        when v_method='moving_average'
          then round(coalesce(new.calculated_average_unit_cost,new.unit_cost),2)
        else round(coalesce(new.previous_average_unit_cost,cost_price),2)
      end,
      last_purchase_cost=new.unit_cost,
      last_purchase_on=new.received_on,
      cost_updated_from_receipt_id=new.id,
      updated_at=now()
  where id=v_product_id;

  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Camadas internas de custo usando a rastreabilidade de lote já existente
-- -----------------------------------------------------------------------------

-- Estoque atual sem sabor: cria uma camada inicial pelo custo de referência.
-- Só classifica a diferença ainda não coberta por inventory_lots.
insert into public.inventory_lots(
  product_id,
  flavor_id,
  location_id,
  lot_number,
  received_on,
  unit_cost,
  quantity_on_hand,
  status,
  notes
)
select
  sb.product_id,
  null,
  sb.location_id,
  'COST-OPENING-'||sb.product_id::text||'-'||sb.location_id::text,
  (p.created_at at time zone 'America/Sao_Paulo')::date,
  coalesce(p.cost_price,0),
  greatest(sb.quantity-coalesce(existing.tracked_quantity,0),0),
  'active',
  'V45.45 · camada inicial de custo pelo valor de referência do cadastro'
from public.stock_balances sb
join public.products p on p.id=sb.product_id
left join lateral (
  select coalesce(sum(il.quantity_on_hand),0)::integer tracked_quantity
  from public.inventory_lots il
  where il.product_id=sb.product_id
    and il.location_id=sb.location_id
    and il.flavor_id is null
) existing on true
where sb.quantity>coalesce(existing.tracked_quantity,0)
  and not coalesce(p.lot_tracking_enabled,false)
on conflict do nothing;

-- Estoque atual com sabor: mesma lógica, preservando sabor e localização.
insert into public.inventory_lots(
  product_id,
  flavor_id,
  location_id,
  lot_number,
  received_on,
  unit_cost,
  quantity_on_hand,
  status,
  notes
)
select
  pf.product_id,
  pfs.flavor_id,
  pfs.location_id,
  'COST-OPENING-'||pf.product_id::text||'-'||pfs.location_id::text||'-'||pfs.flavor_id::text,
  (p.created_at at time zone 'America/Sao_Paulo')::date,
  coalesce(p.cost_price,0),
  greatest(pfs.quantity-coalesce(existing.tracked_quantity,0),0),
  'active',
  'V45.45 · camada inicial de custo por sabor pelo valor de referência do cadastro'
from public.product_flavor_stock_balances pfs
join public.product_flavors pf on pf.id=pfs.flavor_id
join public.products p on p.id=pf.product_id
left join lateral (
  select coalesce(sum(il.quantity_on_hand),0)::integer tracked_quantity
  from public.inventory_lots il
  where il.product_id=pf.product_id
    and il.location_id=pfs.location_id
    and il.flavor_id=pfs.flavor_id
) existing on true
where pfs.quantity>coalesce(existing.tracked_quantity,0)
  and not coalesce(p.lot_tracking_enabled,false)
on conflict do nothing;

-- Cada recebimento futuro cria sua própria camada de custo.
-- Para produtos que já possuem lote real, apenas garante o custo real naquele lote.
create or replace function public.capture_purchase_receipt_cost_layer_v4545()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_product_id uuid;
  v_location_id uuid;
  v_supplier_id uuid;
  v_lot_tracking boolean:=false;
  v_unit_cost numeric(14,4);
  v_existing_lot_id uuid;
begin
  select
    poi.product_id,
    po.destination_location_id,
    po.supplier_id,
    coalesce(p.lot_tracking_enabled,false)
  into
    v_product_id,
    v_location_id,
    v_supplier_id,
    v_lot_tracking
  from public.purchase_order_items poi
  join public.purchase_orders po on po.id=poi.purchase_order_id
  join public.products p on p.id=poi.product_id
  where poi.id=new.purchase_order_item_id;

  if v_product_id is null or v_location_id is null then
    return new;
  end if;

  v_unit_cost:=coalesce(new.effective_unit_cost,new.unit_cost,0);

  if nullif(btrim(new.lot_number),'') is not null then
    select il.id
    into v_existing_lot_id
    from public.inventory_lots il
    where il.product_id=v_product_id
      and il.location_id=v_location_id
      and il.flavor_id is not distinct from new.flavor_id
      and lower(il.lot_number)=lower(btrim(new.lot_number))
      and il.expires_on is not distinct from new.expires_on
    limit 1;

    if v_existing_lot_id is not null then
      update public.inventory_lots
      set unit_cost=v_unit_cost,
          supplier_id=coalesce(supplier_id,v_supplier_id),
          received_on=coalesce(received_on,new.received_on),
          updated_at=now()
      where id=v_existing_lot_id;
    end if;

    return new;
  end if;

  -- Produto sem controle de lote: cria um lote técnico invisível para preservar custo.
  if not v_lot_tracking then
    insert into public.inventory_lots(
      product_id,
      flavor_id,
      location_id,
      lot_number,
      received_on,
      unit_cost,
      supplier_id,
      quantity_on_hand,
      status,
      notes
    )
    values(
      v_product_id,
      new.flavor_id,
      v_location_id,
      'COST-'||new.id::text,
      new.received_on,
      v_unit_cost,
      v_supplier_id,
      new.quantity_received,
      'active',
      'V45.45 · camada técnica de custo da entrada '||new.id::text
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists purchase_receipts_cost_layer_v4545
on public.purchase_receipts;

create trigger purchase_receipts_cost_layer_v4545
after insert on public.purchase_receipts
for each row
execute function public.capture_purchase_receipt_cost_layer_v4545();

-- -----------------------------------------------------------------------------
-- 3. Custo real da venda a partir das unidades efetivamente baixadas
-- -----------------------------------------------------------------------------

create or replace function public.recalculate_sale_acquisition_cost_v4545(
  p_sale_id uuid
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row record;
  v_total_cost numeric(14,4):=0;
  v_gift_cost numeric(14,4):=0;
  v_total_amount numeric(14,2):=0;
  v_operational_cost numeric(14,2):=0;
  v_unit_cost numeric(14,4);
begin
  if p_sale_id is null then
    return;
  end if;

  -- Para cada produto/sabor da venda, usa as alocações geradas pela baixa FEFO/FIFO.
  for v_row in
    select
      ilm.product_id,
      ilm.flavor_id,
      sum(abs(ilm.quantity_delta))::numeric(14,4) allocated_quantity,
      sum(
        abs(ilm.quantity_delta)
        * coalesce(il.unit_cost,p.cost_price,0)
      )::numeric(14,4) allocated_cost
    from public.inventory_lot_movements ilm
    join public.products p on p.id=ilm.product_id
    left join public.inventory_lots il on il.id=ilm.lot_id
    where ilm.sale_id=p_sale_id
      and ilm.movement_type='sale'
      and ilm.quantity_delta<0
    group by ilm.product_id,ilm.flavor_id
  loop
    if coalesce(v_row.allocated_quantity,0)<=0 then
      continue;
    end if;

    v_unit_cost:=v_row.allocated_cost/v_row.allocated_quantity;

    update public.sale_items si
    set unit_cost=round(v_unit_cost,4),
        total_cost=round(si.quantity*v_unit_cost,2),
        total_profit=round(si.total_price-(si.quantity*v_unit_cost),2)
    where si.sale_id=p_sale_id
      and si.product_id=v_row.product_id
      and si.flavor_id is not distinct from v_row.flavor_id;
  end loop;

  select
    coalesce(sum(si.total_cost),0)::numeric(14,4)
  into v_total_cost
  from public.sale_items si
  where si.sale_id=p_sale_id;

  select
    coalesce(s.gift_quantity,0)*coalesce(s.gift_unit_cost,0),
    coalesce(s.total_amount,0),
    coalesce(s.operational_cost_total,0)
  into
    v_gift_cost,
    v_total_amount,
    v_operational_cost
  from public.sales s
  where s.id=p_sale_id;

  v_total_cost:=v_total_cost+coalesce(v_gift_cost,0);

  update public.sales
  set total_cost=round(v_total_cost,2),
      total_profit=round(v_total_amount-v_total_cost,2),
      contribution_margin=round(v_total_amount-v_total_cost-v_operational_cost,2),
      updated_at=now()
  where id=p_sale_id;

  -- Se a venda já tiver snapshot operacional, sincroniza o custo da mercadoria
  -- sem repetir a baixa dos insumos operacionais.
  update public.sale_operational_cost_snapshots snap
  set merchandise_cost_total=round(v_total_cost,2),
      gross_profit=round(snap.revenue_total-v_total_cost,2),
      variable_cost_total=round(v_total_cost+snap.operational_cost_total,2),
      contribution_margin=round(
        snap.revenue_total-v_total_cost-snap.operational_cost_total,
        2
      )
  where snap.operation_scope='supplements'
    and snap.sale_id=p_sale_id
    and snap.status='finalized';
end;
$$;

revoke all
on function public.recalculate_sale_acquisition_cost_v4545(uuid)
from public,anon;

grant execute
on function public.recalculate_sale_acquisition_cost_v4545(uuid)
to authenticated,service_role;

create or replace function public.defer_sale_acquisition_cost_v4545()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.recalculate_sale_acquisition_cost_v4545(new.sale_id);
  return null;
end;
$$;

drop trigger if exists inventory_lot_movements_sale_cost_v4545
on public.inventory_lot_movements;

create constraint trigger inventory_lot_movements_sale_cost_v4545
after insert on public.inventory_lot_movements
deferrable initially deferred
for each row
when (
  new.sale_id is not null
  and new.movement_type='sale'
  and new.quantity_delta<0
)
execute function public.defer_sale_acquisition_cost_v4545();

-- Auditoria da virada de método.
insert into public.audit_events(entity_type,action,details)
values(
  'system',
  'product_cost_reference_v4545_enabled',
  jsonb_build_object(
    'reference_cost','products.cost_price',
    'real_purchase_cost','purchase_receipts.unit_cost/effective_unit_cost',
    'cost_layers','inventory_lots',
    'sale_cost_source','inventory_lot_movements FIFO/FEFO',
    'enabled_at',now()
  )
);

commit;
