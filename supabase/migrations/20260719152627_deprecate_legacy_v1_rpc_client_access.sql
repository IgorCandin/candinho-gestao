-- As versões V2 são as interfaces atuais do app. As versões V1 ficam
-- preservadas apenas como implementação interna/compatibilidade, sem chamada
-- direta pelo papel authenticated.

revoke execute on function public.get_my_access() from authenticated;
revoke execute on function public.list_user_permissions() from authenticated;
revoke execute on function public.central_media_search(text, text, integer) from authenticated;
revoke execute on function public.save_fitness_product(uuid, text, text, text, text, boolean, jsonb) from authenticated;
revoke execute on function public.create_fitness_sale(text, text, text, date, jsonb, text, date, text, date, boolean, date, text) from authenticated;
revoke execute on function public.create_fitness_purchase_order(text, date, jsonb, text) from authenticated;
revoke execute on function public.update_user_permissions(uuid, text, text, boolean, boolean, boolean, boolean, boolean) from authenticated;
revoke execute on function public.update_user_permissions(uuid, text, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) from authenticated;
