-- NÃO EXECUTAR SEM APROVAÇÃO EXPLÍCITA.
--
-- Instala a estrutura de controle/rollback e os destinos públicos que ainda
-- não existem. Este arquivo não chama a promoção e não contém dados reais.
-- Quando aprovado, deve ser executado inteiro em uma única transação.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- A execução continua aprovada depois de promovida; o estado operacional fica
-- também registrado em promotion_runs.
alter table appsheet_import.import_runs
  drop constraint if exists import_approval_consistency;
alter table appsheet_import.import_runs
  add constraint import_approval_consistency check (
    (not final_import_approved and approved_at is null and approved_by is null)
    or (
      final_import_approved
      and status in ('approved', 'promoted')
      and approved_at is not null
      and approved_by is not null
    )
  );

-- Controle privado -----------------------------------------------------------

create table if not exists appsheet_import.promotion_runs (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references appsheet_import.import_runs(id) on delete restrict,
  status text not null default 'running'
    check (status in ('running', 'completed', 'rolled_back')),
  approved_by uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  rolled_back_at timestamptz,
  rollback_reason text,
  pre_counts jsonb not null default '{}'::jsonb check (jsonb_typeof(pre_counts) = 'object'),
  post_counts jsonb not null default '{}'::jsonb check (jsonb_typeof(post_counts) = 'object'),
  reconciliation jsonb not null default '{}'::jsonb check (jsonb_typeof(reconciliation) = 'object'),
  constraint promotion_run_timestamps check (
    (status = 'running' and completed_at is null and rolled_back_at is null)
    or (status = 'completed' and completed_at is not null and rolled_back_at is null)
    or (status = 'rolled_back' and completed_at is not null and rolled_back_at is not null)
  )
);

create unique index if not exists promotion_runs_one_active_per_import
  on appsheet_import.promotion_runs(import_run_id)
  where status in ('running', 'completed');

create table if not exists appsheet_import.entity_links (
  id bigint generated always as identity primary key,
  promotion_run_id uuid not null references appsheet_import.promotion_runs(id) on delete cascade,
  import_run_id uuid not null references appsheet_import.import_runs(id) on delete restrict,
  entity_type text not null,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  source_subkey text not null default '0',
  target_subkey text not null default '0',
  original_id text,
  imported_at timestamptz not null,
  target_schema text not null default 'public',
  target_table text not null,
  target_id uuid,
  target_key jsonb not null default '{}'::jsonb check (jsonb_typeof(target_key) = 'object'),
  action text not null check (action in ('inserted', 'matched', 'adjusted', 'deferred')),
  linked_at timestamptz not null default now(),
  unique (
    promotion_run_id, entity_type, source_sheet, source_row,
    source_subkey, target_subkey
  )
);

create index if not exists entity_links_target_idx
  on appsheet_import.entity_links(promotion_run_id, target_schema, target_table, target_id);
create index if not exists entity_links_source_idx
  on appsheet_import.entity_links(import_run_id, entity_type, source_sheet, source_row);

create table if not exists appsheet_import.promotion_preimages (
  id bigint generated always as identity primary key,
  promotion_run_id uuid not null references appsheet_import.promotion_runs(id) on delete cascade,
  target_schema text not null default 'public',
  target_table text not null,
  target_key jsonb not null check (jsonb_typeof(target_key) = 'object'),
  existed_before boolean not null,
  before_data jsonb,
  after_data jsonb,
  before_sha256 text,
  after_sha256 text,
  captured_at timestamptz not null default now(),
  unique (promotion_run_id, target_schema, target_table, target_key)
);

alter table appsheet_import.promotion_runs enable row level security;
alter table appsheet_import.promotion_runs force row level security;
alter table appsheet_import.entity_links enable row level security;
alter table appsheet_import.entity_links force row level security;
alter table appsheet_import.promotion_preimages enable row level security;
alter table appsheet_import.promotion_preimages force row level security;

revoke all on appsheet_import.promotion_runs from public, anon, authenticated;
revoke all on appsheet_import.entity_links from public, anon, authenticated;
revoke all on appsheet_import.promotion_preimages from public, anon, authenticated;
grant select, insert, update, delete on appsheet_import.promotion_runs to service_role;
grant select, insert, update, delete on appsheet_import.entity_links to service_role;
grant select, insert, update, delete on appsheet_import.promotion_preimages to service_role;
grant usage, select on all sequences in schema appsheet_import to service_role;

-- Destinos públicos ainda ausentes ------------------------------------------
-- Permanecem inacessíveis a anon/authenticated até uma revisão de frontend/RLS.

do $$
declare
  v_table text;
  v_missing_columns text[];
  v_expected_comment constant text :=
    'Managed by appsheet_import controlled promotion v1.';
begin
  foreach v_table in array array[
    'partners', 'supplier_orders', 'partner_movements',
    'payments', 'deliveries', 'inventory_history'
  ]
  loop
    if to_regclass(format('public.%I', v_table)) is not null then
      if obj_description(to_regclass(format('public.%I', v_table)), 'pg_class')
         is distinct from v_expected_comment then
        raise exception 'Tabela pública preexistente não gerenciada: public.%', v_table;
      end if;

      select array_agg(required_column)
      into v_missing_columns
      from unnest(array[
        'id', 'import_run_id', 'source_sheet',
        'source_row', 'original_id', 'imported_at'
      ]) as required(required_column)
      where not exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = v_table
          and c.column_name = required_column
      );

      if v_missing_columns is not null then
        raise exception 'Tabela pública preexistente incompatível: public.% (faltam: %)',
          v_table, array_to_string(v_missing_columns, ', ');
      end if;
    end if;
  end loop;
end;
$$;

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  partner_type text not null,
  city text,
  reference text,
  contact_name text,
  phone text,
  status text,
  start_date date,
  end_date date,
  partnership_model text,
  settlement_rule text,
  commission_pct numeric(7,4),
  active boolean,
  notes text,
  import_run_id uuid not null,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  original_id text,
  imported_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (import_run_id, source_sheet, source_row)
);
comment on table public.partners is
  'Managed by appsheet_import controlled promotion v1.';

create index if not exists partners_name_idx on public.partners(lower(name));

create table if not exists public.supplier_orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  supplier_id uuid references public.partners(id) on delete restrict,
  ordered_at timestamptz,
  quantity numeric not null check (quantity > 0),
  unit_cost numeric(12,2) check (unit_cost >= 0),
  reported_total numeric(12,2) check (reported_total >= 0),
  status text,
  stock_updated boolean,
  notes text,
  import_run_id uuid not null,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  original_id text,
  imported_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (import_run_id, source_sheet, source_row)
);
comment on table public.supplier_orders is
  'Managed by appsheet_import controlled promotion v1.';

create index if not exists supplier_orders_product_idx on public.supplier_orders(product_id);
create index if not exists supplier_orders_supplier_idx on public.supplier_orders(supplier_id);

create table if not exists public.partner_movements (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  movement_at timestamptz,
  movement_type text,
  quantity numeric not null check (quantity > 0),
  settlement_unit_price numeric(12,2),
  unit_cost numeric(12,2),
  settlement_status text,
  settled_at timestamptz,
  inventory_movement_original_id text,
  sale_original_id text,
  notes text,
  applied boolean,
  import_run_id uuid not null,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  original_id text,
  imported_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (import_run_id, source_sheet, source_row)
);
comment on table public.partner_movements is
  'Managed by appsheet_import controlled promotion v1.';

create index if not exists partner_movements_partner_idx on public.partner_movements(partner_id);
create index if not exists partner_movements_product_idx on public.partner_movements(product_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  status text,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  payment_method text,
  payment_condition text,
  paid_at timestamptz,
  import_run_id uuid not null,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  original_id text,
  imported_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (import_run_id, source_sheet, source_row),
  unique (sale_id)
);
comment on table public.payments is
  'Managed by appsheet_import controlled promotion v1.';

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  status text,
  delivered_at timestamptz,
  city text,
  reference text,
  import_run_id uuid not null,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  original_id text,
  imported_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (import_run_id, source_sheet, source_row),
  unique (sale_id)
);
comment on table public.deliveries is
  'Managed by appsheet_import controlled promotion v1.';

-- Arquivo histórico: preserva os 491 eventos sem reaplicá-los ao saldo atual.
-- O saldo oficial será alcançado por um único ajuste auditável por produto/local.
create table if not exists public.inventory_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  occurred_at timestamptz,
  movement_type text,
  quantity numeric not null,
  origin_code text,
  destination_code text,
  sale_original_id text,
  supplier_order_original_id text,
  partner_movement_original_id text,
  notes text,
  applied boolean,
  import_run_id uuid not null,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  original_id text,
  imported_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (import_run_id, source_sheet, source_row)
);
comment on table public.inventory_history is
  'Managed by appsheet_import controlled promotion v1.';

create index if not exists inventory_history_product_idx on public.inventory_history(product_id);
create index if not exists inventory_history_occurred_idx on public.inventory_history(occurred_at);

alter table public.partners enable row level security;
alter table public.partners force row level security;
alter table public.supplier_orders enable row level security;
alter table public.supplier_orders force row level security;
alter table public.partner_movements enable row level security;
alter table public.partner_movements force row level security;
alter table public.payments enable row level security;
alter table public.payments force row level security;
alter table public.deliveries enable row level security;
alter table public.deliveries force row level security;
alter table public.inventory_history enable row level security;
alter table public.inventory_history force row level security;

revoke all on public.partners from public, anon, authenticated;
revoke all on public.supplier_orders from public, anon, authenticated;
revoke all on public.partner_movements from public, anon, authenticated;
revoke all on public.payments from public, anon, authenticated;
revoke all on public.deliveries from public, anon, authenticated;
revoke all on public.inventory_history from public, anon, authenticated;

grant select, insert, update, delete on public.partners to service_role;
grant select, insert, update, delete on public.supplier_orders to service_role;
grant select, insert, update, delete on public.partner_movements to service_role;
grant select, insert, update, delete on public.payments to service_role;
grant select, insert, update, delete on public.deliveries to service_role;
grant select, insert, update, delete on public.inventory_history to service_role;

commit;
