-- Owner-confirmed on 2026-08-18: create only the missing stock structure for
-- 13 active, public products. Quantity zero represents the confirmed physical
-- state; no operational quantity is inferred.

with target_products(product_id) as (
  values
    ('0445d8f9-b648-4b11-945b-c454a2c7ff14'::uuid), -- Army Super Mass
    ('f81db616-f463-4a9a-8dea-3e135a290433'::uuid), -- Ashwagandha
    ('114bffc1-1574-4a77-8e16-4d1202437b10'::uuid), -- BCAA
    ('ab6621c1-1a32-44c8-870e-3c05e1d7bf6f'::uuid), -- Biotina
    ('1726459d-e475-42cb-8962-ca021fe6c1fc'::uuid), -- Cafeína
    ('001d1235-06b9-410e-8356-a2efcae4c4ec'::uuid), -- Creatina
    ('e644999d-d604-4619-80f2-d049e6c9111d'::uuid), -- Feno-Grego
    ('90e761f2-16b0-4f3d-8e92-ecf67bec7740'::uuid), -- Kit Whey
    ('01ddd391-17d9-43c3-aad1-4e2889f3157e'::uuid), -- Massive Mass
    ('17cc61c0-ed95-43b9-98f1-88871019461e'::uuid), -- Moringa
    ('96a6fb22-6826-40b4-a8cc-a325089a6003'::uuid), -- Pholia Magra
    ('5fb2ea10-73e4-45e8-a091-58b89dee2bd3'::uuid), -- Vitamina B12
    ('80881aa7-a467-4e3b-9c30-c12049051d01'::uuid)  -- Whey Dark Lab
), central_location as (
  select l.id
  from public.locations l
  where l.id = '545cef35-ac3e-47cc-b908-db55445db64a'::uuid
    and l.active
    and l.name = 'Estoque Central - Candinho Suplementos'
), inserted as (
  insert into public.stock_balances(product_id, location_id, quantity, updated_at)
  select target.product_id, location.id, 0, now()
  from target_products target
  join public.products product on product.id = target.product_id and product.active
  cross join central_location location
  where not exists (
    select 1
    from public.stock_balances existing
    where existing.product_id = target.product_id
  )
  on conflict (product_id, location_id) do nothing
  returning product_id, location_id, quantity
)
insert into public.audit_events(entity_type, entity_id, action, details)
select
  'product',
  inserted.product_id,
  'stock_balance_structure_created',
  jsonb_build_object(
    'location_id', inserted.location_id,
    'quantity', inserted.quantity,
    'reason', 'owner_confirmed_physical_zero',
    'migration', '20260818123100_create_confirmed_missing_stock_balances'
  )
from inserted;

do $verification$
declare
  v_missing_count integer;
  v_deferred_changed integer;
begin
  select count(*)::integer
  into v_missing_count
  from unnest(array[
    '0445d8f9-b648-4b11-945b-c454a2c7ff14'::uuid,
    'f81db616-f463-4a9a-8dea-3e135a290433'::uuid,
    '114bffc1-1574-4a77-8e16-4d1202437b10'::uuid,
    'ab6621c1-1a32-44c8-870e-3c05e1d7bf6f'::uuid,
    '1726459d-e475-42cb-8962-ca021fe6c1fc'::uuid,
    '001d1235-06b9-410e-8356-a2efcae4c4ec'::uuid,
    'e644999d-d604-4619-80f2-d049e6c9111d'::uuid,
    '90e761f2-16b0-4f3d-8e92-ecf67bec7740'::uuid,
    '01ddd391-17d9-43c3-aad1-4e2889f3157e'::uuid,
    '17cc61c0-ed95-43b9-98f1-88871019461e'::uuid,
    '96a6fb22-6826-40b4-a8cc-a325089a6003'::uuid,
    '5fb2ea10-73e4-45e8-a091-58b89dee2bd3'::uuid,
    '80881aa7-a467-4e3b-9c30-c12049051d01'::uuid
  ]) target(product_id)
  where not exists (
    select 1
    from public.stock_balances balance
    where balance.product_id = target.product_id
  );

  if v_missing_count <> 0 then
    raise exception 'Stock structure verification failed: % products still missing',
      v_missing_count;
  end if;

  select count(*)::integer
  into v_deferred_changed
  from public.stock_balances balance
  where balance.product_id = any(array[
    '50d40a6c-44e7-4a54-8c67-ad20a8aa712b'::uuid,
    'a8dd3835-5e13-4549-bce3-aaf9f8d97c76'::uuid,
    '0ac6ea27-4aa6-40f3-a464-973fb8f28395'::uuid,
    '7dd044cd-1997-4724-afa6-0b3af896f492'::uuid
  ]);

  if v_deferred_changed <> 0 then
    raise exception 'Deferred products were unexpectedly changed';
  end if;
end
$verification$;
