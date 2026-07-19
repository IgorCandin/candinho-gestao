-- Aplicar após o frontend V17 estar em produção.
-- O V17 remove as últimas consultas ativas à antiga Inbox.
-- Não revoga SELECT direto de central_conversations, pois central-meta-send
-- pode precisar validar o contexto da conversa enquanto a integração Meta
-- continua sendo trabalhada em outro fluxo.

revoke execute on function public.central_inbox_snapshot(text, text, integer)
from authenticated, anon;

revoke select on table public.central_inbox_overview
from authenticated, anon;
