create or replace function public.bank_get_operation_receivables()
returns table(
  operation text,operation_label text,sale_id uuid,customer_name text,product_summary text,
  amount numeric,profit numeric,due_date date,quoted_on date,payment_status text,delivery_status text,href text
)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.can_access_bank() then raise exception 'Usuário sem acesso à Candinho Bank'; end if;
  return query
  select * from (
    select
      'supplements'::text,
      'Candinho Suplementos'::text,
      s.id,
      c.name::text,
      (coalesce(items.product_summary,'Venda sem itens')||case when r.installment_id is not null then ' · Parcela '||r.installment_no::text||'/'||r.installment_count::text else '' end)::text,
      r.amount::numeric(14,2),
      case when s.total_amount>0 then round((s.total_profit*r.amount/s.total_amount)::numeric,2) else 0 end::numeric(14,2),
      r.due_date,
      s.quoted_at::date,
      s.payment_status::text,
      s.delivery_status::text,
      ('/vendas/'||s.id::text)::text
    from public.supplement_sale_receivable_schedule r
    join public.sales s on s.id=r.sale_id
    join public.customers c on c.id=s.customer_id
    left join lateral (
      select string_agg(p.name||' ×'||si.quantity::text,' · ' order by p.name,si.id) as product_summary
      from public.sale_items si join public.products p on p.id=si.product_id where si.sale_id=s.id
    ) items on true
    where coalesce(c.name,'') not in('Igor Candinho','Brinde')

    union all

    select
      'fitness'::text,
      'Candinho Fitness'::text,
      s.id,
      s.customer_name::text,
      coalesce(items.product_summary,'Venda sem itens')::text,
      s.total_amount::numeric(14,2),
      s.total_profit::numeric(14,2),
      coalesce(s.payment_due_on,s.quoted_on)::date,
      s.quoted_on::date,
      s.payment_status::text,
      s.delivery_status::text,
      ('/fitness/vendas/'||s.id::text)::text
    from public.fitness_sales s
    left join lateral (
      select string_agg(
        fp.name
        ||case when fv.size is not null and btrim(fv.size)<>'' then ' '||fv.size else '' end
        ||case when fv.color is not null and btrim(fv.color)<>'' then ' · '||fv.color else '' end
        ||' ×'||si.quantity::text,
        ' · ' order by fp.name,fv.size,fv.color,si.id
      ) as product_summary
      from public.fitness_sale_items si
      join public.fitness_variants fv on fv.id=si.variant_id
      join public.fitness_products fp on fp.id=fv.product_id
      where si.sale_id=s.id
    ) items on true
    where s.general_status<>'cancelled' and s.payment_status='receivable'
  ) receivables
  order by due_date asc nulls last,quoted_on asc,customer_name asc;
end;
$$;

revoke all on function public.bank_get_operation_receivables() from public,anon;
grant execute on function public.bank_get_operation_receivables() to authenticated;

do $$
begin
  if to_regprocedure('public.bank_get_annual_projection_legacy_base(date,integer)') is null then
    alter function public.bank_get_annual_projection(date,integer) rename to bank_get_annual_projection_legacy_base;
  end if;
end;
$$;

create or replace function public.bank_get_annual_projection(p_start_month date default null,p_months integer default 12)
returns table(
  reference_month date,card_invoices numeric,card_subscription_estimate numeric,direct_charges numeric,debt_payments numeric,
  direct_subscriptions numeric,total_commitments numeric,receivables numeric,recurring_income_estimate numeric,
  operation_receivables numeric,supplements_profit_projection numeric,total_expected_income numeric,projected_result numeric
)
language sql stable security definer set search_path=public as $$
with base as (
  select * from public.bank_get_annual_projection_legacy_base(p_start_month,p_months)
), context as (
  select date_trunc('month',now() at time zone 'America/Sao_Paulo')::date as current_month
), operation_source as (
  select case when r.due_date<ctx.current_month then ctx.current_month else date_trunc('month',r.due_date::timestamp)::date end as reference_month,
         r.amount::numeric as amount
  from public.supplement_sale_receivable_schedule r
  join public.sales s on s.id=r.sale_id
  left join public.customers c on c.id=s.customer_id
  cross join context ctx
  where coalesce(c.name,'') not in('Igor Candinho','Brinde')
  union all
  select case when coalesce(s.payment_due_on,s.quoted_on)<ctx.current_month then ctx.current_month else date_trunc('month',coalesce(s.payment_due_on,s.quoted_on)::timestamp)::date end,
         s.total_amount::numeric
  from public.fitness_sales s cross join context ctx
  where s.general_status<>'cancelled' and s.payment_status='receivable'
), corrected as (
  select reference_month,coalesce(sum(amount),0)::numeric(14,2) as amount
  from operation_source group by reference_month
)
select b.reference_month,b.card_invoices,b.card_subscription_estimate,b.direct_charges,b.debt_payments,b.direct_subscriptions,b.total_commitments,
       b.receivables,b.recurring_income_estimate,coalesce(c.amount,0)::numeric(14,2),b.supplements_profit_projection,
       (b.total_expected_income-b.operation_receivables+coalesce(c.amount,0))::numeric(14,2),
       (b.projected_result-b.operation_receivables+coalesce(c.amount,0))::numeric(14,2)
from base b left join corrected c using(reference_month)
order by b.reference_month;
$$;

revoke all on function public.bank_get_annual_projection_legacy_base(date,integer) from public,anon,authenticated;
revoke all on function public.bank_get_annual_projection(date,integer) from public,anon;
grant execute on function public.bank_get_annual_projection(date,integer) to authenticated;

do $$
begin
  if to_regprocedure('public.bank_get_company_patrimony_legacy_base()') is null then
    alter function public.bank_get_company_patrimony() rename to bank_get_company_patrimony_legacy_base;
  end if;
end;
$$;

create or replace function public.bank_get_company_patrimony()
returns table(
  total_cash_balance numeric,company_cash_balance numeric,supplements_stock_cost numeric,supplements_stock_sale_value numeric,
  fitness_stock_cost numeric,fitness_stock_sale_value numeric,total_inventory_cost numeric,bank_receivables numeric,
  operation_receivables numeric,total_receivables numeric,company_debt_remaining numeric,total_debt_remaining numeric,
  operational_net_position numeric,total_net_position numeric
)
language sql stable security definer set search_path=public as $$
with base as (select * from public.bank_get_company_patrimony_legacy_base()), corrected as (
  select (
    coalesce((select sum(r.amount) from public.supplement_sale_receivable_schedule r join public.sales s on s.id=r.sale_id left join public.customers c on c.id=s.customer_id where coalesce(c.name,'') not in('Igor Candinho','Brinde')),0)
    +coalesce((select sum(total_amount) from public.fitness_sales where general_status<>'cancelled' and payment_status='receivable'),0)
  )::numeric(14,2) as amount
)
select b.total_cash_balance,b.company_cash_balance,b.supplements_stock_cost,b.supplements_stock_sale_value,b.fitness_stock_cost,b.fitness_stock_sale_value,
       b.total_inventory_cost,b.bank_receivables,c.amount,(b.bank_receivables+c.amount)::numeric(14,2),b.company_debt_remaining,b.total_debt_remaining,
       (b.operational_net_position-b.operation_receivables+c.amount)::numeric(14,2),
       (b.total_net_position-b.operation_receivables+c.amount)::numeric(14,2)
from base b cross join corrected c;
$$;

revoke all on function public.bank_get_company_patrimony_legacy_base() from public,anon,authenticated;
revoke all on function public.bank_get_company_patrimony() from public,anon;
grant execute on function public.bank_get_company_patrimony() to authenticated;

do $$
begin
  if to_regprocedure('public.bank_close_month_legacy_base(date,text)') is null then
    alter function public.bank_close_month(date,text) rename to bank_close_month_legacy_base;
  end if;
end;
$$;

create or replace function public.bank_close_month(p_reference_month date,p_notes text)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_id uuid;v_month_start date;v_month_end date;v_old numeric(14,2);v_corrected numeric(14,2);
begin
  v_id:=public.bank_close_month_legacy_base(p_reference_month,p_notes);
  v_month_start:=date_trunc('month',coalesce(p_reference_month,(now() at time zone 'America/Sao_Paulo')::date)::timestamp)::date;
  v_month_end:=(v_month_start+interval '1 month - 1 day')::date;
  select operation_receivables into v_old from public.bank_month_closures where id=v_id;
  select (
    coalesce((select sum(r.amount) from public.supplement_sale_receivable_schedule r join public.sales s on s.id=r.sale_id left join public.customers c on c.id=s.customer_id where r.due_date<=v_month_end and coalesce(c.name,'') not in('Igor Candinho','Brinde')),0)
    +coalesce((select sum(total_amount) from public.fitness_sales where general_status<>'cancelled' and payment_status='receivable' and coalesce(payment_due_on,quoted_on)<=v_month_end),0)
  )::numeric(14,2) into v_corrected;
  update public.bank_month_closures
  set operation_receivables=v_corrected,
      operational_net_position=(operational_net_position-coalesce(v_old,0)+v_corrected)::numeric(14,2),
      total_net_position=(total_net_position-coalesce(v_old,0)+v_corrected)::numeric(14,2)
  where id=v_id;
  return v_id;
end;
$$;

revoke all on function public.bank_close_month_legacy_base(date,text) from public,anon,authenticated;
revoke all on function public.bank_close_month(date,text) from public,anon;
grant execute on function public.bank_close_month(date,text) to authenticated;

create or replace view public.commercial_dashboard_summary as
with commercial as (
  select cs.*,ps.received_amount,ps.outstanding_amount,ps.payment_state
  from public.commercial_sales cs join public.sale_payment_summary ps on ps.sale_id=cs.id
), period_bounds as (
  select date_trunc('month',now() at time zone 'America/Sao_Paulo')::date as current_month_start,
         (date_trunc('month',now() at time zone 'America/Sao_Paulo')+interval '1 month')::date as next_month_start,
         (date_trunc('month',now() at time zone 'America/Sao_Paulo')-interval '1 month')::date as previous_month_start
), stock as (
  select coalesce(sum(sb.quantity) filter (where p.active),0)::bigint as operational_units,
         coalesce(sum(sb.quantity),0)::bigint as all_units,
         coalesce(sum(sb.quantity::numeric*p.cost_price) filter (where p.active),0)::numeric(12,2) as stock_cost_value,
         coalesce(sum(sb.quantity::numeric*p.sale_price) filter (where p.active),0)::numeric(12,2) as stock_sale_value
  from public.stock_balances sb join public.products p on p.id=sb.product_id join public.locations l on l.id=sb.location_id
  where l.active and l.tracks_inventory
)
select count(*)::integer as total_sales,
       coalesce(sum(commercial.total_amount),0)::numeric(12,2) as total_revenue,
       coalesce(sum(commercial.total_profit),0)::numeric(12,2) as total_profit,
       coalesce(sum(commercial.outstanding_amount) filter (where commercial.outstanding_amount>0),0)::numeric(12,2) as receivable_total,
       count(*) filter (where commercial.outstanding_amount>0)::integer as receivable_sales,
       count(*) filter (where commercial.delivered_at::date>=b.current_month_start and commercial.delivered_at::date<b.next_month_start)::integer as current_month_sales,
       coalesce(sum(commercial.total_amount) filter (where commercial.delivered_at::date>=b.current_month_start and commercial.delivered_at::date<b.next_month_start),0)::numeric(12,2) as current_month_revenue,
       coalesce(sum(commercial.total_profit) filter (where commercial.delivered_at::date>=b.current_month_start and commercial.delivered_at::date<b.next_month_start),0)::numeric(12,2) as current_month_profit,
       count(*) filter (where commercial.delivered_at::date>=b.previous_month_start and commercial.delivered_at::date<b.current_month_start)::integer as previous_month_sales,
       coalesce(sum(commercial.total_amount) filter (where commercial.delivered_at::date>=b.previous_month_start and commercial.delivered_at::date<b.current_month_start),0)::numeric(12,2) as previous_month_revenue,
       coalesce(sum(commercial.total_profit) filter (where commercial.delivered_at::date>=b.previous_month_start and commercial.delivered_at::date<b.current_month_start),0)::numeric(12,2) as previous_month_profit,
       st.operational_units,st.all_units,st.stock_cost_value,st.stock_sale_value,(st.stock_sale_value-st.stock_cost_value)::numeric(12,2) as stock_potential_profit
from commercial cross join period_bounds b cross join stock st
 group by b.current_month_start,b.next_month_start,b.previous_month_start,st.operational_units,st.all_units,st.stock_cost_value,st.stock_sale_value;

create or replace view public.pending_orders as
select s.id,s.customer_id,c.name as customer_name,s.location_id,l.code as location_code,coalesce(s.delivered_at,s.quoted_at) as business_at,
       (coalesce(s.delivered_at,s.quoted_at) at time zone 'UTC')::date as business_date,s.quoted_at as order_at,s.delivered_at,s.payment_status,s.delivery_status,
       s.payment_method,s.payment_condition,s.total_amount,s.total_profit,items.product_summary,items.total_items,l.name as location_name,s.paid_at,s.general_status,
       items.primary_product_id,items.primary_image_url,coalesce(ps.next_payment_due_at,s.payment_due_at) as payment_due_at,s.price_condition,s.partner_id,pr.name as partner_name,
       coalesce(res.reservation_status,case when s.stock_deducted then 'fulfilled' else null end) as reservation_status,
       ps.received_amount,ps.outstanding_amount,ps.payment_state,ps.next_payment_due_at,ps.installment_count
from public.sales s
left join public.customers c on c.id=s.customer_id
join public.locations l on l.id=s.location_id
left join public.partners pr on pr.id=s.partner_id
join public.sale_payment_summary ps on ps.sale_id=s.id
left join lateral (
  select string_agg(p.name||' ×'||si.quantity::text,', ' order by p.name) as product_summary,
         coalesce(sum(si.quantity),0)::integer as total_items,
         (array_agg(p.id order by si.id))[1] as primary_product_id,
         (array_agg(p.image_url order by si.id) filter (where p.image_url is not null))[1] as primary_image_url
  from public.sale_items si join public.products p on p.id=si.product_id where si.sale_id=s.id
) items on true
left join lateral (
  select case when bool_and(sr.status='fulfilled') then 'fulfilled' when bool_or(sr.status='awaiting_stock') then 'awaiting_stock'
              when bool_or(sr.status='partial') then 'partial' when bool_and(sr.status='reserved') then 'reserved' else null end as reservation_status
  from public.stock_reservations sr where sr.sale_id=s.id
) res on true
where s.record_type='sale' and s.general_status<>'cancelled' and (ps.outstanding_amount>0.005 or s.delivery_status='to_deliver');

create or replace view public.dashboard_operational_summary as
with brazil_today as (select (now() at time zone 'America/Sao_Paulo')::date as today),
pending as (
  select count(*)::integer as pending_orders_count,
         count(*) filter (where po.delivery_status='to_deliver')::integer as pending_delivery_count,
         count(*) filter (where po.outstanding_amount>0.005)::integer as pending_payment_count
  from public.pending_orders po
), payment_due as (
  select count(*) filter (where r.due_date<(select today from brazil_today))::integer as overdue_payment_count,
         coalesce(sum(r.amount) filter (where r.due_date<(select today from brazil_today)),0)::numeric(12,2) as overdue_payment_total,
         count(*) filter (where r.due_date=(select today from brazil_today))::integer as payment_due_today_count,
         coalesce(sum(r.amount) filter (where r.due_date=(select today from brazil_today)),0)::numeric(12,2) as payment_due_today_total
  from public.supplement_sale_receivable_schedule r
), leads as (
  select count(*) filter (where general_status='pending')::integer as open_leads_count,
         count(*) filter (where general_status='pending' and lead_date<=(select today from brazil_today)-7)::integer as stale_leads_count
  from public.leads_history
), suppliers as (
  select count(*) filter (where status=any(array['pending','partial']))::integer as supplier_orders_open_count,
         coalesce(sum(pending_units) filter (where status=any(array['pending','partial'])),0)::integer as incoming_units
  from public.supplier_order_summary
), inventory as (
  select count(*) filter (where stock_status<>'healthy')::integer as stock_attention_products,
         count(*) filter (where stock_status='out_of_stock')::integer as out_of_stock_products,
         coalesce(sum(physical_quantity),0)::integer as physical_units,
         coalesce(sum(reserved_quantity),0)::integer as reserved_units,
         coalesce(sum(available_quantity),0)::integer as available_units
  from public.inventory_control_overview
)
select bt.today,p.pending_orders_count,p.pending_delivery_count,p.pending_payment_count,pd.overdue_payment_count,pd.overdue_payment_total,pd.payment_due_today_count,pd.payment_due_today_total,
       l.open_leads_count,l.stale_leads_count,s.supplier_orders_open_count,s.incoming_units,i.stock_attention_products,i.out_of_stock_products,i.physical_units,i.reserved_units,i.available_units,
       cds.current_month_sales,cds.current_month_revenue,cds.current_month_profit,cds.previous_month_sales,cds.previous_month_revenue,cds.previous_month_profit,
       cds.receivable_total,cds.stock_cost_value,cds.stock_sale_value,cds.stock_potential_profit
from brazil_today bt cross join pending p cross join payment_due pd cross join leads l cross join suppliers s cross join inventory i cross join public.commercial_dashboard_summary cds;

create or replace view public.dashboard_priority_items as
with brazil_today as (select (now() at time zone 'America/Sao_Paulo')::date as today), payment_rows as (
  select r.*,s.customer_id,coalesce(c.name,s.reference,'Cliente') as customer_name,items.primary_product_id,items.product_summary,items.total_items
  from public.supplement_sale_receivable_schedule r
  join public.sales s on s.id=r.sale_id
  left join public.customers c on c.id=s.customer_id
  left join lateral (
    select (array_agg(p.id order by si.id))[1] as primary_product_id,
           string_agg(p.name||' ×'||si.quantity::text,', ' order by p.name) as product_summary,
           coalesce(sum(si.quantity),0)::integer as total_items
    from public.sale_items si join public.products p on p.id=si.product_id where si.sale_id=s.id
  ) items on true
)
select 'delivery'::text as item_type,1 as priority_rank,po.id as entity_id,po.customer_id,po.primary_product_id as product_id,po.customer_name as title,
       coalesce(po.product_summary,'Pedido sem produto informado') as subtitle,po.business_date as reference_date,po.total_amount as amount,po.total_items as quantity,'/vendas/'||po.id::text as href
from public.pending_orders po where po.delivery_status='to_deliver'
union all
select 'payment'::text,
       case when pr.due_date<(select today from brazil_today) then 1 when pr.due_date<=(select today from brazil_today)+3 then 2 else 3 end,
       coalesce(pr.installment_id,pr.sale_id),pr.customer_id,pr.primary_product_id,pr.customer_name,
       (coalesce(pr.product_summary,'Pagamento pendente')||case when pr.installment_id is not null then ' · Parcela '||pr.installment_no::text||'/'||pr.installment_count::text else '' end),
       pr.due_date,pr.amount,pr.total_items,'/vendas/'||pr.sale_id::text
from payment_rows pr
union all
select 'lead'::text,
       case when lh.lead_date<=(select today from brazil_today)-30 then 1 when lh.lead_date<=(select today from brazil_today)-14 then 2 else 3 end,
       lh.id,lh.customer_id,lh.primary_product_id,lh.customer_name,coalesce(lh.product_summary,lh.lead_status,'Lead aguardando retorno'),lh.lead_date,null::numeric(12,2),lh.total_items,'/leads/'||lh.id::text
from public.leads_history lh where lh.general_status='pending' and lh.lead_date<=(select today from brazil_today)-7
union all
select 'supplier'::text,case when sos.waiting_sales_count>0 then 1 else 2 end,sos.id,null::uuid,null::uuid,sos.supplier_name,
       coalesce(sos.product_summary,'Pedido de fornecedor pendente'),sos.ordered_on,sos.order_total,sos.pending_units,'/pedidos-fornecedor/'||sos.id::text
from public.supplier_order_summary sos where sos.status=any(array['pending','partial'])
union all
select 'stock'::text,
       case when ico.stock_status=any(array['out_of_stock','fully_reserved']) then 1 when ico.stock_status=any(array['below_minimum','incoming_only']) then 2 else 3 end,
       ico.product_id,null::uuid,ico.product_id,ico.product_name,
       case ico.stock_status when 'out_of_stock' then 'Sem estoque disponível' when 'fully_reserved' then 'Todo o estoque está reservado'
            when 'below_minimum' then 'Abaixo do estoque mínimo' when 'incoming_only' then 'Sem saldo físico, mas com pedido a caminho' else 'Estoque precisa de atenção' end,
       (select today from brazil_today),null::numeric(12,2),ico.available_quantity,'/estoque/'||ico.product_id::text
from public.inventory_control_overview ico where ico.stock_status=any(array['out_of_stock','fully_reserved','below_minimum','incoming_only']);
