create or replace function public.save_fitness_customer(p_customer_id uuid,p_name text,p_phone text default null,p_instagram text default null,p_city text default null,p_source text default null,p_notes text default null,p_active boolean default true)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if not public.can_write_fitness() then raise exception 'Usuário sem permissão para alterar clientes Fitness'; end if;
 if nullif(btrim(p_name),'') is null then raise exception 'Informe o nome do cliente'; end if;
 if p_customer_id is null then insert into public.fitness_customers(name,phone,instagram,city,source,notes,active) values(btrim(p_name),nullif(btrim(p_phone),''),nullif(btrim(p_instagram),''),nullif(btrim(p_city),''),nullif(btrim(p_source),''),nullif(btrim(p_notes),''),coalesce(p_active,true)) returning id into v_id;
 else update public.fitness_customers set name=btrim(p_name),phone=nullif(btrim(p_phone),''),instagram=nullif(btrim(p_instagram),''),city=nullif(btrim(p_city),''),source=nullif(btrim(p_source),''),notes=nullif(btrim(p_notes),''),active=coalesce(p_active,true) where id=p_customer_id returning id into v_id;if v_id is null then raise exception 'Cliente Fitness não encontrado';end if;end if;
 return v_id;
end;$$;

create or replace function public.save_fitness_supplier(p_supplier_id uuid,p_name text,p_contact_name text default null,p_phone text default null,p_email text default null,p_website text default null,p_image_url text default null,p_notes text default null,p_active boolean default true)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if not public.can_write_fitness() then raise exception 'Usuário sem permissão para alterar fornecedores Fitness';end if;
 if nullif(btrim(p_name),'') is null then raise exception 'Informe o fornecedor';end if;
 if p_supplier_id is null then select id into v_id from public.fitness_suppliers where lower(name)=lower(btrim(p_name)) limit 1;if v_id is null then insert into public.fitness_suppliers(name,contact_name,phone,email,website,image_url,notes,active) values(btrim(p_name),nullif(btrim(p_contact_name),''),nullif(btrim(p_phone),''),nullif(btrim(p_email),''),nullif(btrim(p_website),''),nullif(btrim(p_image_url),''),nullif(btrim(p_notes),''),coalesce(p_active,true)) returning id into v_id;else update public.fitness_suppliers set contact_name=coalesce(nullif(btrim(p_contact_name),''),contact_name),phone=coalesce(nullif(btrim(p_phone),''),phone),email=coalesce(nullif(btrim(p_email),''),email),website=coalesce(nullif(btrim(p_website),''),website),image_url=coalesce(nullif(btrim(p_image_url),''),image_url),notes=coalesce(nullif(btrim(p_notes),''),notes),active=coalesce(p_active,true) where id=v_id;end if;
 else update public.fitness_suppliers set name=btrim(p_name),contact_name=nullif(btrim(p_contact_name),''),phone=nullif(btrim(p_phone),''),email=nullif(btrim(p_email),''),website=nullif(btrim(p_website),''),image_url=nullif(btrim(p_image_url),''),notes=nullif(btrim(p_notes),''),active=coalesce(p_active,true) where id=p_supplier_id returning id into v_id;if v_id is null then raise exception 'Fornecedor Fitness não encontrado';end if;end if;
 return v_id;
end;$$;

create or replace function public.save_fitness_product_v2(p_product_id uuid,p_name text,p_category text,p_description text,p_image_url text,p_active boolean,p_default_supplier_id uuid,p_variants jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_product_id uuid;v_variant record;
begin
 if not public.can_write_fitness() then raise exception 'Usuário sem permissão para alterar a operação Fitness';end if;
 if nullif(btrim(p_name),'') is null then raise exception 'Informe o nome do produto';end if;
 if p_variants is null or jsonb_typeof(p_variants)<>'array' or jsonb_array_length(p_variants)=0 then raise exception 'Adicione pelo menos uma variação';end if;
 if p_default_supplier_id is not null and not exists(select 1 from public.fitness_suppliers where id=p_default_supplier_id and active) then raise exception 'Fornecedor padrão inválido';end if;
 if p_product_id is null then insert into public.fitness_products(name,category,description,image_url,active) values(btrim(p_name),coalesce(nullif(btrim(p_category),''),'Vestuário'),nullif(btrim(p_description),''),nullif(btrim(p_image_url),''),coalesce(p_active,true)) returning id into v_product_id;
 else update public.fitness_products set name=btrim(p_name),category=coalesce(nullif(btrim(p_category),''),'Vestuário'),description=nullif(btrim(p_description),''),image_url=nullif(btrim(p_image_url),''),active=coalesce(p_active,true) where id=p_product_id returning id into v_product_id;if v_product_id is null then raise exception 'Produto Fitness não encontrado';end if;end if;
 for v_variant in select * from jsonb_to_recordset(p_variants) as x(id uuid,size text,color text,sku text,cost_price numeric,sale_price numeric,active boolean,minimum_stock integer,reorder_target integer,default_supplier_id uuid) loop
  if nullif(btrim(v_variant.size),'') is null or nullif(btrim(v_variant.color),'') is null then raise exception 'Informe tamanho e cor de todas as variações';end if;
  if coalesce(v_variant.cost_price,0)<0 or coalesce(v_variant.sale_price,0)<0 or coalesce(v_variant.minimum_stock,0)<0 or coalesce(v_variant.reorder_target,0)<0 then raise exception 'Revise preços e estoques';end if;
  if v_variant.id is null then insert into public.fitness_variants(product_id,size,color,sku,cost_price,sale_price,active,minimum_stock,reorder_target,default_supplier_id) values(v_product_id,btrim(v_variant.size),btrim(v_variant.color),nullif(btrim(v_variant.sku),''),coalesce(v_variant.cost_price,0),coalesce(v_variant.sale_price,0),coalesce(v_variant.active,true),coalesce(v_variant.minimum_stock,0),greatest(coalesce(v_variant.reorder_target,0),coalesce(v_variant.minimum_stock,0)),coalesce(v_variant.default_supplier_id,p_default_supplier_id));
  else update public.fitness_variants set size=btrim(v_variant.size),color=btrim(v_variant.color),sku=nullif(btrim(v_variant.sku),''),cost_price=coalesce(v_variant.cost_price,0),sale_price=coalesce(v_variant.sale_price,0),active=coalesce(v_variant.active,true),minimum_stock=coalesce(v_variant.minimum_stock,0),reorder_target=greatest(coalesce(v_variant.reorder_target,0),coalesce(v_variant.minimum_stock,0)),default_supplier_id=coalesce(v_variant.default_supplier_id,p_default_supplier_id) where id=v_variant.id and product_id=v_product_id;end if;
 end loop;return v_product_id;
end;$$;

create or replace function public.create_fitness_sale_v2(p_customer_id uuid,p_customer_name text,p_customer_phone text,p_customer_instagram text,p_city text,p_customer_source text,p_quoted_on date,p_items jsonb,p_payment_mode text default 'receivable',p_paid_on date default null,p_payment_method text default null,p_payment_due_on date default null,p_delivered boolean default false,p_delivered_on date default null,p_responsible text default null,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_customer_id uuid;v_sale_id uuid;
begin
 if not public.can_write_fitness() then raise exception 'Usuário sem permissão para registrar vendas Fitness';end if;v_customer_id:=p_customer_id;
 if v_customer_id is null then if nullif(btrim(p_customer_name),'') is null then raise exception 'Informe o cliente';end if;if nullif(btrim(p_customer_phone),'') is not null then select id into v_customer_id from public.fitness_customers where active and phone=btrim(p_customer_phone) order by updated_at desc limit 1;end if;if v_customer_id is null then select id into v_customer_id from public.fitness_customers where active and lower(name)=lower(btrim(p_customer_name)) order by updated_at desc limit 1;end if;if v_customer_id is null then insert into public.fitness_customers(name,phone,instagram,city,source) values(btrim(p_customer_name),nullif(btrim(p_customer_phone),''),nullif(btrim(p_customer_instagram),''),nullif(btrim(p_city),''),nullif(btrim(p_customer_source),'')) returning id into v_customer_id;else update public.fitness_customers set phone=coalesce(nullif(btrim(p_customer_phone),''),phone),instagram=coalesce(nullif(btrim(p_customer_instagram),''),instagram),city=coalesce(nullif(btrim(p_city),''),city),source=coalesce(nullif(btrim(p_customer_source),''),source) where id=v_customer_id;end if;end if;
 if not exists(select 1 from public.fitness_customers where id=v_customer_id and active) then raise exception 'Cliente Fitness inválido';end if;
 select public.create_fitness_sale((select name from public.fitness_customers where id=v_customer_id),coalesce(nullif(btrim(p_customer_phone),''),(select phone from public.fitness_customers where id=v_customer_id)),coalesce(nullif(btrim(p_city),''),(select city from public.fitness_customers where id=v_customer_id)),p_quoted_on,p_items,p_payment_mode,p_paid_on,p_payment_method,p_payment_due_on,p_delivered,p_delivered_on,p_notes) into v_sale_id;
 update public.fitness_sales set customer_id=v_customer_id,responsible=nullif(btrim(p_responsible),'') where id=v_sale_id;return v_sale_id;
end;$$;

create or replace function public.create_fitness_purchase_order_v2(p_supplier_id uuid,p_supplier_name text,p_ordered_on date,p_expected_on date,p_freight numeric,p_responsible text,p_items jsonb,p_notes text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_supplier_name text;v_order_id uuid;
begin if not public.can_write_fitness() then raise exception 'Usuário sem permissão para registrar pedidos Fitness';end if;if p_supplier_id is not null then select name into v_supplier_name from public.fitness_suppliers where id=p_supplier_id and active;end if;v_supplier_name:=coalesce(v_supplier_name,nullif(btrim(p_supplier_name),''));if v_supplier_name is null then raise exception 'Informe o fornecedor';end if;select public.create_fitness_purchase_order(v_supplier_name,p_ordered_on,p_items,p_notes) into v_order_id;update public.fitness_purchase_orders set freight=coalesce(p_freight,0),expected_on=p_expected_on,responsible=nullif(btrim(p_responsible),'') where id=v_order_id;return v_order_id;end;$$;

create or replace function public.receive_fitness_purchase_order(p_order_id uuid,p_received_on date,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_item record;
begin if not public.can_write_fitness() then raise exception 'Usuário sem permissão para receber pedidos Fitness';end if;if not exists(select 1 from public.fitness_purchase_orders where id=p_order_id and status<>'cancelled') then raise exception 'Pedido Fitness não encontrado';end if;for v_item in select id,(quantity_ordered-quantity_received)::integer remaining from public.fitness_purchase_order_items where purchase_order_id=p_order_id and quantity_received<quantity_ordered order by created_at,id loop perform public.receive_fitness_purchase_item(v_item.id,v_item.remaining,coalesce(p_received_on,(now() at time zone 'America/Sao_Paulo')::date),p_notes);end loop;update public.fitness_purchase_orders set status='received',received_on=coalesce(p_received_on,(now() at time zone 'America/Sao_Paulo')::date) where id=p_order_id;return p_order_id;end;$$;

create or replace function public.fitness_sync_purchase_order_receipt() returns trigger language plpgsql security definer set search_path=public as $$ declare v_status text;begin select case when bool_and(quantity_received>=quantity_ordered) then 'received' when bool_or(quantity_received>0) then 'partial' else 'pending' end into v_status from public.fitness_purchase_order_items where purchase_order_id=new.purchase_order_id;update public.fitness_purchase_orders set status=v_status,received_on=case when v_status='received' then coalesce(received_on,(now() at time zone 'America/Sao_Paulo')::date) else null end where id=new.purchase_order_id;return new;end;$$;
drop trigger if exists fitness_sync_purchase_order_receipt_trg on public.fitness_purchase_order_items;
create trigger fitness_sync_purchase_order_receipt_trg after update of quantity_received on public.fitness_purchase_order_items for each row execute function public.fitness_sync_purchase_order_receipt();

revoke all on function public.save_fitness_customer(uuid,text,text,text,text,text,text,boolean) from public,anon;
revoke all on function public.save_fitness_supplier(uuid,text,text,text,text,text,text,text,boolean) from public,anon;
revoke all on function public.save_fitness_product_v2(uuid,text,text,text,text,boolean,uuid,jsonb) from public,anon;
revoke all on function public.create_fitness_sale_v2(uuid,text,text,text,text,text,date,jsonb,text,date,text,date,boolean,date,text,text) from public,anon;
revoke all on function public.create_fitness_purchase_order_v2(uuid,text,date,date,numeric,text,jsonb,text) from public,anon;
revoke all on function public.receive_fitness_purchase_order(uuid,date,text) from public,anon;
grant execute on function public.save_fitness_customer(uuid,text,text,text,text,text,text,boolean) to authenticated,service_role;
grant execute on function public.save_fitness_supplier(uuid,text,text,text,text,text,text,text,boolean) to authenticated,service_role;
grant execute on function public.save_fitness_product_v2(uuid,text,text,text,text,boolean,uuid,jsonb) to authenticated,service_role;
grant execute on function public.create_fitness_sale_v2(uuid,text,text,text,text,text,date,jsonb,text,date,text,date,boolean,date,text,text) to authenticated,service_role;
grant execute on function public.create_fitness_purchase_order_v2(uuid,text,date,date,numeric,text,jsonb,text) to authenticated,service_role;
grant execute on function public.receive_fitness_purchase_order(uuid,date,text) to authenticated,service_role;
