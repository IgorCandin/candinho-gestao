begin;

create or replace function public.central_google_calendar_status()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_config record;
  v_has_bridge boolean := false;
  v_pending integer := 0;
  v_errors integer := 0;
  v_done integer := 0;
begin
  if not public.central_can_manage_strategic_agenda() then
    raise exception 'Acesso negado';
  end if;

  select
    c.apps_script_url,
    c.last_sync_at,
    c.last_error
  into v_config
  from public.central_calendar_internal_config c
  where c.singleton=true;

  v_has_bridge := found
    and nullif(
      btrim(
        coalesce(
          v_config.apps_script_url,
          ''
        )
      ),
      ''
    ) is not null
    and exists (
      select 1
      from public.central_calendar_internal_config c
      where c.singleton=true
        and nullif(
          btrim(
            coalesce(
              c.apps_script_secret,
              ''
            )
          ),
          ''
        ) is not null
    );

  select
    count(*) filter(
      where q.status='pending'
    )::integer,
    count(*) filter(
      where q.status='error'
    )::integer,
    count(*) filter(
      where q.status='done'
    )::integer
  into
    v_pending,
    v_errors,
    v_done
  from public.central_calendar_sync_queue q;

  return jsonb_build_object(
    'configured',
    v_has_bridge,
    'connected',
    v_has_bridge,
    'provider',
    'apps_script',
    'email',
    null,
    'calendar_id',
    'primary',
    'status',
    case
      when v_has_bridge
      then 'connected'
      else 'disconnected'
    end,
    'sync_post_sale',
    true,
    'sync_strategic_agenda',
    true,
    'last_sync_at',
    case
      when found
      then v_config.last_sync_at
      else null
    end,
    'last_error',
    case
      when found
      then v_config.last_error
      else null
    end,
    'pending_jobs',
    coalesce(v_pending,0),
    'error_jobs',
    coalesce(v_errors,0),
    'done_jobs',
    coalesce(v_done,0)
  );
end;
$function$;

grant execute on function
public.central_google_calendar_status()
to authenticated,service_role;

revoke all on function
public.central_google_calendar_status()
from anon,public;

commit;
