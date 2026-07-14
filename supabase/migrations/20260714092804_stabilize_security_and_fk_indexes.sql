begin;

-- Desativa definitivamente o endpoint temporário usado apenas na carga inicial.
create or replace function public.stage_appsheet_import(
  p_token text,
  p_run jsonb,
  p_rows jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'Endpoint temporário de importação desativado após a promoção controlada';
end;
$$;

revoke all on function public.stage_appsheet_import(text, jsonb, jsonb)
  from public, anon, authenticated;

-- Remove acesso anônimo herdado de funções privilegiadas, mantendo somente
-- os acessos autenticados necessários ao aplicativo.
revoke execute on function public.apply_inventory_movement() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.refresh_sale_totals() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

revoke execute on function public.can_write() from public, anon;
revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.create_sale(public.sale_record_type, uuid, uuid, jsonb, text, text, text, text, text, text, boolean, text) from public, anon;
revoke execute on function public.cancel_sale(uuid, text) from public, anon;
revoke execute on function public.set_stock_count(uuid, uuid, integer, text, text) from public, anon;
revoke execute on function public.transfer_stock(uuid, uuid, uuid, integer, text, text) from public, anon;

grant execute on function public.can_write() to authenticated, service_role;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.create_sale(public.sale_record_type, uuid, uuid, jsonb, text, text, text, text, text, text, boolean, text) to authenticated, service_role;
grant execute on function public.cancel_sale(uuid, text) to authenticated, service_role;
grant execute on function public.set_stock_count(uuid, uuid, integer, text, text) to authenticated, service_role;
grant execute on function public.transfer_stock(uuid, uuid, uuid, integer, text, text) to authenticated, service_role;

-- Fixa o search_path da função de timestamp sem alterar sua lógica.
alter function public.set_updated_at() set search_path = pg_catalog, public;

-- Índices de cobertura para FKs apontadas pelo linter.
create index if not exists import_runs_approved_by_idx
  on appsheet_import.import_runs (approved_by);
create index if not exists promotion_runs_approved_by_idx
  on appsheet_import.promotion_runs (approved_by);
create index if not exists audit_events_created_by_idx
  on public.audit_events (created_by);
create index if not exists inventory_movements_created_by_idx
  on public.inventory_movements (created_by);
create index if not exists inventory_movements_location_id_idx
  on public.inventory_movements (location_id);
create index if not exists sales_created_by_idx
  on public.sales (created_by);
create index if not exists sales_location_id_idx
  on public.sales (location_id);
create index if not exists stock_balances_location_id_idx
  on public.stock_balances (location_id);

commit;
