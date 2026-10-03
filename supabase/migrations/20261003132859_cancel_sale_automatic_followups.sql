begin;
create or replace function public.cancel_sale_automatic_followups_v1()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  if new.general_status <> 'cancelled' then return new; end if;
  insert into public.audit_events(entity_type,entity_id,action,details)
  select 'operational_task',t.id,'cancelled_sale_followup',
    jsonb_build_object('sale_id',new.id,'status_before',t.status,'reason','Venda cancelada')
  from public.operational_tasks t
  where t.status='planned' and exists(
    select 1 from public.sale_replenishment_reminders r
    where r.sale_id=new.id and r.task_id=t.id
  );
  update public.operational_tasks t set status='cancelled',cancelled_at=coalesce(t.cancelled_at,now()),updated_at=now()
  where t.status='planned' and exists(
    select 1 from public.sale_replenishment_reminders r
    where r.sale_id=new.id and r.task_id=t.id
  );
  update public.sale_replenishment_reminders set status='cancelled',updated_at=now()
  where sale_id=new.id and status='planned';
  update public.post_sale_batches b set status='cancelled',cancelled_at=coalesce(b.cancelled_at,now()),updated_at=now()
  where b.status='planned'
    and exists(select 1 from public.post_sale_batch_sales m where m.batch_id=b.id and m.sale_id=new.id)
    and not exists(
      select 1 from public.post_sale_batch_sales m join public.sales s on s.id=m.sale_id
      where m.batch_id=b.id and s.record_type='sale' and s.general_status<>'cancelled'
    );
  return new;
end;
$fn$;
revoke execute on function public.cancel_sale_automatic_followups_v1() from public,anon,authenticated;
create trigger cancel_sale_automatic_followups_v1
after update of general_status on public.sales
for each row execute function public.cancel_sale_automatic_followups_v1();
insert into public.audit_events(entity_type,entity_id,action,details)
select 'operational_task',t.id,'cancelled_sale_followup_backfill',
jsonb_build_object('sale_id',s.id,'status_before',t.status,'reason','Venda cancelada')
from public.operational_tasks t join public.sale_replenishment_reminders r on r.task_id=t.id
join public.sales s on s.id=r.sale_id
where t.status='planned' and s.general_status='cancelled';
update public.operational_tasks t set status='cancelled',cancelled_at=coalesce(t.cancelled_at,now()),updated_at=now()
where t.status='planned' and exists(
select 1 from public.sale_replenishment_reminders r join public.sales s on s.id=r.sale_id
where r.task_id=t.id and s.general_status='cancelled');
update public.sale_replenishment_reminders r set status='cancelled',updated_at=now()
from public.sales s where s.id=r.sale_id and s.general_status='cancelled' and r.status='planned';
update public.post_sale_batches b set status='cancelled',cancelled_at=coalesce(b.cancelled_at,now()),updated_at=now()
where b.status='planned' and exists(select 1 from public.post_sale_batch_sales m where m.batch_id=b.id)
and not exists(select 1 from public.post_sale_batch_sales m join public.sales s on s.id=m.sale_id where m.batch_id=b.id and s.record_type='sale' and s.general_status<>'cancelled');
do $verify$
begin
if exists(select 1 from public.operational_tasks t join public.sale_replenishment_reminders r on r.task_id=t.id join public.sales s on s.id=r.sale_id where t.status='planned' and s.general_status='cancelled') then
raise exception 'Contato automatico de venda cancelada continua ativo';
end if;
end;
$verify$;
commit;
