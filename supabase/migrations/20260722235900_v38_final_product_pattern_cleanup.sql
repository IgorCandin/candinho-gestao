-- Ajustes finais e idempotentes do padrão de nomes/categoria.
-- Estes ajustes já foram aplicados manualmente em produção durante a revisão.

update public.products
set name='Creatina 120 Cápsulas | Health Labs', updated_at=now()
where sku='10261'
  and name='Creatina 120 Cápsulas - Health Labs';

update public.products
set name='Whey 100% 900g | Dark Lab', updated_at=now()
where sku='10631'
  and name='Whey 100% 900g - Dark Lab';

update public.products
set name='Whey 100% 900g | FTW', updated_at=now()
where sku='10641'
  and name='Whey 100% 900g - FTW';

update public.products
set name='Massive Mass 2,5kg - Hipercalórico | FTW', updated_at=now()
where sku='10411'
  and name='Massive Mass 2,5Kg - Hipercalórico | FTW';

update public.products
set category='Energia', updated_at=now()
where sku='10151'
  and name ilike '%Pré-Treino%'
  and category='Massa';
