-- Integration test inside a transaction, rolled back in full.
-- No fabricated customer, sale, payment or inventory movement is committed.
begin;
do $test$
declare batch uuid; sale_ids uuid[]; original_count integer;
begin
  select b.id,array_agg(s.id order by s.id),count(*)::integer
  into batch,sale_ids,original_count
  from public.post_sale_batches b
  join public.post_sale_batch_sales m on m.batch_id=b.id
  join public.sales s on s.id=m.sale_id and s.record_type='sale' and s.general_status<>'cancelled'
  where b.status='planned'
  group by b.id having count(*)=2 order by b.id limit 1;
  if batch is null then raise exception 'Test requires a planned batch with two valid sales'; end if;

  update public.post_sale_batches set ai_last_message='ROLLBACK_ONLY_DRAFT_TEST',
    ai_metadata='{"rollback_test":true}'::jsonb,ai_last_generated_at=now() where id=batch;
  update public.sales set general_status='cancelled',cancelled_at=now(),cancellation_reason='ROLLBACK_ONLY_TEST' where id=sale_ids[1];

  if not exists(select 1 from public.post_sale_batches where id=batch and status='planned' and ai_last_message is null) then
    raise exception 'Mixed batch must stay planned and invalidate its draft';
  end if;
  if not exists(select 1 from public.audit_events where entity_id=batch
    and action='cancelled_sale_draft_invalidated' and details->>'ai_last_message'='ROLLBACK_ONLY_DRAFT_TEST') then
    raise exception 'Invalidated draft was not archived';
  end if;
  if (select sale_count from public.post_sale_batch_overview where id=batch)<>original_count-1 then
    raise exception 'Mixed batch did not keep only the valid sale';
  end if;
  if jsonb_array_length(public.post_sale_nexus_context(batch)->'compras_deste_acompanhamento')<>1 then
    raise exception 'Nexus still includes cancelled sale';
  end if;

  update public.sales set general_status='cancelled',cancelled_at=now(),cancellation_reason='ROLLBACK_ONLY_TEST' where id=sale_ids[2];
  if not exists(select 1 from public.post_sale_batches where id=batch and status='cancelled') then
    raise exception 'Batch without valid sales must be cancelled';
  end if;
  if exists(select 1 from public.post_sale_batch_overview where id=batch) then
    raise exception 'No-valid-sale batch is still visible';
  end if;
end;
$test$;
rollback;
select 'mixed batch, draft audit, full cancellation: passed; all changes rolled back' result;
