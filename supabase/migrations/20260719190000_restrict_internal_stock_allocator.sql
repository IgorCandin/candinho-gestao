-- Candinho Company V20
-- Já aplicada diretamente no Supabase de produção.
--
-- allocate_available_stock é uma função auxiliar interna.
-- Ela é chamada por:
--   register_inventory_adjustment(...)
--   register_inventory_count(...)
--   transfer_inventory(...)
--
-- Essas três RPCs são SECURITY DEFINER, pertencem ao postgres e fazem
-- validação de permissão antes de operar. O cliente não precisa executar
-- allocate_available_stock diretamente.

revoke execute on function public.allocate_available_stock(uuid, uuid, text)
from authenticated, anon;
