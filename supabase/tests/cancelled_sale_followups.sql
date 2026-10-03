-- Read-only production regression checks. Each failing query returns rows.
select t.id, t.sale_id
from public.operational_tasks t
join public.sale_replenishment_reminders r on r.task_id=t.id
join public.sales s on s.id=r.sale_id
where s.general_status='cancelled' and t.status='planned';

select r.id, r.sale_id
from public.sale_replenishment_reminders r
join public.sales s on s.id=r.sale_id
where s.general_status='cancelled' and r.status='planned';

select b.id
from public.post_sale_batches b
where b.status='planned'
  and exists(select 1 from public.post_sale_batch_sales m where m.batch_id=b.id)
  and not exists(
    select 1 from public.post_sale_batch_sales m join public.sales s on s.id=m.sale_id
    where m.batch_id=b.id and s.record_type='sale' and s.general_status<>'cancelled'
  );

select 'missing trigger' as failure
where not exists(select 1 from pg_trigger where tgrelid='public.sales'::regclass
  and tgname='cancel_sale_automatic_followups_v1' and tgenabled='O');

select 'internal function exposed' as failure
where has_function_privilege('anon','public.cancel_sale_automatic_followups_v1()','EXECUTE')
   or has_function_privilege('authenticated','public.cancel_sale_automatic_followups_v1()','EXECUTE');
