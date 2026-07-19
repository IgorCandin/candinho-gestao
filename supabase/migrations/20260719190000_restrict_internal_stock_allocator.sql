-- Candinho Company V20
-- Já aplicada diretamente no Supabase de produção.
--
-- allocate_available_stock é um helper interno de alocação de estoque.
-- Chamadores protegidos:
--   register_inventory_adjustment(...)
--   register_inventory_count(...)
--   transfer_inventory(...)
--
-- O cliente não precisa executar esta função diretamente.

revoke execute on function public.allocate_available_stock(uuid, uuid, text)
from authenticated, anon;
