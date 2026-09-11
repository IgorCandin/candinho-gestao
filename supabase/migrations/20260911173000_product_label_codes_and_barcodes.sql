-- Códigos internos e códigos de barras próprios da Candinho.
-- SKU continua reservado para a referência do fornecedor/fabricante.
alter table public.products
  add column if not exists internal_code text,
  add column if not exists barcode_value text;

alter table public.fitness_variants
  add column if not exists internal_code text,
  add column if not exists barcode_value text;

create or replace function public.candinho_next_internal_code_v1()
returns text
language plpgsql
set search_path = public
as $$
declare
  candidate text;
begin
  -- Evita uma colisão mesmo quando dois cadastros forem salvos ao mesmo tempo.
  perform pg_advisory_xact_lock(hashtext('candinho-internal-label-code-v1'));

  loop
    candidate := lpad((floor(random() * 100000))::integer::text, 5, '0');
    if candidate = '00000' then
      continue;
    end if;

    if not exists (select 1 from public.products where internal_code = candidate)
      and not exists (select 1 from public.fitness_variants where internal_code = candidate) then
      return candidate;
    end if;
  end loop;
end;
$$;

create or replace function public.candinho_ean13_v1(p_internal_code text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  base_value text;
  weighted_sum integer := 0;
  position integer;
begin
  if p_internal_code !~ '^[0-9]{5}$' then
    raise exception 'O código interno precisa ter exatamente cinco dígitos.';
  end if;

  -- Prefixo 200: faixa de uso interno. Não é um GTIN de fabricante.
  base_value := '200' || p_internal_code || '0000';
  for position in 1..12 loop
    weighted_sum := weighted_sum
      + substring(base_value from position for 1)::integer
        * case when position % 2 = 1 then 1 else 3 end;
  end loop;

  return base_value || ((10 - (weighted_sum % 10)) % 10)::text;
end;
$$;

create or replace function public.ensure_candinho_label_codes_v1()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.internal_code is null or btrim(new.internal_code) = '' then
    new.internal_code := public.candinho_next_internal_code_v1();
  end if;

  if new.barcode_value is null or btrim(new.barcode_value) = '' then
    new.barcode_value := public.candinho_ean13_v1(new.internal_code);
  end if;

  return new;
end;
$$;

drop trigger if exists products_ensure_candinho_label_codes_v1 on public.products;
create trigger products_ensure_candinho_label_codes_v1
before insert or update of internal_code, barcode_value on public.products
for each row execute function public.ensure_candinho_label_codes_v1();

drop trigger if exists fitness_variants_ensure_candinho_label_codes_v1 on public.fitness_variants;
create trigger fitness_variants_ensure_candinho_label_codes_v1
before insert or update of internal_code, barcode_value on public.fitness_variants
for each row execute function public.ensure_candinho_label_codes_v1();

update public.products
set internal_code = public.candinho_next_internal_code_v1()
where internal_code is null or btrim(internal_code) = '';

update public.products
set barcode_value = public.candinho_ean13_v1(internal_code)
where barcode_value is null or btrim(barcode_value) = '';

update public.fitness_variants
set internal_code = public.candinho_next_internal_code_v1()
where internal_code is null or btrim(internal_code) = '';

update public.fitness_variants
set barcode_value = public.candinho_ean13_v1(internal_code)
where barcode_value is null or btrim(barcode_value) = '';

create unique index if not exists products_internal_code_key on public.products (internal_code) where internal_code is not null;
create unique index if not exists products_barcode_value_key on public.products (barcode_value) where barcode_value is not null;
create unique index if not exists fitness_variants_internal_code_key on public.fitness_variants (internal_code) where internal_code is not null;
create unique index if not exists fitness_variants_barcode_value_key on public.fitness_variants (barcode_value) where barcode_value is not null;

alter table public.products drop constraint if exists products_internal_code_format;
alter table public.products add constraint products_internal_code_format check (internal_code is null or internal_code ~ '^[0-9]{5}$');
alter table public.fitness_variants drop constraint if exists fitness_variants_internal_code_format;
alter table public.fitness_variants add constraint fitness_variants_internal_code_format check (internal_code is null or internal_code ~ '^[0-9]{5}$');

create or replace view public.fitness_stock_operational with (security_invoker = true) as
select
  s.variant_id,
  s.product_id,
  s.product_name,
  s.category,
  s.image_url,
  s.product_active,
  s.size,
  s.color,
  s.sku,
  s.cost_price,
  s.sale_price,
  s.variant_active,
  s.physical_quantity,
  s.reserved_quantity,
  s.available_quantity,
  s.incoming_quantity,
  s.stock_cost_value,
  s.stock_sale_value,
  s.stock_status,
  v.minimum_stock,
  v.reorder_target,
  v.default_supplier_id,
  fs.name as default_supplier_name,
  greatest(v.minimum_stock-s.available_quantity,0) as quantity_below_minimum,
  greatest(greatest(v.reorder_target,v.minimum_stock)-s.available_quantity-s.incoming_quantity,0) as suggested_reorder_quantity,
  case
    when not s.product_active or not s.variant_active then 'inactive'::text
    when s.available_quantity<=0 and s.incoming_quantity>0 then 'incoming'::text
    when s.available_quantity<=0 then 'out_of_stock'::text
    when s.available_quantity<=v.minimum_stock then 'low_stock'::text
    else 'available'::text
  end as operational_status,
  s.consigned_quantity,
  v.internal_code,
  v.barcode_value
from public.fitness_stock_overview s
join public.fitness_variants v on v.id=s.variant_id
left join public.fitness_suppliers fs on fs.id=v.default_supplier_id
order by
  case when s.available_quantity>0 then 0 when s.incoming_quantity>0 then 1 else 2 end,
  s.category nulls last, s.product_name, s.size nulls last, s.color nulls last;
