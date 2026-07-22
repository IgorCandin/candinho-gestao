begin;

-- Candinho Company · V38 · Simplificação final do catálogo
-- Padroniza Nome x Marca sem alterar o fornecedor.
-- O fornecedor continua em default_supplier_id.
-- Quando a marca não é inequívoca, fica NULL para revisão individual.

with mapping(sku,new_name,new_brand) as (
  values
    ('10011','Abduzido Pré-Treino',null::text),
    ('10021','Amassador e Porta-Comprimidos',null::text),
    ('10031','Ashwagandha',null::text),
    ('10041','Ashwagandha + Moringa + Maca Negra',null::text),
    ('10051','Basic Whey 1kg','Growth Supplements'),
    ('10061','BCAA 10:1:1','FTW'),
    ('10071','Beta-Alanina','Atlhetica Nutrition'),
    ('10081','Beterraba 120 Cápsulas',null::text),
    ('10091','Biotina Cabelo, Pele e Unhas',null::text),
    ('10101','Biotina Vitamina B7',null::text),
    ('10111','Cafeína 100mg','Growth Supplements'),
    ('10121','Cafeína 400mg','Health Labs'),
    ('10131','Cafeína 420mg','OficialFarma'),
    ('10141','Cafeína 200mg','Pure Energy'),
    ('10151','Carnificina 300g','Body Shape'),
    ('10161','Chaveiro Mini Scoop',null::text),
    ('10171','Cobavital Estimulante de Apetite',null::text),
    ('10181','Colágeno Hidrolisado 120 Cápsulas','Dark Lab'),
    ('10191','Complexo de Magnésio 3 em 1',null::text),
    ('10201','Complexo B',null::text),
    ('10211','Coqueteleira',null::text),
    ('10221','Creatina Monohidratada 300g','Candinho Suplementos'),
    ('10231','Creatina CreaGummy','CreaGummy'),
    ('10241','Creatina 120 Cápsulas - Dark Lab','Dark Lab'),
    ('10251','Creatina Monohidratada','Growth Supplements'),
    ('10261','Creatina 120 Cápsulas - Health Labs','Health Labs'),
    ('10271','Creatina 120 Cápsulas - Integralmédica','Integralmédica'),
    ('10281','Creatina Monohidratada Mastigável',null::text),
    ('10291','Creatina Turbo com Sabor 300g','Black Skull'),
    ('10301','Diabo Verde Pré-Treino',null::text),
    ('10311','Enantato de Testosterona','American'),
    ('10321','Feno-Grego',null::text),
    ('10351','Anabolic Mass 3kg','Profit Labs'),
    ('10361','Army Super Mass 3kg','Soldiers Nutrition'),
    ('10371','HMB Pure','Nature Now'),
    ('10381','Ioimbina 5mg','OficialFarma'),
    ('10391','Kit Whey Protein',null::text),
    ('10401','Maca Peruana',null::text),
    ('10411','Massive Mass Hipercalórico','FTW'),
    ('10421','Melatonina',null::text),
    ('10431','Moringa',null::text),
    ('10441','Multivitamínico A-Z','Health Labs'),
    ('10451','Multivitamínico 60 Cápsulas','FTW'),
    ('10461','NAC',null::text),
    ('10471','Ômega 3 1g','OficialFarma'),
    ('10491','Pholia Magra',null::text),
    ('10501','Picolinato de Cromo','Growth Supplements'),
    ('10511','Polivitamínico Mastigável','Growth Supplements'),
    ('10521','Porta-Comprimidos Semanal',null::text),
    ('10531','Psyllium 500mg','OficialFarma'),
    ('10541','Taurina 500mg','OficialFarma'),
    ('10551','Thermo Crazy',null::text),
    ('10561','Thermo Food',null::text),
    ('10581','Touro Power',null::text),
    ('10591','Trembolona','American'),
    ('10601','Uxi Amarelo + Unha-de-Gato',null::text),
    ('10611','Vitamina B12',null::text),
    ('10621','Vitamina B12 1mg','OficialFarma'),
    ('10631','Whey 100% 900g - Dark Lab','Dark Lab'),
    ('10641','Whey 100% 900g - FTW','FTW'),
    ('10651','Whey 100% HD 900g','Black Skull'),
    ('10661','Whey Isolate Protein 1,8kg','Dark Lab'),
    ('10671','Whey Protein 1kg','Soldiers Nutrition'),
    ('10681','Whey Protein Concentrado 1kg','Dark Lab'),
    ('10691','Whey Protein Gourmet 900g','FN Forbis'),
    ('10701','Zinco Quelato','Health Labs'),
    ('10711','Testo Dilated Red 120 Cápsulas','Body Nutry'),
    ('10721','Testo Blue 120 Cápsulas','Body Nutry')
)
update public.products p
set
  name=m.new_name,
  brand=m.new_brand,
  updated_at=now()
from mapping m
where p.sku=m.sku
  and (
    p.name is distinct from m.new_name
    or p.brand is distinct from m.new_brand
  );

-- Giro inteligente:
-- A = >=2 unidades em 30 dias OU >=5 em 90 dias
-- B = >=2 em 90 dias OU histórico >=4 com venda nos últimos 180 dias
-- C = restante / sob encomenda
-- Z = nunca alterado automaticamente

create or replace view public.product_sales_category_intelligence
with (security_invoker = true)
as
with sales_stats as (
  select
    si.product_id,
    coalesce(sum(
      case
        when coalesce(s.delivered_at,s.quoted_at,s.created_at)
          >= now()-interval '30 days'
        then si.quantity
        else 0
      end
    ),0)::integer as units_30d,
    coalesce(sum(
      case
        when coalesce(s.delivered_at,s.quoted_at,s.created_at)
          >= now()-interval '90 days'
        then si.quantity
        else 0
      end
    ),0)::integer as units_90d,
    coalesce(sum(si.quantity),0)::integer as units_all,
    max(coalesce(s.delivered_at,s.quoted_at,s.created_at)) as last_sale_at
  from public.sale_items si
  join public.sales s on s.id=si.sale_id
  where s.record_type::text='sale'
    and s.general_status::text<>'cancelled'
  group by si.product_id
),
stock as (
  select
    sb.product_id,
    coalesce(sum(sb.quantity),0)::integer as physical_quantity
  from public.stock_balances sb
  join public.locations l on l.id=sb.location_id
  where l.active
    and l.tracks_inventory
    and l.counts_for_replenishment
  group by sb.product_id
)
select
  p.id as product_id,
  p.name as product_name,
  p.brand,
  p.category,
  upper(coalesce(p.sales_category,'C')) as current_category,
  case
    when p.restricted
      or upper(coalesce(p.sales_category,''))='Z'
      then 'Z'
    when coalesce(ss.units_30d,0)>=2
      or coalesce(ss.units_90d,0)>=5
      then 'A'
    when coalesce(ss.units_90d,0)>=2
      or (
        coalesce(ss.units_all,0)>=4
        and ss.last_sale_at>=now()-interval '180 days'
      )
      then 'B'
    else 'C'
  end as suggested_category,
  coalesce(ss.units_30d,0) as units_30d,
  coalesce(ss.units_90d,0) as units_90d,
  coalesce(ss.units_all,0) as units_all,
  ss.last_sale_at,
  coalesce(st.physical_quantity,0) as company_quantity,
  p.min_stock,
  p.ideal_stock,
  case
    when p.restricted
      or upper(coalesce(p.sales_category,''))='Z'
      then 'Especial/restrito: permanece Z'
    when coalesce(ss.units_30d,0)>=2
      then 'Alto giro: 2 ou mais unidades nos últimos 30 dias'
    when coalesce(ss.units_90d,0)>=5
      then 'Alto giro: 5 ou mais unidades nos últimos 90 dias'
    when coalesce(ss.units_90d,0)>=2
      then 'Giro regular: 2 ou mais unidades nos últimos 90 dias'
    when coalesce(ss.units_all,0)>=4
      and ss.last_sale_at>=now()-interval '180 days'
      then 'Histórico relevante com venda nos últimos 180 dias'
    else 'Baixo giro recente: tratar como sob encomenda'
  end as classification_reason,
  case
    when p.restricted
      or upper(coalesce(p.sales_category,''))='Z'
      then 'Sem alerta automático'
    when coalesce(ss.units_30d,0)>=2
      or coalesce(ss.units_90d,0)>=5
      then 'Alertar quando restar 1 unidade'
    when coalesce(ss.units_90d,0)>=2
      or (
        coalesce(ss.units_all,0)>=4
        and ss.last_sale_at>=now()-interval '180 days'
      )
      then 'Alertar somente quando zerar'
    else 'Sob encomenda: zero sem urgência'
  end as stock_policy
from public.products p
left join sales_stats ss on ss.product_id=p.id
left join stock st on st.product_id=p.id
where p.active
  and coalesce(p.brand,'')<>'Combo'
  and upper(p.name) not like 'COMBO %';

grant select on public.product_sales_category_intelligence
to authenticated, service_role;

create or replace function public.refresh_product_sales_categories()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_changed integer:=0;
  v_a integer:=0;
  v_b integer:=0;
  v_c integer:=0;
  v_z integer:=0;
begin
  if not public.can_write() then
    raise exception
      'Usuário sem permissão para atualizar categorias de giro';
  end if;

  update public.products
  set
    sales_category='Z',
    min_stock=0,
    ideal_stock=0,
    updated_at=now()
  where active
    and restricted
    and (
      upper(coalesce(sales_category,''))<>'Z'
      or min_stock<>0
      or ideal_stock<>0
    );

  with intelligence as (
    select *
    from public.product_sales_category_intelligence
  ),
  updated as (
    update public.products p
    set
      sales_category=i.suggested_category,
      min_stock=case
        when i.suggested_category='A'
          then greatest(coalesce(p.min_stock,0),1)
        when i.suggested_category in ('B','C')
          then 0
        else p.min_stock
      end,
      ideal_stock=case
        when i.suggested_category='A'
          then greatest(
            coalesce(p.ideal_stock,0),
            greatest(coalesce(p.min_stock,0),1)+1,
            2
          )
        when i.suggested_category='B'
          then 1
        when i.suggested_category='C'
          then 0
        else p.ideal_stock
      end,
      updated_at=now()
    from intelligence i
    where p.id=i.product_id
      and not p.restricted
      and upper(coalesce(p.sales_category,''))<>'Z'
      and (
        upper(coalesce(p.sales_category,'C'))
          is distinct from i.suggested_category
        or p.min_stock is distinct from
          case
            when i.suggested_category='A'
              then greatest(coalesce(p.min_stock,0),1)
            when i.suggested_category in ('B','C')
              then 0
            else p.min_stock
          end
        or p.ideal_stock is distinct from
          case
            when i.suggested_category='A'
              then greatest(
                coalesce(p.ideal_stock,0),
                greatest(coalesce(p.min_stock,0),1)+1,
                2
              )
            when i.suggested_category='B'
              then 1
            when i.suggested_category='C'
              then 0
            else p.ideal_stock
          end
      )
    returning p.id
  )
  select count(*)
  into v_changed
  from updated;

  select
    count(*) filter(
      where upper(coalesce(sales_category,''))='A'
    ),
    count(*) filter(
      where upper(coalesce(sales_category,''))='B'
    ),
    count(*) filter(
      where upper(coalesce(sales_category,''))='C'
    ),
    count(*) filter(
      where upper(coalesce(sales_category,''))='Z'
    )
  into v_a,v_b,v_c,v_z
  from public.products
  where active
    and coalesce(brand,'')<>'Combo'
    and upper(name) not like 'COMBO %';

  return jsonb_build_object(
    'updated',v_changed,
    'A',v_a,
    'B',v_b,
    'C',v_c,
    'Z',v_z,
    'refreshed_at',now()
  );
end;
$$;

grant execute on function
  public.refresh_product_sales_categories()
to authenticated, service_role;

-- Alertas oficiais por curva:
-- A: alerta quando disponível <=1
-- B: alerta apenas quando zerar
-- C/Z: sem alerta automático

create or replace view public.inventory_control_overview
with (security_invoker = true)
as
with physical as (
  select
    sb.product_id,
    coalesce(sum(sb.quantity),0)::integer as physical_quantity
  from public.stock_balances sb
  join public.locations l on l.id=sb.location_id
  where l.active and l.tracks_inventory
  group by sb.product_id
),
reserved as (
  select
    sr.product_id,
    coalesce(sum(sr.quantity_reserved),0)::integer
      as reserved_quantity
  from public.stock_reservations sr
  where sr.status = any(
    array['reserved'::text,'partial'::text]
  )
  group by sr.product_id
),
incoming as (
  select
    poi.product_id,
    coalesce(sum(
      greatest(
        poi.quantity_ordered-poi.quantity_received,
        0
      )
    ),0)::integer as incoming_quantity
  from public.purchase_order_items poi
  join public.purchase_orders po
    on po.id=poi.purchase_order_id
  where po.status = any(
    array['pending'::text,'partial'::text]
  )
    and poi.quantity_received < poi.quantity_ordered
  group by poi.product_id
)
select
  p.id as product_id,
  p.name as product_name,
  p.category,
  p.brand,
  p.image_url,
  p.min_stock,
  p.ideal_stock,
  p.cost_price,
  p.sale_price,
  coalesce(ph.physical_quantity,0) as physical_quantity,
  coalesce(r.reserved_quantity,0) as reserved_quantity,
  greatest(
    coalesce(ph.physical_quantity,0)
      -coalesce(r.reserved_quantity,0),
    0
  ) as available_quantity,
  coalesce(i.incoming_quantity,0) as incoming_quantity,
  (
    coalesce(ph.physical_quantity,0)::numeric*p.cost_price
  )::numeric(12,2) as stock_cost_value,
  (
    coalesce(ph.physical_quantity,0)::numeric*p.sale_price
  )::numeric(12,2) as stock_sale_value,
  case
    when upper(coalesce(p.sales_category,'')) in ('C','Z')
      then 'healthy'::text
    when upper(coalesce(p.sales_category,''))='B'
      then case
        when coalesce(ph.physical_quantity,0)=0
          and coalesce(i.incoming_quantity,0)>0
          then 'incoming_only'::text
        when coalesce(ph.physical_quantity,0)=0
          then 'out_of_stock'::text
        when greatest(
          coalesce(ph.physical_quantity,0)
            -coalesce(r.reserved_quantity,0),
          0
        )=0
          and coalesce(r.reserved_quantity,0)>0
          then 'fully_reserved'::text
        else 'healthy'::text
      end
    when upper(coalesce(p.sales_category,''))='A'
      then case
        when coalesce(ph.physical_quantity,0)=0
          and coalesce(i.incoming_quantity,0)>0
          then 'incoming_only'::text
        when coalesce(ph.physical_quantity,0)=0
          then 'out_of_stock'::text
        when greatest(
          coalesce(ph.physical_quantity,0)
            -coalesce(r.reserved_quantity,0),
          0
        )=0
          and coalesce(r.reserved_quantity,0)>0
          then 'fully_reserved'::text
        when greatest(
          coalesce(ph.physical_quantity,0)
            -coalesce(r.reserved_quantity,0),
          0
        )<=1
          then 'below_minimum'::text
        else 'healthy'::text
      end
    else 'healthy'::text
  end as stock_status
from public.products p
left join physical ph on ph.product_id=p.id
left join reserved r on r.product_id=p.id
left join incoming i on i.product_id=p.id
where p.active;

grant select on public.inventory_control_overview
to authenticated, service_role;

create or replace view public.replenishment_overview
with (security_invoker = true)
as
with company_stock as (
  select
    sb.product_id,
    coalesce(sum(sb.quantity),0)::integer as company_quantity
  from public.stock_balances sb
  join public.locations l on l.id=sb.location_id
  where l.active
    and l.tracks_inventory
    and l.counts_for_replenishment
  group by sb.product_id
)
select
  p.id as product_id,
  p.name as product_name,
  p.category,
  coalesce(cs.company_quantity,0) as company_quantity,
  p.min_stock,
  p.ideal_stock,
  case
    when upper(coalesce(p.sales_category,'')) in ('C','Z')
      then false
    when upper(coalesce(p.sales_category,''))='B'
      then coalesce(cs.company_quantity,0)<=0
    when upper(coalesce(p.sales_category,''))='A'
      then coalesce(cs.company_quantity,0)<=1
    else false
  end as needs_replenishment,
  case
    when upper(coalesce(p.sales_category,'')) in ('C','Z')
      then 0
    when upper(coalesce(p.sales_category,''))='B'
      and coalesce(cs.company_quantity,0)<=0
      then greatest(
        greatest(coalesce(nullif(p.ideal_stock,0),1),1)
          -coalesce(cs.company_quantity,0),
        0
      )
    when upper(coalesce(p.sales_category,''))='A'
      and coalesce(cs.company_quantity,0)<=1
      then greatest(
        greatest(coalesce(nullif(p.ideal_stock,0),2),2)
          -coalesce(cs.company_quantity,0),
        0
      )
    else 0
  end as suggested_order_quantity,
  case
    when upper(coalesce(p.sales_category,'')) in ('C','Z')
      then 'healthy'::text
    when upper(coalesce(p.sales_category,''))='B'
      then case
        when coalesce(cs.company_quantity,0)<=0
          then 'out_of_stock'::text
        else 'healthy'::text
      end
    when upper(coalesce(p.sales_category,''))='A'
      then case
        when coalesce(cs.company_quantity,0)<=0
          then 'out_of_stock'::text
        when coalesce(cs.company_quantity,0)<=1
          then 'below_minimum'::text
        else 'healthy'::text
      end
    else 'healthy'::text
  end as stock_status
from public.products p
left join company_stock cs on cs.product_id=p.id
where p.active;

grant select on public.replenishment_overview
to authenticated, service_role;

commit;
