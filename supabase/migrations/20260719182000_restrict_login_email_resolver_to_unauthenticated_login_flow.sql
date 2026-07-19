-- Candinho Company V19
-- Já aplicada diretamente no Supabase de produção.
--
-- O frontend atual precisa desta RPC apenas ANTES da autenticação quando o
-- usuário entra com username em vez de e-mail.
-- Usuários já autenticados não precisam consultar essa resolução.

revoke execute on function public.resolve_login_email(text)
from authenticated;
