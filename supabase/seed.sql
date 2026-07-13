-- Locais iniciais
insert into public.locations(code, name, city, location_type) values
  ('CS', 'Estoque principal', 'Caparaó', 'internal'),
  ('CTS', 'Candinho Treino Studio', 'Caparaó', 'internal'),
  ('ES', 'Estoque Espera Feliz', 'Espera Feliz', 'internal'),
  ('TT', 'Ponto TT', null, 'internal'),
  ('INGRID', 'Ponto Ingrid', 'Carangola', 'partner'),
  ('ADRIANA', 'Ponto Adriana', 'Carangola', 'partner'),
  ('ITAPHARMA', 'Drogaria Itapharma', 'Caparaó', 'partner')
on conflict (code) do update set name = excluded.name, city = excluded.city, location_type = excluded.location_type;

-- Produtos iniciais usados para validar a instalação.
insert into public.products(name, sku, category, brand, cost_price, sale_price, min_stock) values
  ('Creatina Candinho 300g', 'CREA-CAND-300', 'Força', 'Candinho', 29.90, 70.00, 10),
  ('Touro Power', 'TOURO-60', 'Energia', 'Health Labs', 29.90, 64.90, 3),
  ('Ashwagandha + Moringa + Maca Negra', 'ASH-MMM', 'Saúde', 'Health Labs', 29.00, 69.90, 3),
  ('Picolinato de Cromo Growth', 'PICO-GR', 'Emagrecimento', 'Growth', 19.90, 54.90, 2),
  ('Coqueteleira Candinho', 'COQ-CAND', 'Acessórios', 'Candinho', 6.50, 14.90, 5)
on conflict (name) do update set
  sku = excluded.sku,
  category = excluded.category,
  brand = excluded.brand,
  cost_price = excluded.cost_price,
  sale_price = excluded.sale_price,
  min_stock = excluded.min_stock;

-- Saldos de demonstração. Execute somente em um banco novo.
insert into public.inventory_movements(product_id, location_id, movement_type, quantity_delta, notes, idempotency_key)
select p.id, l.id, 'opening', x.quantity, 'Saldo inicial de instalação', 'seed:opening:' || p.id || ':' || l.id
from (values
  ('Creatina Candinho 300g', 'CS', 46),
  ('Creatina Candinho 300g', 'CTS', 8),
  ('Touro Power', 'CS', 4),
  ('Ashwagandha + Moringa + Maca Negra', 'CS', 2),
  ('Coqueteleira Candinho', 'CS', 13)
) as x(product_name, location_code, quantity)
join public.products p on p.name = x.product_name
join public.locations l on l.code = x.location_code
on conflict (idempotency_key) do nothing;
