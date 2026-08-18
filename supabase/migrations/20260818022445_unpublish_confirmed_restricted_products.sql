-- Owner-confirmed on 2026-08-17: remove only the public publication of the
-- three restricted products. Product records and sales history are preserved.

insert into public.audit_events(entity_type, entity_id, action, details)
select
  'public_product_page',
  page.id,
  'restricted_product_unpublished',
  jsonb_build_object(
    'product_id', page.product_id,
    'published_before', page.published,
    'migration', '20260818022445_unpublish_confirmed_restricted_products'
  )
from public.public_product_pages page
where page.id in (
  'f162ab53-3d99-4152-95d5-b85b80bba0d1'::uuid,
  'e798e748-1612-44aa-91cd-6124cdffb237'::uuid,
  'b4e96381-5416-44a2-9cc4-30f26beaabf4'::uuid
)
and page.product_id in (
  '50d40a6c-44e7-4a54-8c67-ad20a8aa712b'::uuid,
  'a8dd3835-5e13-4549-bce3-aaf9f8d97c76'::uuid,
  '0ac6ea27-4aa6-40f3-a464-973fb8f28395'::uuid
)
and page.published;

update public.public_product_pages page
set published = false
where page.id in (
  'f162ab53-3d99-4152-95d5-b85b80bba0d1'::uuid,
  'e798e748-1612-44aa-91cd-6124cdffb237'::uuid,
  'b4e96381-5416-44a2-9cc4-30f26beaabf4'::uuid
)
and page.product_id in (
  '50d40a6c-44e7-4a54-8c67-ad20a8aa712b'::uuid,
  'a8dd3835-5e13-4549-bce3-aaf9f8d97c76'::uuid,
  '0ac6ea27-4aa6-40f3-a464-973fb8f28395'::uuid
);

do $verification$
begin
  if exists (
    select 1
    from public.public_product_pages page
    where page.id in (
      'f162ab53-3d99-4152-95d5-b85b80bba0d1'::uuid,
      'e798e748-1612-44aa-91cd-6124cdffb237'::uuid,
      'b4e96381-5416-44a2-9cc4-30f26beaabf4'::uuid
    )
      and page.published
  ) then
    raise exception 'Restricted product publication verification failed';
  end if;
end
$verification$;
