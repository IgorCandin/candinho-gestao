-- Cancelled sales remain in sales, quotes and batch links for audit.
-- Only effective purchases may feed follow-up totals and generated messages.
create or replace view public.post_sale_batch_overview
with (security_invoker=true)
as
with sale_products as (
  select si.sale_id,
    string_agg(p.name || case when si.quantity>1 then ' ×'||si.quantity::text else '' end,
      ', ' order by p.name) product_summary
  from public.sale_items si
  join public.products p on p.id=si.product_id
  group by si.sale_id
)
select b.id,b.customer_id,
  c.name customer_name,c.phone customer_phone,c.city,c.reference,
  b.due_on,b.status,b.notes,
  b.ai_last_message,b.ai_last_generated_at,b.ai_metadata,
  b.completed_at,b.cancelled_at,b.created_by,b.created_at,b.updated_at,
  count(m.sale_id)::integer sale_count,
  coalesce(sum(s.total_amount),0)::numeric(12,2) total_amount,
  max(coalesce(s.delivered_at,s.quoted_at)) last_purchase_at,
  (array_agg(s.id order by coalesce(s.delivered_at,s.quoted_at) desc nulls last))[1] latest_sale_id,
  string_agg(distinct coalesce(sp.product_summary,'Venda'),
    ' | ' order by coalesce(sp.product_summary,'Venda')) product_summary
from public.post_sale_batches b
join public.customers c on c.id=b.customer_id
join public.post_sale_batch_sales m on m.batch_id=b.id
join public.sales s on s.id=m.sale_id
  and s.record_type='sale' and s.general_status<>'cancelled'
left join sale_products sp on sp.sale_id=s.id
group by b.id,c.id;

-- Derive counters from the same eligible batches as the worklist.
create or replace view public.post_sale_batch_summary
with (security_invoker=true)
as
select
  count(*) filter(where status='planned')::integer open_count,
  count(*) filter(where status='planned' and due_on<(now() at time zone 'America/Sao_Paulo')::date)::integer overdue_count,
  count(*) filter(where status='planned' and due_on=(now() at time zone 'America/Sao_Paulo')::date)::integer today_count,
  count(*) filter(where status='planned' and due_on>(now() at time zone 'America/Sao_Paulo')::date
    and due_on<=(now() at time zone 'America/Sao_Paulo')::date+7)::integer next_seven_days_count
from public.post_sale_batch_overview;

-- Preserve the current function, ACL and customer context; patch only the
-- previously unfiltered current-batch query. Fail closed on unexpected drift.
do $patch_context$
declare
  definition text;
  marker text := 'where pbs.batch_id=p_batch_id';
begin
  select pg_get_functiondef('public.post_sale_nexus_context(uuid)'::regprocedure) into definition;
  if length(definition)-length(replace(definition,marker,'')) <> length(marker) then
    raise exception 'Unexpected post_sale_nexus_context definition; refusing to patch';
  end if;
  definition := replace(definition,marker,
    marker || E'\n      and s.record_type=''sale'' and s.general_status<>''cancelled''');
  execute definition;
end;
$patch_context$;

-- A future cancellation invalidates only unsent drafts in planned batches.
-- Archive the draft in the existing audit log before clearing it.
create or replace function public.invalidate_cancelled_sale_post_sale_draft_v1()
returns trigger language plpgsql security definer set search_path=public
as $function$
begin
  if new.general_status<>'cancelled' or old.general_status='cancelled' then
    return new;
  end if;
  insert into public.audit_events(entity_type,entity_id,action,details)
  select 'post_sale_batch',b.id,'cancelled_sale_draft_invalidated',
    jsonb_build_object('sale_id',new.id,'ai_last_message',b.ai_last_message,
      'ai_metadata',b.ai_metadata,'ai_last_generated_at',b.ai_last_generated_at)
  from public.post_sale_batches b
  where b.status='planned' and b.ai_last_message is not null
    and exists(select 1 from public.post_sale_batch_sales m where m.batch_id=b.id and m.sale_id=new.id);
  update public.post_sale_batches b
  set ai_last_message=null,ai_last_generated_at=null,ai_metadata='{}'::jsonb,updated_at=now()
  where b.status='planned' and b.ai_last_message is not null
    and exists(select 1 from public.post_sale_batch_sales m where m.batch_id=b.id and m.sale_id=new.id);
  return new;
end;
$function$;
revoke all on function public.invalidate_cancelled_sale_post_sale_draft_v1() from public,anon,authenticated;
-- BEFORE is intentional: invalidation runs while a batch is still planned,
-- before the existing AFTER trigger cancels batches with no valid sales left.
create trigger invalidate_cancelled_sale_post_sale_draft_v1
before update of general_status on public.sales
for each row execute function public.invalidate_cancelled_sale_post_sale_draft_v1();

-- No rows, links, monetary entries or inventory movements are deleted/updated.
notify pgrst, 'reload schema';
