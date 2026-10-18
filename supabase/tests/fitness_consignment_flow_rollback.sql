-- Executed against the current database; synthetic records only, always ROLLBACK.
begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='admin' and active limit 1),true);
do $test$
declare p uuid; v uuid; c uuid; i uuid; s uuid; n integer;
begin
insert into public.fitness_products(name) values('TESTE ROLLBACK fluxo consignação 20261017') returning id into p;
insert into public.fitness_variants(product_id,size,color,sale_price) values(p,'M','Teste',30) returning id into v;
insert into public.fitness_inventory_movements(variant_id,movement_type,quantity_delta,idempotency_key) values(v,'adjustment',5,'test-consignment-flow-20261017');
c:=public.create_fitness_consignment(null,'TESTE ROLLBACK consignação 20261017',null,null,null,'Outro',current_date,current_date,jsonb_build_array(jsonb_build_object('variant_id',v,'quantity',2,'unit_price',30)));
select id into i from public.fitness_consignment_items where consignment_id=c;
s:=public.settle_fitness_consignment(c,jsonb_build_array(jsonb_build_object('item_id',i,'quantity_sold',1)));
if s is null then raise exception 'Venda ausente'; end if;
if not exists(select 1 from public.fitness_sales where id=s and source_consignment_id=c) then raise exception 'Histórico ausente'; end if;
select quantity into n from public.fitness_stock_balances where variant_id=v;
if n<>4 then raise exception 'Baixa incorreta: %',n; end if;
if not exists(select 1 from public.fitness_consignment_items where id=i and quantity_sold=1 and quantity_returned=1) then raise exception 'Acerto parcial incorreto'; end if;
c:=public.create_fitness_consignment(null,'TESTE ROLLBACK consignação 20261017',null,null,null,'Outro',current_date,current_date,jsonb_build_array(jsonb_build_object('variant_id',v,'quantity',2,'unit_price',30)));
select id into i from public.fitness_consignment_items where consignment_id=c;
s:=public.settle_fitness_consignment(c,jsonb_build_array(jsonb_build_object('item_id',i,'quantity_sold',0)));
if s is not null then raise exception 'Devolução gerou venda'; end if;
select quantity into n from public.fitness_stock_balances where variant_id=v;
if n<>4 then raise exception 'Devolução duplicou estoque: %',n; end if;
end $test$;
select 'PASS: venda vinculada, baixa única, devolução sem venda/duplicação' as result;
rollback;
