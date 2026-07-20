-- Candinho Company V29
-- Impede execução direta da função interna usada pelo trigger de lotes.

revoke all
on function public.apply_inventory_lot_tracking()
from public,anon,authenticated;

grant execute
on function public.apply_inventory_lot_tracking()
to service_role;
