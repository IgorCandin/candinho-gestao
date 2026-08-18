-- Backend security hardening.
--
-- Scope:
--   * privileged functions that accidentally inherited EXECUTE from PUBLIC;
--   * authenticated internal views that were still running with owner rights.
--
-- Public storefront RPCs are intentionally left untouched. They already have
-- explicit grants to anon/authenticated and do not depend on PUBLIC inheritance.

do $migration$
declare
  v_function record;
begin
  for v_function in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
        where acl.grantee = 0
          and acl.privilege_type = 'EXECUTE'
      )
  loop
    execute format(
      'revoke execute on function %s from public',
      v_function.signature
    );
  end loop;
end
$migration$;

-- This worker is invoked by a trusted calendar integration. It previously
-- depended on the implicit PUBLIC grant, so preserve only the service role.
grant execute on function public.claim_google_calendar_sync_jobs(integer)
  to service_role;

-- Prevent newly-created functions owned by the migration role from becoming
-- public endpoints by accident. Public RPC migrations must grant explicitly.
alter default privileges in schema public
  revoke execute on functions from public;

alter view public.commercial_inbox_overview_v1
  set (security_invoker = true);
alter view public.customer_links_overview_v1
  set (security_invoker = true);
alter view public.customer_opportunity_radar_v3
  set (security_invoker = true);
alter view public.customer_pending_partner_links_v1
  set (security_invoker = true);
alter view public.customer_sales_next_best_action_v1
  set (security_invoker = true);
alter view public.customer_sales_opportunities_priority_v1
  set (security_invoker = true);
alter view public.customer_sales_opportunities_v1
  set (security_invoker = true);
alter view public.customer_sales_opportunity_summary_v1
  set (security_invoker = true);
alter view public.customer_sales_priority_summary_v1
  set (security_invoker = true);
alter view public.fitness_company_customer_directory_v1
  set (security_invoker = true);
alter view public.fitness_product_catalog
  set (security_invoker = true);
alter view public.fitness_product_catalog_v2
  set (security_invoker = true);
alter view public.fitness_quotes_overview
  set (security_invoker = true);
alter view public.fitness_sales_overview
  set (security_invoker = true);
alter view public.fitness_stock_operational
  set (security_invoker = true);
alter view public.fitness_stock_overview
  set (security_invoker = true);
alter view public.product_lead_history_overview
  set (security_invoker = true);
alter view public.product_recent_sales_overview
  set (security_invoker = true);
alter view public.product_sales_targets_v1
  set (security_invoker = true);
alter view public.product_supplier_order_history_overview
  set (security_invoker = true);
alter view public.replenishment_overview
  set (security_invoker = true);

do $verification$
declare
  v_public_privileged_count integer;
  v_insecure_view_count integer;
begin
  select count(*)::integer
  into v_public_privileged_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and exists (
      select 1
      from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      where acl.grantee = 0
        and acl.privilege_type = 'EXECUTE'
    );

  if v_public_privileged_count <> 0 then
    raise exception
      'Security verification failed: % privileged functions still granted to PUBLIC',
      v_public_privileged_count;
  end if;

  select count(*)::integer
  into v_insecure_view_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'v'
    and c.relname = any (array[
      'commercial_inbox_overview_v1',
      'customer_links_overview_v1',
      'customer_opportunity_radar_v3',
      'customer_pending_partner_links_v1',
      'customer_sales_next_best_action_v1',
      'customer_sales_opportunities_priority_v1',
      'customer_sales_opportunities_v1',
      'customer_sales_opportunity_summary_v1',
      'customer_sales_priority_summary_v1',
      'fitness_company_customer_directory_v1',
      'fitness_product_catalog',
      'fitness_product_catalog_v2',
      'fitness_quotes_overview',
      'fitness_sales_overview',
      'fitness_stock_operational',
      'fitness_stock_overview',
      'product_lead_history_overview',
      'product_recent_sales_overview',
      'product_sales_targets_v1',
      'product_supplier_order_history_overview',
      'replenishment_overview'
    ])
    and not coalesce(c.reloptions @> array['security_invoker=true'], false);

  if v_insecure_view_count <> 0 then
    raise exception
      'Security verification failed: % internal views still use owner rights',
      v_insecure_view_count;
  end if;

  if not has_function_privilege(
    'anon',
    'public.public_storefront_snapshot(integer)',
    'EXECUTE'
  ) or not has_function_privilege(
    'anon',
    'public.public_storefront_product_page_v1(text)',
    'EXECUTE'
  ) or not has_function_privilege(
    'anon',
    'public.public_create_catalog_lead_v2(text,text,uuid,text,text)',
    'EXECUTE'
  ) then
    raise exception 'Security verification failed: public storefront access was removed';
  end if;
end
$verification$;
