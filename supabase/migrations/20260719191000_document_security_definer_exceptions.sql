-- Candinho Company V20
-- Já aplicada diretamente no Supabase de produção.
--
-- Documenta decisões conscientes da auditoria de SECURITY DEFINER.

comment on function public.allocate_available_stock(uuid, uuid, text) is
'Internal stock allocation helper. Direct EXECUTE is restricted to the function owner; it is invoked by protected SECURITY DEFINER stock workflows.';

comment on function public.resolve_login_email(text) is
'Intentional pre-auth username-to-email resolver used by the current username login flow. Anonymous EXECUTE remains temporarily required until login is moved behind a secure server-side authentication endpoint.';
