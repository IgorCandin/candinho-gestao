do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'central_messages'
  ) then
    alter publication supabase_realtime drop table public.central_messages;
  end if;

  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'central_conversations'
  ) then
    alter publication supabase_realtime drop table public.central_conversations;
  end if;
end $$;
