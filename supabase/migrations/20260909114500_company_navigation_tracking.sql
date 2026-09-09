create table if not exists public.company_navigation_escapes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  origin_route text not null,
  destination_route text not null,
  destination_operation text not null,
  viewport_class text not null default 'unknown',
  viewport_width integer,
  occurrence_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint company_navigation_escapes_operation_check check (destination_operation in ('suplementos','fitness')),
  constraint company_navigation_escapes_viewport_check check (viewport_class in ('mobile','tablet','desktop','unknown')),
  constraint company_navigation_escapes_count_check check (occurrence_count > 0),
  unique (user_id, fingerprint)
);

create index if not exists company_navigation_escapes_user_recent_idx
  on public.company_navigation_escapes(user_id,last_seen_at desc);

alter table public.company_navigation_escapes enable row level security;

drop policy if exists company_navigation_escapes_select_own on public.company_navigation_escapes;
create policy company_navigation_escapes_select_own
  on public.company_navigation_escapes for select to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.company_navigation_escapes to authenticated;

create or replace function public.record_company_navigation_escape_v1(
  p_origin_route text,
  p_destination_route text,
  p_viewport_class text default 'unknown',
  p_viewport_width integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_origin text := left(btrim(coalesce(p_origin_route,'')),320);
  v_destination text := left(btrim(coalesce(p_destination_route,'')),320);
  v_operation text;
  v_viewport text := lower(btrim(coalesce(p_viewport_class,'unknown')));
  v_fingerprint text;
  v_id uuid;
begin
  if v_user is null or not exists (
    select 1 from public.profiles p where p.id = v_user and p.active
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  if v_origin not like '/company/%' then
    raise exception 'Origem inválida';
  end if;

  v_operation := case
    when v_destination = '/suplementos' or v_destination like '/suplementos/%' then 'suplementos'
    when v_destination = '/fitness' or v_destination like '/fitness/%' then 'fitness'
    else null
  end;
  if v_operation is null then raise exception 'Destino inválido'; end if;
  if v_viewport not in ('mobile','tablet','desktop','unknown') then v_viewport := 'unknown'; end if;

  v_fingerprint := md5(v_origin || '|' || v_destination || '|' || v_viewport);
  insert into public.company_navigation_escapes(
    user_id,fingerprint,origin_route,destination_route,destination_operation,
    viewport_class,viewport_width
  ) values (
    v_user,v_fingerprint,v_origin,v_destination,v_operation,v_viewport,
    case when p_viewport_width between 1 and 10000 then p_viewport_width else null end
  )
  on conflict (user_id,fingerprint) do update set
    occurrence_count = public.company_navigation_escapes.occurrence_count + 1,
    last_seen_at = now(),
    viewport_width = excluded.viewport_width
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.record_company_navigation_escape_v1(text,text,text,integer) from public,anon;
grant execute on function public.record_company_navigation_escape_v1(text,text,text,integer) to authenticated;
