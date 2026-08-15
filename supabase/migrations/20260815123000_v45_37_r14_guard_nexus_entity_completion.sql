-- V45.37.R14
-- Sinais automáticos do Nexus refletem uma pendência calculada em outra
-- entidade. Resolver o sinal não pode substituir a ação empresarial real.

create or replace function public.update_nexus_signal_status_v1(
  p_signal_id uuid,
  p_action text,
  p_snooze_days integer default 3
)
returns public.nexus_signals
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.nexus_signals%rowtype;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para atualizar sinais do Nexus';
  end if;

  select * into v_row
  from public.nexus_signals
  where id = p_signal_id
  for update;

  if not found then
    raise exception 'Sinal do Nexus não encontrado';
  end if;

  if lower(p_action) = 'resolve' and v_row.generated_by = 'engine' then
    raise exception 'Conclua a pendência na origem. O Nexus encerrará o sinal automaticamente.';
  end if;

  if lower(p_action) not in ('resolve', 'dismiss', 'snooze', 'reopen') then
    raise exception 'Ação de sinal inválida';
  end if;

  update public.nexus_signals
  set status = case lower(p_action)
      when 'resolve' then 'resolved'
      when 'dismiss' then 'dismissed'
      when 'snooze' then 'snoozed'
      when 'reopen' then 'open'
    end,
    snoozed_until = case
      when lower(p_action) = 'snooze'
        then now() + make_interval(days => greatest(coalesce(p_snooze_days, 3), 1))
      else null
    end,
    resolved_at = case
      when lower(p_action) = 'resolve' then now()
      when lower(p_action) = 'reopen' then null
      else resolved_at
    end,
    updated_at = now()
  where id = p_signal_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.update_nexus_signal_status_v1(uuid,text,integer) from public;
grant execute on function public.update_nexus_signal_status_v1(uuid,text,integer)
to authenticated, service_role;
