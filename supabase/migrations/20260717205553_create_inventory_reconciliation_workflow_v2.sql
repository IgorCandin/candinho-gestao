create table if not exists public.inventory_reconciliation_reviews (
  id uuid primary key default gen_random_uuid(),
  attention_type text not null check (attention_type in ('product','location')),
  entity_id uuid not null,
  issue_code text not null,
  review_status text not null default 'open' check (review_status in ('open','reviewing','resolved')),
  notes text,
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(attention_type, entity_id, issue_code)
);
create index if not exists inventory_reconciliation_reviews_status_idx on public.inventory_reconciliation_reviews(review_status, updated_at desc);
create index if not exists inventory_reconciliation_reviews_entity_idx on public.inventory_reconciliation_reviews(attention_type, entity_id);
alter table public.inventory_reconciliation_reviews enable row level security;
drop policy if exists inventory_reconciliation_reviews_read on public.inventory_reconciliation_reviews;
create policy inventory_reconciliation_reviews_read on public.inventory_reconciliation_reviews for select to authenticated using (public.can_access_operation('supplements'));
drop policy if exists inventory_reconciliation_reviews_write on public.inventory_reconciliation_reviews;
create policy inventory_reconciliation_reviews_write on public.inventory_reconciliation_reviews for all to authenticated using (public.can_write()) with check (public.can_write());
grant select,insert,update on public.inventory_reconciliation_reviews to authenticated;

create or replace function public.inventory_reconciliation_snapshot() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_items jsonb; v_history jsonb; v_open integer:=0; v_reviewing integer:=0; v_resolved integer:=0;
begin
  if not public.can_access_operation('supplements') then raise exception 'Acesso negado'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.attention_type desc,x.title),'[]'::jsonb) into v_items from (
    select a.attention_type,a.entity_id,a.title,a.status as issue_code,a.details,coalesce(r.review_status,'open') as review_status,r.notes as review_notes,r.updated_at as review_updated_at,r.resolved_at,r.resolved_by
    from public.inventory_workspace_attention a left join public.inventory_reconciliation_reviews r on r.attention_type=a.attention_type and r.entity_id=a.entity_id and r.issue_code=a.status
  ) x;
  select count(*) filter(where coalesce(r.review_status,'open')='open')::integer,count(*) filter(where r.review_status='reviewing')::integer,count(*) filter(where r.review_status='resolved')::integer
  into v_open,v_reviewing,v_resolved from public.inventory_workspace_attention a left join public.inventory_reconciliation_reviews r on r.attention_type=a.attention_type and r.entity_id=a.entity_id and r.issue_code=a.status;
  select coalesce(jsonb_agg(to_jsonb(h) order by h.updated_at desc),'[]'::jsonb) into v_history from (
    select r.id,r.attention_type,r.entity_id,r.issue_code,r.review_status,r.notes,r.resolved_at,r.updated_at,p.full_name as resolved_by_name
    from public.inventory_reconciliation_reviews r left join public.profiles p on p.id=r.resolved_by where r.review_status='resolved' order by r.updated_at desc limit 150
  ) h;
  return jsonb_build_object('summary',jsonb_build_object('open',coalesce(v_open,0),'reviewing',coalesce(v_reviewing,0),'resolved_current',coalesce(v_resolved,0),'total_current',coalesce(v_open,0)+coalesce(v_reviewing,0)+coalesce(v_resolved,0)),'items',v_items,'history',v_history);
end;$$;
revoke all on function public.inventory_reconciliation_snapshot() from public,anon;
grant execute on function public.inventory_reconciliation_snapshot() to authenticated;

create or replace function public.inventory_reconciliation_set_status(p_attention_type text,p_entity_id uuid,p_issue_code text,p_status text,p_notes text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not public.can_write() then raise exception 'Acesso negado'; end if;
  if p_attention_type not in ('product','location') then raise exception 'Tipo inválido'; end if;
  if p_status not in ('open','reviewing','resolved') then raise exception 'Status inválido'; end if;
  if not exists(select 1 from public.inventory_workspace_attention a where a.attention_type=p_attention_type and a.entity_id=p_entity_id and a.status=p_issue_code)
     and not exists(select 1 from public.inventory_reconciliation_reviews r where r.attention_type=p_attention_type and r.entity_id=p_entity_id and r.issue_code=p_issue_code) then raise exception 'Pendência de reconciliação não encontrada'; end if;
  insert into public.inventory_reconciliation_reviews(attention_type,entity_id,issue_code,review_status,notes,last_seen_at,resolved_at,resolved_by,updated_by)
  values(p_attention_type,p_entity_id,p_issue_code,p_status,nullif(btrim(p_notes),''),now(),case when p_status='resolved' then now() else null end,case when p_status='resolved' then auth.uid() else null end,auth.uid())
  on conflict(attention_type,entity_id,issue_code) do update set review_status=excluded.review_status,notes=coalesce(excluded.notes,public.inventory_reconciliation_reviews.notes),last_seen_at=now(),resolved_at=case when excluded.review_status='resolved' then now() else null end,resolved_by=case when excluded.review_status='resolved' then auth.uid() else null end,updated_by=auth.uid(),updated_at=now() returning id into v_id;
  insert into public.audit_events(entity_type,entity_id,action,details,created_by) values('inventory_reconciliation',p_entity_id,'status_changed',jsonb_build_object('attention_type',p_attention_type,'issue_code',p_issue_code,'status',p_status,'notes',nullif(btrim(p_notes),'')),auth.uid());
  return v_id;
end;$$;
revoke all on function public.inventory_reconciliation_set_status(text,uuid,text,text,text) from public,anon;
grant execute on function public.inventory_reconciliation_set_status(text,uuid,text,text,text) to authenticated;
