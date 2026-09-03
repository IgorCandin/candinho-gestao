drop index if exists public.replenishment_group_products_group_idx;

drop policy if exists replenishment_groups_write on public.replenishment_groups;
drop policy if exists replenishment_groups_insert on public.replenishment_groups;
drop policy if exists replenishment_groups_update on public.replenishment_groups;
drop policy if exists replenishment_groups_delete on public.replenishment_groups;
create policy replenishment_groups_insert on public.replenishment_groups
  for insert to authenticated with check ((select public.can_write()));
create policy replenishment_groups_update on public.replenishment_groups
  for update to authenticated using ((select public.can_write()))
  with check ((select public.can_write()));
create policy replenishment_groups_delete on public.replenishment_groups
  for delete to authenticated using ((select public.can_write()));

drop policy if exists replenishment_group_products_write on public.replenishment_group_products;
drop policy if exists replenishment_group_products_insert on public.replenishment_group_products;
drop policy if exists replenishment_group_products_update on public.replenishment_group_products;
drop policy if exists replenishment_group_products_delete on public.replenishment_group_products;
create policy replenishment_group_products_insert on public.replenishment_group_products
  for insert to authenticated with check ((select public.can_write()));
create policy replenishment_group_products_update on public.replenishment_group_products
  for update to authenticated using ((select public.can_write()))
  with check ((select public.can_write()));
create policy replenishment_group_products_delete on public.replenishment_group_products
  for delete to authenticated using ((select public.can_write()));
