-- Canonical backend statuses: not_scheduled, planned, completed,
-- lost_contact and cancelled. User-facing labels remain a UI concern.

create or replace function public.normalize_post_sale_status_v1(p_status text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_status text := lower(btrim(coalesce(p_status, '')));
begin
  return case
    when v_status = '' then 'not_scheduled'
    when v_status in ('planned', 'agendado') then 'planned'
    when v_status in ('completed', 'concluído', 'concluido') then 'completed'
    when v_status in ('contato perdido', 'lost_contact') then 'lost_contact'
    when v_status in ('cancelled', 'cancelado') then 'cancelled'
    else null
  end;
end;
$$;

revoke all on function public.normalize_post_sale_status_v1(text)
from public, anon, authenticated;

create or replace function public.enforce_post_sale_status_v1()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_normalized text;
begin
  if nullif(btrim(coalesce(new.post_sale_status, '')), '') is null then
    new.post_sale_status := case
      when new.post_sale_due_at is null then 'not_scheduled'
      else 'planned'
    end;
    return new;
  end if;

  v_normalized := public.normalize_post_sale_status_v1(new.post_sale_status);
  if v_normalized is null then
    raise exception 'Status de pós-venda inválido: %', new.post_sale_status;
  end if;

  new.post_sale_status := v_normalized;
  return new;
end;
$$;

revoke all on function public.enforce_post_sale_status_v1()
from public, anon, authenticated;

insert into public.audit_events(entity_type, entity_id, action, details)
select
  'sale',
  s.id,
  'post_sale_status_normalized',
  jsonb_build_object(
    'post_sale_status_before', s.post_sale_status,
    'post_sale_due_at', s.post_sale_due_at,
    'migration', '20260818022422_normalize_post_sale_statuses'
  )
from public.sales s
where s.post_sale_status is distinct from case
  when nullif(btrim(coalesce(s.post_sale_status, '')), '') is null
    then case when s.post_sale_due_at is null then 'not_scheduled' else 'planned' end
  else public.normalize_post_sale_status_v1(s.post_sale_status)
end;

update public.sales s
set post_sale_status = case
  when nullif(btrim(coalesce(s.post_sale_status, '')), '') is null
    then case when s.post_sale_due_at is null then 'not_scheduled' else 'planned' end
  else public.normalize_post_sale_status_v1(s.post_sale_status)
end;

alter table public.sales
  drop constraint if exists sales_post_sale_status_official;

alter table public.sales
  add constraint sales_post_sale_status_official
  check (post_sale_status in (
    'not_scheduled', 'planned', 'completed', 'lost_contact', 'cancelled'
  ))
  not valid;

alter table public.sales
  validate constraint sales_post_sale_status_official;

drop trigger if exists enforce_post_sale_status_v1 on public.sales;

create trigger enforce_post_sale_status_v1
before insert or update of post_sale_status, post_sale_due_at
on public.sales
for each row
execute function public.enforce_post_sale_status_v1();

create or replace function public.post_sale_status_is_open(p_status text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select public.normalize_post_sale_status_v1(p_status) = 'planned';
$$;

revoke all on function public.post_sale_status_is_open(text)
from public, anon, authenticated;

do $verification$
begin
  if exists (
    select 1
    from public.sales
    where post_sale_status not in (
      'not_scheduled', 'planned', 'completed', 'lost_contact', 'cancelled'
    )
  ) then
    raise exception 'Post-sale status verification failed';
  end if;
end
$verification$;
