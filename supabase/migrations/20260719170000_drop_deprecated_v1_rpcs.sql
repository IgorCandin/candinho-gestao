-- Candinho Company V18
-- Já aplicada diretamente no Supabase de produção.
--
-- Remove somente RPCs V1 comprovadamente sem consumidores no frontend atual
-- e que já estavam sem EXECUTE para anon/authenticated.
--
-- IMPORTANTE:
-- create_fitness_sale (V1 interna) e create_fitness_purchase_order (V1 interna)
-- NÃO são removidas: as respectivas funções V2 ainda as reutilizam internamente.

drop function if exists public.get_my_access();
drop function if exists public.list_user_permissions();

drop function if exists public.update_user_permissions(
  uuid, text, text, boolean, boolean, boolean, boolean, boolean
);

drop function if exists public.update_user_permissions(
  uuid, text, text, boolean, boolean, boolean, boolean, boolean,
  boolean, boolean, boolean
);

drop function if exists public.central_media_search(text, text, integer);

drop function if exists public.save_fitness_product(
  uuid, text, text, text, text, boolean, jsonb
);
