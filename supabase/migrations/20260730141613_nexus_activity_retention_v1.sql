begin;

create or replace function public.prune_nexus_activity_v1(
  p_retention_days integer default 180
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_deleted integer:=0;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para limpar telemetria do Nexus';
  end if;

  delete from public.nexus_activity_events
  where created_at < now()-make_interval(
    days=>greatest(coalesce(p_retention_days,180),30)
  );

  get diagnostics v_deleted=row_count;
  return v_deleted;
end;
$$;

grant execute on function public.prune_nexus_activity_v1(integer)
to authenticated,service_role;

commit;
