-- Já aplicada no Supabase de produção.
-- Remove a superfície de escrita da Inbox pausada sem tocar no webhook Meta
-- nem no central-meta-send.

revoke execute on function public.central_assign_conversation(uuid, uuid)
from authenticated, anon;

revoke execute on function public.central_create_conversation_followup(uuid, timestamptz, text, text)
from authenticated, anon;

revoke execute on function public.central_mark_conversation_read(uuid)
from authenticated, anon;

revoke execute on function public.central_set_conversation_label(uuid, text)
from authenticated, anon;

revoke execute on function public.central_set_conversation_status(uuid, text)
from authenticated, anon;

revoke insert, update, delete, truncate
on table public.central_conversations
from authenticated, anon;

revoke insert, update, delete, truncate
on table public.central_messages
from authenticated, anon;

revoke insert, update, delete, truncate
on table public.central_ai_insights
from authenticated, anon;
