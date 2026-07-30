begin;

create or replace function public.refresh_nexus_operating_layer_v2()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_refresh jsonb;
  v_tune jsonb;
  v_pruned integer:=0;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para atualizar o Nexus';
  end if;

  select public.refresh_nexus_signals_v1() into v_refresh;
  select public.tune_nexus_signals_v1() into v_tune;
  select public.prune_nexus_activity_v1(180) into v_pruned;

  return jsonb_build_object(
    'signals',v_refresh,
    'tuning',v_tune,
    'activity_pruned',v_pruned,
    'refreshed_at',now()
  );
end;
$$;

grant execute on function public.refresh_nexus_operating_layer_v2()
to authenticated,service_role;

commit;
