begin;

create or replace function public.audit_central_integration_changes()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op='UPDATE'
     and new.provider
       is not distinct from old.provider
     and new.operation_scope
       is not distinct from old.operation_scope
     and new.account_external_id
       is not distinct from old.account_external_id
     and new.account_name
       is not distinct from old.account_name
     and new.status
       is not distinct from old.status
     and new.last_error
       is not distinct from old.last_error
  then
    return new;
  end if;

  insert into public.audit_events(
    entity_type,
    entity_id,
    action,
    details,
    created_by
  )
  values (
    'central_integration',
    coalesce(
      new.id,
      old.id
    ),
    lower(tg_op),
    case tg_op
      when 'DELETE'
      then jsonb_build_object(
        'provider',
          old.provider,
        'operation_scope',
          old.operation_scope,
        'account_external_id',
          old.account_external_id,
        'account_name',
          old.account_name,
        'status',
          old.status
      )
      else jsonb_build_object(
        'provider',
          new.provider,
        'operation_scope',
          new.operation_scope,
        'account_external_id',
          new.account_external_id,
        'account_name',
          new.account_name,
        'status',
          new.status,
        'previous_status',
          case
            when tg_op='UPDATE'
              then old.status
            else null
          end,
        'last_error',
          new.last_error
      )
    end,
    coalesce(
      auth.uid(),
      new.created_by,
      old.created_by
    )
  );

  return coalesce(
    new,
    old
  );
end;
$function$;

commit;
