begin;

update public.products p
set
  active = false,
  restricted = true,
  updated_at = now()
where p.id in (
  select c.legacy_product_id
  from public.product_combo_overview c
  where c.legacy_product_id is not null
);

commit;
