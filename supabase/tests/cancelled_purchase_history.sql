-- Run after the migration. Entire-database checks, no real-data mutations.
do $verify$
declare mismatches integer;
begin
  with expected as (
    select m.batch_id,count(*)::integer sale_count,sum(s.total_amount)::numeric(12,2) total_amount
    from public.post_sale_batch_sales m join public.sales s on s.id=m.sale_id
    where s.record_type='sale' and s.general_status<>'cancelled'
    group by m.batch_id
  )
  select count(*) into mismatches
  from expected e full join public.post_sale_batch_overview o on o.id=e.batch_id
  where e.batch_id is null or o.id is null or e.sale_count<>o.sale_count or e.total_amount<>o.total_amount;
  if mismatches>0 then raise exception 'Post-sale counts/totals disagree with valid sales: %',mismatches; end if;

  if exists(
    select 1 from public.post_sale_batch_overview o
    join public.sales s on s.id=o.latest_sale_id
    where s.general_status='cancelled' or s.record_type<>'sale'
  ) then raise exception 'Cancelled sale used as latest purchase'; end if;

  if exists(
    select 1 from public.post_sale_batch_overview o
    cross join lateral jsonb_array_elements(public.post_sale_nexus_context(o.id)->'compras_deste_acompanhamento') j
    join public.sales s on s.id=(j->>'id')::uuid
    where s.record_type<>'sale' or s.general_status='cancelled'
  ) then raise exception 'Cancelled sale in Nexus current context'; end if;

  if exists(
    select 1 from public.fitness_post_sale_cycle_sales o
    join public.fitness_sales s on s.id=o.sale_id
    where s.general_status='cancelled'
  ) then raise exception 'Cancelled Fitness sale in follow-up'; end if;

  if (select open_count from public.post_sale_batch_summary)<>
     (select count(*) from public.post_sale_batch_overview where status='planned') then
    raise exception 'Summary and worklist do not match';
  end if;

  if has_function_privilege('anon','public.post_sale_nexus_context(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.post_sale_nexus_context(uuid)','EXECUTE') then
    raise exception 'Nexus context must remain server-only';
  end if;
  if not exists(select 1 from pg_class where oid='public.post_sale_batch_overview'::regclass
    and reloptions @> array['security_invoker=true']) then
    raise exception 'Follow-up view must preserve RLS';
  end if;
end;
$verify$;
