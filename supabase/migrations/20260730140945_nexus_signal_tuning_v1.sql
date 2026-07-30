begin;

create or replace function public.tune_nexus_signals_v1()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_resolved_old_leads integer := 0;
  v_open integer := 0;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para ajustar sinais do Nexus';
  end if;

  -- Leads muito antigos continuam no histórico/Radar, mas não ficam ocupando
  -- a fila diária de retomada. A fila do Nexus foca no contato recente.
  update public.nexus_signals
  set status='resolved',resolved_at=now(),updated_at=now()
  where signal_type='lead_followup'
    and status='open'
    and nullif(metadata->>'last_touch','')::timestamptz < now()-interval '30 days';
  get diagnostics v_resolved_old_leads = row_count;

  -- Mantém urgências operacionais acima de reativação comercial antiga.
  update public.nexus_signals
  set score=least(score,80),updated_at=now()
  where signal_type='lead_followup' and status='open';

  update public.nexus_signals
  set score=least(score,86),updated_at=now()
  where signal_type='stock_lead_opportunity' and status='open';

  select count(*)::integer into v_open
  from public.nexus_signals
  where operation_scope='supplements' and status='open';

  return jsonb_build_object(
    'resolved_old_leads',v_resolved_old_leads,
    'open_signals',v_open
  );
end;
$$;

grant execute on function public.tune_nexus_signals_v1()
to authenticated,service_role;

commit;
