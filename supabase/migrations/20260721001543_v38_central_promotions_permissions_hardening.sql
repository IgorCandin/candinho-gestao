begin;

revoke all on function public.central_can_manage_promotions() from public, anon;
revoke all on function public.central_promotion_suggestions(text,integer) from public, anon;

grant execute on function public.central_can_manage_promotions()
to authenticated, service_role;

grant execute on function public.central_promotion_suggestions(text,integer)
to authenticated, service_role;

commit;
