create table if not exists public.bank_month_commitment_resolutions (
  id uuid primary key default gen_random_uuid(),
  commitment_key text not null,
  reference_month date not null,
  resolution text not null default 'paid',
  resolved_on date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (commitment_key, reference_month),
  check (reference_month = date_trunc('month', reference_month)::date),
  check (resolution in ('paid','dismissed'))
);

alter table public.bank_month_commitment_resolutions enable row level security;

drop policy if exists bank_month_commitment_resolutions_select on public.bank_month_commitment_resolutions;
create policy bank_month_commitment_resolutions_select on public.bank_month_commitment_resolutions
for select to authenticated using (public.can_access_bank());

drop policy if exists bank_month_commitment_resolutions_insert on public.bank_month_commitment_resolutions;
create policy bank_month_commitment_resolutions_insert on public.bank_month_commitment_resolutions
for insert to authenticated with check (public.can_write_bank());

drop policy if exists bank_month_commitment_resolutions_update on public.bank_month_commitment_resolutions;
create policy bank_month_commitment_resolutions_update on public.bank_month_commitment_resolutions
for update to authenticated using (public.can_write_bank()) with check (public.can_write_bank());

drop policy if exists bank_month_commitment_resolutions_delete on public.bank_month_commitment_resolutions;
create policy bank_month_commitment_resolutions_delete on public.bank_month_commitment_resolutions
for delete to authenticated using (public.can_write_bank());

grant select, insert, update, delete on public.bank_month_commitment_resolutions to authenticated;
