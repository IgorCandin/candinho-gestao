-- Gestão de parceiros, metas, recompensas, acertos e atribuição de vendas.

alter table public.partners
  alter column import_run_id drop not null,
  alter column source_sheet drop not null,
  alter column source_row drop not null,
  alter column imported_at drop not null;

alter table public.partners
  add column if not exists linked_location_id uuid references public.locations(id) on delete set null,
  add column if not exists reward_type text not null default 'manual',
  add column if not exists target_sales integer,
  add column if not exists reward_value numeric(12,2) not null default 0,
  add column if not exists reward_description text,
  add column if not exists settlement_frequency text not null default 'manual',
  add column if not exists settlement_day integer,
  add column if not exists coupon_code text,
  add column if not exists counts_only_delivered boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.partners add constraint partners_reward_type_check
    check (reward_type in ('gift_per_sales','fixed_per_sale','percentage','manual','none'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.partners add constraint partners_target_sales_check
    check (target_sales is null or target_sales > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.partners add constraint partners_reward_value_check
    check (reward_value >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.partners add constraint partners_settlement_frequency_check
    check (settlement_frequency in ('on_target','monthly','manual','none'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.partners add constraint partners_settlement_day_check
    check (settlement_day is null or settlement_day between 1 and 31);
exception when duplicate_object then null; end $$;

create index if not exists partners_linked_location_id_idx on public.partners(linked_location_id);
create index if not exists partners_active_type_idx on public.partners(active, partner_type);

create table if not exists public.partnership_settlements (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  settled_on date not null,
  period_start date not null,
  period_end date not null,
  sale_count integer not null default 0 check (sale_count >= 0),
  gross_sales numeric(12,2) not null default 0 check (gross_sales >= 0),
  gross_profit numeric(12,2) not null default 0,
  reward_units integer not null default 0 check (reward_units >= 0),
  reward_amount numeric(12,2) not null default 0 check (reward_amount >= 0),
  reward_description text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create index if not exists partnership_settlements_partner_period_idx
  on public.partnership_settlements(partner_id, period_end desc);

alter table public.partnership_settlements enable row level security;
drop policy if exists partnership_settlements_read on public.partnership_settlements;
create policy partnership_settlements_read on public.partnership_settlements
  for select to authenticated using (true);
revoke all on public.partnership_settlements from public, anon;
grant select on public.partnership_settlements to authenticated;
grant all on public.partnership_settlements to service_role;

-- Normaliza os parceiros conhecidos e conecta cada um ao ponto físico equivalente.
update public.partners p
set linked_location_id = l.id,
    reward_type = 'gift_per_sales',
    target_sales = 10,
    reward_value = 0,
    reward_description = '1 suplemento à escolha do parceiro',
    settlement_frequency = 'on_target',
    counts_only_delivered = true,
    updated_at = now()
from public.locations l
where p.name = 'C.T.S. Pâmella Nunes' and l.code = 'CTS';

update public.partners p
set linked_location_id = l.id,
    reward_type = 'manual',
    reward_description = 'Acerto pelo valor de repasse combinado',
    settlement_frequency = 'monthly',
    settlement_day = 8,
    counts_only_delivered = true,
    updated_at = now()
from public.locations l
where p.name = 'Drogaria ItaPharma' and l.code = 'ITAPHARMA';

update public.partners p
set linked_location_id = l.id,
    reward_type = 'fixed_per_sale',
    reward_value = 20,
    reward_description = 'R$ 20 por venda entregue pela Ingrid',
    settlement_frequency = 'manual',
    counts_only_delivered = true,
    updated_at = now()
from public.locations l
where p.name = 'Ingrid Candinho' and l.code = 'INGRID';

update public.partners p
set linked_location_id = l.id,
    reward_type = 'none',
    reward_description = 'Parceria sem acerto financeiro',
    settlement_frequency = 'none',
    counts_only_delivered = true,
    updated_at = now()
from public.locations l
where p.name = 'Mini Mercearia do Batista' and l.code = 'ADRIANA';

update public.partners p
set linked_location_id = l.id,
    reward_type = 'none',
    reward_description = 'Divulgação sem comissão',
    settlement_frequency = 'none',
    coupon_code = coalesce(p.coupon_code, 'ENRICO10'),
    counts_only_delivered = true,
    updated_at = now()
from public.locations l
where p.name = 'Enrico Manfio' and l.code = 'ENRICO';

-- Vendas antigas marcadas como parceria e originadas em um ponto inequivocamente
-- ligado a um parceiro recebem o vínculo. Vendas antigas do estoque central ficam
-- sem atribuição para revisão manual, evitando associação incorreta.
update public.sales s
set partner_id = p.id,
    partnership = p.name,
    updated_at = now()
from public.partners p
where s.partner_id is null
  and lower(coalesce(s.partnership,'')) = 'true'
  and p.linked_location_id = s.location_id
  and exists (
    select 1 from public.locations l
    where l.id = s.location_id and l.code in ('CTS','ITAPHARMA','INGRID','ADRIANA','ENRICO')
  );
