begin;

grant select on public.customers to service_role;
grant select on public.sales to service_role;
grant select on public.sale_items to service_role;
grant select on public.products to service_role;

commit;
