create table if not exists public.nexus_user_shortcuts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  href text not null,
  operation_scope text not null,
  context_route text not null default '*',
  source text not null default 'manual',
  sort_order integer not null default 100,
  use_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nexus_user_shortcuts_operation_check check (
    operation_scope in ('company','central','supplements','fitness','bank','marketing','physique')
  ),
  constraint nexus_user_shortcuts_source_check check (
    source in ('manual','learned','workflow','command')
  ),
  constraint nexus_user_shortcuts_href_check check (
    href like '/%' and length(href) <= 320 and position(':id' in href)=0
  ),
  constraint nexus_user_shortcuts_context_check check (
    context_route='*' or (context_route like '/%' and length(context_route) <= 320)
  ),
  unique(user_id,context_route,href)
);

create index if not exists nexus_user_shortcuts_user_context_idx
  on public.nexus_user_shortcuts(user_id,context_route,sort_order,created_at);

alter table public.nexus_user_shortcuts enable row level security;

drop policy if exists nexus_user_shortcuts_select_own on public.nexus_user_shortcuts;
create policy nexus_user_shortcuts_select_own
  on public.nexus_user_shortcuts
  for select to authenticated
  using (user_id=auth.uid());

drop policy if exists nexus_user_shortcuts_insert_own on public.nexus_user_shortcuts;
create policy nexus_user_shortcuts_insert_own
  on public.nexus_user_shortcuts
  for insert to authenticated
  with check (user_id=auth.uid());

drop policy if exists nexus_user_shortcuts_update_own on public.nexus_user_shortcuts;
create policy nexus_user_shortcuts_update_own
  on public.nexus_user_shortcuts
  for update to authenticated
  using (user_id=auth.uid())
  with check (user_id=auth.uid());

drop policy if exists nexus_user_shortcuts_delete_own on public.nexus_user_shortcuts;
create policy nexus_user_shortcuts_delete_own
  on public.nexus_user_shortcuts
  for delete to authenticated
  using (user_id=auth.uid());

grant select on public.nexus_user_shortcuts to authenticated;

create or replace function public.nexus_shortcut_scope_allowed_v1(p_scope text)
returns boolean
language sql
stable
security definer
set search_path='public'
as $$
  select coalesce((
    select p.active and p.role::text <> 'partner' and
      case p_scope
        when 'company' then true
        when 'central' then (
          p.role::text='admin' or p.can_manage_users or p.can_access_supplements or
          p.can_access_fitness or p.can_access_marketing
        )
        when 'supplements' then (p.role::text='admin' or p.can_access_supplements)
        when 'fitness' then (p.role::text='admin' or p.can_access_fitness)
        when 'bank' then (p.role::text='admin' or p.can_access_bank)
        when 'marketing' then (p.role::text='admin' or p.can_access_marketing)
        when 'physique' then (p.role::text='admin' or p.can_manage_users)
        else false
      end
    from public.profiles p
    where p.id=auth.uid()
  ),false);
$$;

revoke all on function public.nexus_shortcut_scope_allowed_v1(text) from public;
grant execute on function public.nexus_shortcut_scope_allowed_v1(text) to authenticated;

create or replace function public.nexus_pin_shortcut_v1(
  p_href text,
  p_label text,
  p_operation_scope text,
  p_context_route text default '*',
  p_source text default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_href text := left(btrim(coalesce(p_href,'')),320);
  v_label text := left(btrim(coalesce(p_label,'')),120);
  v_scope text := lower(btrim(coalesce(p_operation_scope,'')));
  v_source text := lower(btrim(coalesce(p_source,'manual')));
  v_context text;
  v_count integer;
  v_order integer;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;

  if v_href='' or left(v_href,1)<>'/' or position(':id' in v_href)>0 then
    raise exception 'Atalho inválido';
  end if;

  if v_label='' then v_label := 'Atalho'; end if;

  if v_source not in ('manual','learned','workflow','command') then
    v_source := 'manual';
  end if;

  if not public.nexus_shortcut_scope_allowed_v1(v_scope) then
    raise exception 'Sem acesso a esta operação' using errcode='42501';
  end if;

  if coalesce(nullif(btrim(p_context_route),''),'*')='*' then
    v_context := '*';
  else
    v_context := public.normalize_nexus_route_v1(p_context_route);
  end if;

  if exists (
    select 1 from public.nexus_user_shortcuts
    where user_id=v_user and context_route=v_context and href=v_href
  ) then
    update public.nexus_user_shortcuts
      set label=v_label, operation_scope=v_scope, source=v_source, updated_at=now()
    where user_id=v_user and context_route=v_context and href=v_href
    returning id into v_id;
    return v_id;
  end if;

  select count(*)::integer, coalesce(max(sort_order),0)+10
    into v_count,v_order
  from public.nexus_user_shortcuts
  where user_id=v_user and context_route=v_context;

  if v_count >= 12 then
    raise exception 'Limite de 12 atalhos neste contexto atingido';
  end if;

  insert into public.nexus_user_shortcuts(
    user_id,label,href,operation_scope,context_route,source,sort_order
  ) values (
    v_user,v_label,v_href,v_scope,v_context,v_source,v_order
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.nexus_pin_shortcut_v1(text,text,text,text,text) to authenticated;

create or replace function public.nexus_unpin_shortcut_v1(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_deleted integer;
begin
  if v_user is null then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;

  delete from public.nexus_user_shortcuts
  where id=p_id and user_id=v_user;

  get diagnostics v_deleted = row_count;
  return v_deleted>0;
end;
$$;

grant execute on function public.nexus_unpin_shortcut_v1(uuid) to authenticated;

create or replace function public.nexus_record_shortcut_use_v1(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_updated integer;
begin
  if v_user is null then return false; end if;

  update public.nexus_user_shortcuts
    set use_count=use_count+1,last_used_at=now(),updated_at=now()
  where id=p_id and user_id=v_user;

  get diagnostics v_updated = row_count;
  return v_updated>0;
end;
$$;

grant execute on function public.nexus_record_shortcut_use_v1(uuid) to authenticated;

create or replace function public.nexus_personal_workspace_v1(p_route text default '/dashboard')
returns jsonb
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_user uuid := auth.uid();
  v_route text;
  v_pinned jsonb := '[]'::jsonb;
  v_suggested jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_total_pins integer := 0;
  v_context_pins integer := 0;
begin
  if v_user is null then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;

  v_route := public.normalize_nexus_route_v1(coalesce(p_route,'/dashboard'));

  with ranked as (
    select s.*,
      case when s.context_route=v_route then 0 else 1 end as context_rank,
      row_number() over(
        partition by s.href
        order by case when s.context_route=v_route then 0 else 1 end,
                 s.sort_order,s.updated_at desc
      ) as href_rank
    from public.nexus_user_shortcuts s
    where s.user_id=v_user and s.context_route in ('*',v_route)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'label',label,'href',href,'operation_scope',operation_scope,
    'context_route',context_route,'source',source,'sort_order',sort_order,
    'use_count',use_count,'last_used_at',last_used_at
  ) order by context_rank,sort_order,coalesce(last_used_at,created_at) desc),'[]'::jsonb)
  into v_pinned
  from ranked
  where href_rank=1;

  with contextual as (
    select e.target_route as href,max(e.operation_scope) as operation_scope,
      count(*)::integer as hits,
      count(distinct (e.created_at at time zone 'America/Sao_Paulo')::date)::integer as days,
      max(e.created_at) as last_seen,100+count(*)*8 as score,'context'::text as source
    from public.nexus_activity_events e
    where e.user_id=v_user and e.action_kind='navigation_click'
      and e.route=v_route and e.target_route is not null and e.target_route<>v_route
      and e.created_at>=now()-interval '30 days' and position(':id' in e.target_route)=0
    group by e.target_route
  ), usage as (
    select e.route as href,max(e.operation_scope) as operation_scope,
      count(*)::integer as hits,
      count(distinct (e.created_at at time zone 'America/Sao_Paulo')::date)::integer as days,
      max(e.created_at) as last_seen,
      count(*)*3+count(distinct (e.created_at at time zone 'America/Sao_Paulo')::date)*5 as score,
      'usage'::text as source
    from public.nexus_activity_events e
    where e.user_id=v_user and e.action_kind='page_view'
      and e.created_at>=now()-interval '30 days' and e.route<>v_route
      and position(':id' in e.route)=0
    group by e.route
  ), merged as (
    select href,max(operation_scope) as operation_scope,sum(hits)::integer as hits,
      max(days)::integer as days,max(last_seen) as last_seen,sum(score)::integer as score,
      case when bool_or(source='context') then 'context' else 'usage' end as source
    from (select * from contextual union all select * from usage) x
    group by href
  ), filtered as (
    select m.* from merged m
    where m.href is not null and left(m.href,1)='/' and m.href<>v_route
      and not exists (
        select 1 from public.nexus_user_shortcuts s
        where s.user_id=v_user and s.href=m.href and s.context_route in ('*',v_route)
      )
    order by m.score desc,m.last_seen desc
    limit 8
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'href',href,'operation_scope',coalesce(operation_scope,'company'),
    'source',source,'hits',hits,'distinct_days',days,'last_seen_at',last_seen,
    'score',score,'reason',case when source='context'
      then 'Você costuma abrir esta tela a partir daqui.'
      else 'Uma das telas que você mais usa no ERP.' end
  ) order by score desc,last_seen desc),'[]'::jsonb)
  into v_suggested
  from filtered;

  with recent_ranked as (
    select e.route as href,max(e.operation_scope) as operation_scope,
      max(e.created_at) as last_seen_at,
      row_number() over(partition by e.route order by max(e.created_at) desc) as rn
    from public.nexus_activity_events e
    where e.user_id=v_user and e.action_kind='page_view'
      and e.created_at>=now()-interval '14 days' and e.route<>v_route
      and position(':id' in e.route)=0
    group by e.route
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'href',href,'operation_scope',coalesce(operation_scope,'company'),'last_seen_at',last_seen_at
  ) order by last_seen_at desc),'[]'::jsonb)
  into v_recent
  from (
    select href,operation_scope,last_seen_at
    from recent_ranked where rn=1 order by last_seen_at desc limit 6
  ) r;

  select count(*)::integer,count(*) filter(where context_route=v_route)::integer
    into v_total_pins,v_context_pins
  from public.nexus_user_shortcuts
  where user_id=v_user;

  return jsonb_build_object(
    'generated_at',now(),'route',v_route,'pinned',v_pinned,'suggested',v_suggested,
    'recent',v_recent,'stats',jsonb_build_object(
      'total_pins',coalesce(v_total_pins,0),'context_pins',coalesce(v_context_pins,0),
      'suggestion_count',jsonb_array_length(v_suggested),'recent_count',jsonb_array_length(v_recent)
    )
  );
end;
$$;

grant execute on function public.nexus_personal_workspace_v1(text) to authenticated;
