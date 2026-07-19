alter table public.central_conversations
  add column if not exists label_key text;

alter table public.central_messages
  add column if not exists media_storage_path text,
  add column if not exists media_mime_type text,
  add column if not exists media_filename text;

create or replace view public.central_inbox_overview as
select
  cv.id as conversation_id,
  cv.operation_scope,
  ch.provider,
  ch.account_external_id,
  ch.account_name,
  cv.contact_id,
  coalesce(ct.display_name, ci.display_name, ci.username, ci.external_id, 'Contato'::text) as contact_name,
  ct.phone,
  ct.instagram_username,
  cv.status,
  cv.assigned_to,
  pr.full_name as assigned_to_name,
  cv.last_message_at,
  cv.unread_count,
  lm.id as last_message_id,
  lm.direction as last_message_direction,
  lm.message_type as last_message_type,
  lm.body as last_message_body,
  lm.delivery_status as last_message_delivery_status,
  cv.label_key
from public.central_conversations cv
join public.central_channels ch on ch.id = cv.channel_id
left join public.central_contacts ct on ct.id = cv.contact_id
left join lateral (
  select i.*
  from public.central_contact_identities i
  where i.contact_id = cv.contact_id
    and i.provider = ch.provider
    and i.account_external_id = ch.account_external_id
  order by i.updated_at desc
  limit 1
) ci on true
left join public.profiles pr on pr.id = cv.assigned_to
left join lateral (
  select m.*
  from public.central_messages m
  where m.conversation_id = cv.id
  order by m.sent_at desc, m.created_at desc
  limit 1
) lm on true;

create or replace function public.central_set_conversation_label(p_conversation_id uuid, p_label_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text;
  v_label text;
begin
  select operation_scope into v_scope
  from public.central_conversations
  where id = p_conversation_id;

  if v_scope is null then raise exception 'Conversa não encontrada'; end if;
  if not public.central_can_write_scope(v_scope) then raise exception 'Acesso negado'; end if;

  v_label := nullif(trim(coalesce(p_label_key, '')), '');
  if v_label is not null and v_label not in ('novo_lead','orcamento','aguardando','pagamento','venda','urgente','pos_venda','parceiro') then
    raise exception 'Etiqueta inválida';
  end if;

  update public.central_conversations
  set label_key = v_label, updated_at = now()
  where id = p_conversation_id;
end;
$$;

grant execute on function public.central_set_conversation_label(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'central_messages'
  ) then
    alter publication supabase_realtime add table public.central_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'central_conversations'
  ) then
    alter publication supabase_realtime add table public.central_conversations;
  end if;
end $$;
