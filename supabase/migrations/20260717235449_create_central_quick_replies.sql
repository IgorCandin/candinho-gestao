create table if not exists public.central_quick_replies (
  id uuid primary key default gen_random_uuid(),
  operation_scope text not null default 'company' check (operation_scope in ('company','supplements','fitness','marketing')),
  title text not null,
  body text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.central_quick_replies enable row level security;
drop policy if exists central_quick_replies_select on public.central_quick_replies;
create policy central_quick_replies_select on public.central_quick_replies for select to authenticated using (public.central_can_access_scope(operation_scope));
drop policy if exists central_quick_replies_insert on public.central_quick_replies;
create policy central_quick_replies_insert on public.central_quick_replies for insert to authenticated with check (public.central_can_write_scope(operation_scope));
drop policy if exists central_quick_replies_update on public.central_quick_replies;
create policy central_quick_replies_update on public.central_quick_replies for update to authenticated using (public.central_can_write_scope(operation_scope)) with check (public.central_can_write_scope(operation_scope));
drop policy if exists central_quick_replies_delete on public.central_quick_replies;
create policy central_quick_replies_delete on public.central_quick_replies for delete to authenticated using (public.central_can_write_scope(operation_scope));
drop trigger if exists central_quick_replies_set_updated_at on public.central_quick_replies;
create trigger central_quick_replies_set_updated_at before update on public.central_quick_replies for each row execute function public.set_updated_at();
grant select,insert,update,delete on public.central_quick_replies to authenticated;
