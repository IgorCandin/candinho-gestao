revoke all on function public.central_merge_equivalent_contacts() from public;
revoke all on function public.central_merge_equivalent_contacts() from anon;
revoke all on function public.central_merge_equivalent_contacts() from authenticated;
grant execute on function public.central_merge_equivalent_contacts() to service_role;
