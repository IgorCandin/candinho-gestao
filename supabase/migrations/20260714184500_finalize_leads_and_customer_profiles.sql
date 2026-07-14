create or replace function public.create_customer(p_name text,p_phone text default null,p_city text default null,p_reference text default null,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_name text:=nullif(btrim(p_name),''); begin
if not public.can_write() then raise exception 'Usuário sem permissão para cadastrar clientes'; end if;
if v_name is null then raise exception 'Informe o nome do cliente'; end if;
insert into public.customers(name,phone,city,reference,notes,active) values(v_name,nullif(btrim(p_phone),''),nullif(btrim(p_city),''),nullif(btrim(p_reference),''),nullif(btrim(p_notes),''),true) returning id into v_id;
insert into public.audit_events(entity_type,entity_id,action,details) values('customer',v_id,'created',jsonb_build_object('name',v_name)); return v_id; end; $$;

create or replace function public.create_lead(p_customer_id uuid,p_product_id uuid,p_lead_status text,p_notes text default null,p_lead_on date default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_location uuid;v_customer public.customers%rowtype;v_product public.products%rowtype;v_date date:=coalesce(p_lead_on,(now() at time zone 'America/Sao_Paulo')::date);v_at timestamptz;v_allowed constant text[]:=array['Perguntou sobre','Decidindo','Está quase comprando','Esperando receber','Esperando pedido de fornecedor','Cotação','Aguardando']; begin
if not public.can_write() then raise exception 'Usuário sem permissão para cadastrar leads'; end if;
if p_lead_status is null or not(p_lead_status=any(v_allowed)) then raise exception 'Status do lead inválido'; end if;
select * into v_customer from public.customers where id=p_customer_id and active; if not found then raise exception 'Cliente não encontrado ou inativo'; end if;
select * into v_product from public.products where id=p_product_id and active; if not found then raise exception 'Produto não encontrado ou inativo'; end if;
select id into v_location from public.locations where code='CS' and active limit 1; if v_location is null then raise exception 'Estoque central CS não encontrado'; end if;
v_at:=(v_date::timestamp+interval '12 hours') at time zone 'America/Sao_Paulo';
insert into public.sales(record_type,customer_id,location_id,reference,city,phone,general_status,payment_status,delivery_status,lead_status,quoted_at,notes,stock_deducted,total_cost,total_amount,total_profit,idempotency_key)
values('lead',v_customer.id,v_location,v_customer.reference,v_customer.city,v_customer.phone,'pending','not_applicable','not_applicable',p_lead_status,v_at,nullif(btrim(p_notes),''),false,0,0,0,'app:create-lead:'||gen_random_uuid()::text) returning id into v_id;
insert into public.sale_items(sale_id,product_id,quantity,unit_cost,unit_price) values(v_id,v_product.id,1,0,0);
insert into public.audit_events(entity_type,entity_id,action,details) values('lead',v_id,'created',jsonb_build_object('customer_id',v_customer.id,'product_id',v_product.id,'lead_status',p_lead_status,'lead_on',v_date)); return v_id; end; $$;

revoke all on function public.create_customer(text,text,text,text,text) from public,anon;
revoke all on function public.create_lead(uuid,uuid,text,text,date) from public,anon;
grant execute on function public.create_customer(text,text,text,text,text) to authenticated,service_role;
grant execute on function public.create_lead(uuid,uuid,text,text,date) to authenticated,service_role;

create or replace view public.leads_history with(security_invoker=true) as
select s.id,s.customer_id,c.name customer_name,s.location_id,l.code location_code,l.name location_name,s.quoted_at lead_at,(s.quoted_at at time zone 'UTC')::date lead_date,date_trunc('month',s.quoted_at at time zone 'UTC')::date lead_month,s.lead_status,s.general_status,s.reference,s.city,s.phone,s.notes,items.product_summary,items.total_items,items.primary_product_id,items.primary_image_url
from public.sales s left join public.customers c on c.id=s.customer_id join public.locations l on l.id=s.location_id left join lateral(
select string_agg(p.name||' ×'||si.quantity::text,', ' order by p.name) product_summary,coalesce(sum(si.quantity),0)::integer total_items,(array_agg(p.id order by si.id))[1] primary_product_id,(array_agg(p.image_url order by si.id) filter(where p.image_url is not null))[1] primary_image_url from public.sale_items si join public.products p on p.id=si.product_id where si.sale_id=s.id)items on true where s.record_type='lead';

create or replace view public.customer_details with(security_invoker=true) as
select c.id,c.name,c.phone,c.city,c.reference,c.email,c.notes,c.sensitive_to_caffeine,c.anxiety_or_insomnia,c.prohibited_products,c.approach_preferences,c.active,
count(s.id) filter(where s.record_type='sale' and s.general_status<>'cancelled')::integer purchase_count,
coalesce(sum(s.total_amount) filter(where s.record_type='sale' and s.general_status<>'cancelled'),0)::numeric(12,2) total_spent,
max(coalesce(s.delivered_at,s.quoted_at)) filter(where s.record_type='sale' and s.general_status<>'cancelled') last_purchase_at,
count(s.id) filter(where s.record_type='lead')::integer lead_count,
count(s.id) filter(where s.record_type='sale' and s.general_status<>'cancelled' and(s.payment_status='receivable' or s.delivery_status='to_deliver'))::integer pending_sales_count
from public.customers c left join public.sales s on s.customer_id=c.id group by c.id;
revoke all on public.leads_history from public,anon;revoke all on public.customer_details from public,anon;grant select on public.leads_history to authenticated,service_role;grant select on public.customer_details to authenticated,service_role;
