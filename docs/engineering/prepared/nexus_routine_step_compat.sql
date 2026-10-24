-- PREPARED ONLY: do not apply or merge the application before explicit approval.
-- New adapter retains the existing routine engine, ownership and row-lock ordering.
create or replace function public.nexus_advance_routine_step_v1(
  p_run_id uuid,
  p_expected_step integer,
  p_action text default 'arrive',
  p_href text default null,
  p_observed_href text default null
)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_step integer;
  v_history_length integer;
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;
  if p_expected_step is null or p_expected_step < 0 then
    raise exception 'Etapa esperada inválida' using errcode='22023';
  end if;

  select current_step,jsonb_array_length(history)
    into v_step,v_history_length
  from public.nexus_routine_runs
  where id=p_run_id and user_id=v_user and status='active'
  for update;

  if not found or v_step<>p_expected_step then
    raise exception 'A rotina mudou. Atualize antes de continuar.' using errcode='40001';
  end if;

  v_result := public.nexus_advance_routine_v1(p_run_id,p_action,p_href);

  -- Keep the persisted engine href and record the observed Company URL on this new entry only.
  if p_observed_href is not null and p_observed_href is distinct from p_href then
    update public.nexus_routine_runs
      set history=jsonb_set(history,
        array[(jsonb_array_length(history)-1)::text,'observed_href'],
        to_jsonb(left(p_observed_href,320)),true)
    where id=p_run_id and user_id=v_user and jsonb_array_length(history)>v_history_length;
  end if;
  return v_result;
end;
$$;

revoke all on function public.nexus_advance_routine_step_v1(uuid,integer,text,text,text) from public,anon;
grant execute on function public.nexus_advance_routine_step_v1(uuid,integer,text,text,text) to authenticated;
