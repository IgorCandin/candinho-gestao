alter table public.central_media_assets
  add column if not exists contact_id uuid references public.central_contacts(id) on delete set null,
  add column if not exists conversation_id uuid references public.central_conversations(id) on delete set null;

create index if not exists central_media_assets_contact_idx
  on public.central_media_assets(contact_id) where contact_id is not null;
create index if not exists central_media_assets_conversation_idx
  on public.central_media_assets(conversation_id) where conversation_id is not null;

create or replace function public.central_media_search_v2(
  p_query text default null,
  p_scope text default null,
  p_kind text default null,
  p_ai_status text default null,
  p_contact_id uuid default null,
  p_limit integer default 120
)
returns table(
  id uuid,
  operation_scope text,
  storage_path text,
  original_filename text,
  mime_type text,
  source text,
  source_url text,
  description_ai text,
  search_text text,
  ai_metadata jsonb,
  tags text[],
  contact_id uuid,
  contact_name text,
  conversation_id uuid,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path=public
as $$
  select
    m.id,m.operation_scope,m.storage_path,m.original_filename,m.mime_type,m.source,m.source_url,
    m.description_ai,m.search_text,m.ai_metadata,
    coalesce(array_agg(distinct t.tag) filter (where t.tag is not null),array[]::text[]) as tags,
    m.contact_id,c.display_name as contact_name,m.conversation_id,m.created_at
  from public.central_media_assets m
  left join public.central_media_tags t on t.media_asset_id=m.id
  left join public.central_contacts c on c.id=m.contact_id
  where public.central_can_access_scope(m.operation_scope)
    and (p_scope is null or m.operation_scope=p_scope)
    and (p_contact_id is null or m.contact_id=p_contact_id)
    and (
      p_kind is null
      or (p_kind='image' and coalesce(m.mime_type,'') like 'image/%')
      or (p_kind='video' and coalesce(m.mime_type,'') like 'video/%')
      or (p_kind='document' and coalesce(m.mime_type,'') not like 'image/%' and coalesce(m.mime_type,'') not like 'video/%')
    )
    and (
      p_ai_status is null
      or (p_ai_status='classified' and m.description_ai is not null)
      or (p_ai_status='pending' and m.description_ai is null and coalesce(m.mime_type,'') in ('image/jpeg','image/png','image/webp'))
      or (p_ai_status='not_applicable' and coalesce(m.mime_type,'') not in ('image/jpeg','image/png','image/webp'))
    )
    and (
      coalesce(nullif(btrim(p_query),''),'')=''
      or lower(coalesce(m.search_text,'')) like '%'||lower(btrim(p_query))||'%'
      or lower(coalesce(m.description_ai,'')) like '%'||lower(btrim(p_query))||'%'
      or lower(coalesce(m.original_filename,'')) like '%'||lower(btrim(p_query))||'%'
      or lower(coalesce(c.display_name,'')) like '%'||lower(btrim(p_query))||'%'
      or exists (
        select 1 from public.central_media_tags tx
        where tx.media_asset_id=m.id and lower(tx.tag) like '%'||lower(btrim(p_query))||'%'
      )
    )
  group by m.id,c.display_name
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit,120),1),300);
$$;

grant execute on function public.central_media_search_v2(text,text,text,text,uuid,integer) to authenticated;
revoke all on function public.central_media_search_v2(text,text,text,text,uuid,integer) from public,anon;

create or replace function public.central_link_media_asset(
  p_asset_id uuid,
  p_contact_id uuid default null,
  p_conversation_id uuid default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_scope text;
  v_contact_scope text;
  v_conversation_scope text;
  v_conversation_contact uuid;
begin
  select operation_scope into v_scope from public.central_media_assets where id=p_asset_id;
  if v_scope is null then raise exception 'Mídia não encontrada'; end if;
  if not public.central_can_write_scope(v_scope) then raise exception 'Acesso negado'; end if;

  if p_contact_id is not null then
    select operation_scope into v_contact_scope from public.central_contacts where id=p_contact_id;
    if v_contact_scope is null or not public.central_can_access_scope(v_contact_scope) then raise exception 'Contato inválido'; end if;
  end if;

  if p_conversation_id is not null then
    select operation_scope,contact_id into v_conversation_scope,v_conversation_contact
    from public.central_conversations where id=p_conversation_id;
    if v_conversation_scope is null or not public.central_can_access_scope(v_conversation_scope) then raise exception 'Conversa inválida'; end if;
    if p_contact_id is not null and v_conversation_contact is distinct from p_contact_id then raise exception 'A conversa não pertence ao contato selecionado'; end if;
  end if;

  update public.central_media_assets
  set contact_id=coalesce(p_contact_id,v_conversation_contact),
      conversation_id=p_conversation_id,
      updated_at=now()
  where id=p_asset_id;
end;
$$;

revoke all on function public.central_link_media_asset(uuid,uuid,uuid) from public,anon;
grant execute on function public.central_link_media_asset(uuid,uuid,uuid) to authenticated;
