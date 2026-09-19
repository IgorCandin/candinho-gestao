-- A auditoria de 19/09/2026 apontou o Black Skull como o Whey A de maior
-- giro recente. Mantemos os demais membros equivalentes, alterando apenas a
-- preferencia usada ao montar a proxima compra.
update public.replenishment_groups g
set preferred_product_id = p.id,
    updated_at = now()
from public.products p
where lower(g.name) = 'whey'
  and p.name = 'Whey 100% HD 900g | Black Skull'
  and g.preferred_product_id is distinct from p.id;
