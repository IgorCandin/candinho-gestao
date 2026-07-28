begin;

create or replace function public.confirm_inventory_zero_baseline(
  p_location_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_units integer := 0;
  v_reserved integer := 0;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para validar estoque';
  end if;

  if not exists(
    select 1
    from public.locations
    where id = p_location_id
      and active
      and tracks_inventory
  ) then
    raise exception 'Ponto de estoque inválido ou inativo';
  end if;

  select coalesce(sum(quantity),0)::integer
  into v_units
  from public.stock_balances
  where location_id = p_location_id;

  select coalesce(sum(quantity_reserved),0)::integer
  into v_reserved
  from public.stock_reservations
  where location_id = p_location_id
    and status in ('reserved','partial');

  if v_units <> 0 then
    raise exception 'Este ponto possui % unidade(s) registradas. Use a contagem física por produto.', v_units;
  end if;

  if v_reserved <> 0 then
    raise exception 'Este ponto possui % unidade(s) reservadas e não pode ser validado como zerado.', v_reserved;
  end if;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details
  )
  values(
    'location',
    p_location_id,
    'inventory_zero_baseline_confirmed',
    jsonb_build_object(
      'physical_units', v_units,
      'reserved_units', v_reserved,
      'notes', nullif(btrim(p_notes),'')
    )
  );

  return p_location_id;
end;
$function$;

grant execute on function public.confirm_inventory_zero_baseline(uuid,text)
to authenticated, service_role;

create or replace view public.inventory_workspace_attention
with (security_invoker = true)
as
select
  'product'::text as attention_type,
  iwp.product_id as entity_id,
  iwp.product_name as title,
  iwp.stock_status as status,
  jsonb_build_object(
    'available_quantity', iwp.available_quantity,
    'incoming_quantity', iwp.incoming_quantity,
    'min_stock', iwp.min_stock,
    'ideal_stock', iwp.ideal_stock,
    'locations', iwp.locations
  ) as details
from public.inventory_workspace_products iwp
where iwp.needs_attention

union all

select
  'location'::text as attention_type,
  iwla.location_id as entity_id,
  iwla.location_name as title,
  case
    when iwla.legacy_not_migrated
      then 'legacy_not_migrated'::text
    when p.id is not null
      and iwla.canonical_movement_rows = 0
      and iwla.current_recorded_units = 0
      and not exists(
        select 1
        from public.audit_events ae
        where ae.entity_type = 'location'
          and ae.entity_id = iwla.location_id
          and ae.action = 'inventory_zero_baseline_confirmed'
      )
      then 'needs_count_confirmation'::text
    else 'review'::text
  end as status,
  jsonb_build_object(
    'location_code', iwla.location_code,
    'legacy_rows', iwla.legacy_rows,
    'last_legacy_activity', iwla.last_legacy_activity,
    'current_recorded_units', iwla.current_recorded_units,
    'canonical_movement_rows', iwla.canonical_movement_rows,
    'partner_id', p.id,
    'partner_name', p.name
  ) as details
from public.inventory_workspace_legacy_location_activity iwla
left join public.partners p
  on p.linked_location_id = iwla.location_id
 and coalesce(p.active,true) = true
 and p.partner_type <> 'supplier'
where
  iwla.legacy_not_migrated
  or (
    p.id is not null
    and iwla.canonical_movement_rows = 0
    and iwla.current_recorded_units = 0
    and not exists(
      select 1
      from public.audit_events ae
      where ae.entity_type = 'location'
        and ae.entity_id = iwla.location_id
        and ae.action = 'inventory_zero_baseline_confirmed'
    )
  );

create or replace function public.central_daily_priorities_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_tasks jsonb := '[]'::jsonb;
  v_conversations jsonb := '[]'::jsonb;
  v_radar jsonb := '[]'::jsonb;
  v_inventory jsonb := '[]'::jsonb;
  v_partners jsonb := jsonb_build_object(
    'summary',
    jsonb_build_object(
      'ready',0,
      'attention',0,
      'total',0
    ),
    'items',
    '[]'::jsonb
  );
  v_integrations jsonb := '[]'::jsonb;
  v_task_count integer := 0;
  v_conversation_count integer := 0;
  v_radar_count integer := 0;
  v_inventory_count integer := 0;
  v_partner_attention integer := 0;
  v_integration_attention integer := 0;
begin
  if not (
    public.central_can_access_scope('company')
    or public.current_user_role() = 'admin'
  ) then
    raise exception 'Acesso negado';
  end if;

  select count(*)::integer
  into v_task_count
  from public.operational_tasks t
  where t.status in ('planned','pending')
    and public.central_can_access_scope(t.operation_scope)
    and t.category in ('task','supplier','other')
    and (
      t.due_at < now()
      or t.priority in ('urgent','attention')
    );

  select coalesce(
    jsonb_agg(
      to_jsonb(x)
      order by x.sort_rank, x.due_at
    ),
    '[]'::jsonb
  )
  into v_tasks
  from (
    select
      t.id,
      t.title,
      t.category,
      t.due_at,
      t.priority,
      t.status,
      t.operation_scope,
      t.central_contact_id,
      c.display_name as contact_name,
      coalesce(
        p.full_name,
        p.email
      ) as assigned_name,
      case
        when t.due_at < now()
          then 0
        when (
          t.due_at at time zone 'America/Sao_Paulo'
        )::date = (
          now() at time zone 'America/Sao_Paulo'
        )::date
          then 1
        else 2
      end as sort_rank
    from public.operational_tasks t
    left join public.central_contacts c
      on c.id = t.central_contact_id
    left join public.profiles p
      on p.id = t.assigned_to
    where t.status in ('planned','pending')
      and public.central_can_access_scope(t.operation_scope)
      and t.category in ('task','supplier','other')
      and (
        t.due_at < now()
        or t.priority in ('urgent','attention')
      )
    order by sort_rank, t.due_at
    limit 30
  ) x;

  v_conversations := '[]'::jsonb;
  v_conversation_count := 0;

  -- CRM, recompra, leads e retornos comerciais ficam nas operações.
  v_radar := '[]'::jsonb;
  v_radar_count := 0;

  if public.can_access_operation('supplements') then
    select count(*)::integer
    into v_inventory_count
    from public.inventory_workspace_attention;

    select coalesce(
      jsonb_agg(
        to_jsonb(x)
        order by x.status, x.title
      ),
      '[]'::jsonb
    )
    into v_inventory
    from (
      select
        attention_type,
        entity_id,
        title,
        status,
        details
      from public.inventory_workspace_attention
      order by status, title
      limit 30
    ) x;
  end if;

  if (
    public.can_manage_users()
    or public.current_user_role() = 'admin'
  ) then
    v_partners :=
      public.partner_portal_health_snapshot();

    v_partner_attention :=
      coalesce(
        (
          v_partners
            -> 'summary'
            ->> 'attention'
        )::integer,
        0
      );

    select
      coalesce(
        jsonb_agg(
          to_jsonb(x)
          order by
            x.health_status,
            x.provider
        ),
        '[]'::jsonb
      ),
      count(*) filter(
        where health_status not in(
          'healthy',
          'connected'
        )
      )::integer
    into
      v_integrations,
      v_integration_attention
    from (
      select
        provider,
        operation_scope,
        account_name,
        status,
        last_sync_at,
        last_error,
        health_status,
        failed_events,
        pending_events
      from public.central_integration_health
      where lower(
        coalesce(
          account_name,
          ''
        )
      ) not like '%teste%'
    ) x;
  end if;

  return jsonb_build_object(
    'generated_at',
    now(),
    'summary',
    jsonb_build_object(
      'tasks',
      v_task_count,
      'conversations',
      v_conversation_count,
      'radar',
      v_radar_count,
      'inventory',
      v_inventory_count,
      'partner_attention',
      v_partner_attention,
      'integration_attention',
      v_integration_attention,
      'total',
      v_task_count
        + v_inventory_count
        + v_partner_attention
        + v_integration_attention
    ),
    'tasks',
    v_tasks,
    'conversations',
    v_conversations,
    'radar',
    v_radar,
    'inventory',
    v_inventory,
    'partners',
    v_partners,
    'integrations',
    v_integrations
  );
end;
$function$;

commit;
