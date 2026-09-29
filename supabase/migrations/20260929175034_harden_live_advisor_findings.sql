-- Corrige os quatro achados confirmados no Advisor do Supabase em 29/09/2026.
--
-- As tres views abaixo foram criadas/recriadas depois do hardening de agosto e
-- voltaram a executar com os privilegios do proprietario. security_invoker faz
-- com que respeitem as permissoes e politicas RLS do usuario que consulta.
--
-- defer_sale_acquisition_cost_v4545 e exclusivamente uma funcao de trigger.
-- Ela nao precisa ser um endpoint RPC para anonimos nem usuarios autenticados.

begin;

alter view public.purchase_planning_overview
  set (security_invoker = true);

alter view public.product_sales_category_intelligence
  set (security_invoker = true);

alter view public.replenishment_overview
  set (security_invoker = true);

revoke execute
on function public.defer_sale_acquisition_cost_v4545()
from public, anon, authenticated;

do $verification$
declare
  v_insecure_views integer;
begin
  select count(*)::integer
  into v_insecure_views
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'v'
    and c.relname = any (array[
      'purchase_planning_overview',
      'product_sales_category_intelligence',
      'replenishment_overview'
    ])
    and not coalesce(c.reloptions @> array['security_invoker=true'], false);

  if v_insecure_views <> 0 then
    raise exception
      'Security verification failed: % view(s) ainda executam com privilegios do proprietario',
      v_insecure_views;
  end if;

  if has_function_privilege(
    'anon',
    'public.defer_sale_acquisition_cost_v4545()',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.defer_sale_acquisition_cost_v4545()',
    'EXECUTE'
  ) then
    raise exception
      'Security verification failed: funcao interna de trigger ainda esta exposta pela API';
  end if;
end
$verification$;

comment on function public.defer_sale_acquisition_cost_v4545() is
'Trigger interno de custo de aquisicao. Nao e um endpoint RPC e nao deve ser executavel por anon/authenticated.';

commit;
