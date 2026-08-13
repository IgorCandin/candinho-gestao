-- V45.37.R3 · UX Doctor
-- Uma visita comprovadamente saudável encerra apenas sinais automáticos de
-- layout da mesma rota + classe de viewport. client_error não é apagado.

create or replace function public.nexus_confirm_ux_layout_health_v1(
  p_route text,
  p_viewport_class text default 'unknown'
)
returns integer
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_route text;
  v_viewport text := lower(btrim(coalesce(p_viewport_class,'unknown')));
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id=v_user and p.active
  ) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;

  if coalesce(p_route,'')='' or left(btrim(p_route),1)<>'/' then
    raise exception 'Rota inválida';
  end if;

  v_route := public.normalize_nexus_route_v1(p_route);

  if v_viewport not in ('mobile','tablet','desktop','unknown') then
    v_viewport := 'unknown';
  end if;

  update public.ux_health_signals
  set status='resolved',
      resolved_at=now(),
      resolution_note='Auto-resolvido V45.37.R3: a rota foi reavaliada sem overflow/clipping.'
  where user_id=v_user
    and route=v_route
    and viewport_class=v_viewport
    and status='active'
    and signal_type in ('horizontal_overflow','fixed_clip');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.nexus_confirm_ux_layout_health_v1(text,text) from public,anon;
grant execute on function public.nexus_confirm_ux_layout_health_v1(text,text) to authenticated;

-- Fecha somente a ocorrência do Physique que motivou este hotfix.
-- Se reaparecer, nexus_record_ux_health_signal_v1 reabre o fingerprint.
update public.ux_health_signals
set status='resolved',
    resolved_at=coalesce(resolved_at,now()),
    resolution_note='V45.37.R3: correção responsiva V45.37.R2 validada sem nova ocorrência; reabre se reaparecer.'
where status='active'
  and route='/physique/fichas/:id'
  and signal_type='horizontal_overflow'
  and viewport_class='mobile'
  and occurrence_count=1
  and last_seen_at <= timestamptz '2026-08-13 14:10:33+00';
