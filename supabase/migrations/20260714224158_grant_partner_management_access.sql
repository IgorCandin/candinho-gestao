revoke all on function public.save_partner(uuid,text,text,text,text,text,text,text,date,date,text,text,text,integer,numeric,text,text,integer,text,uuid,boolean,boolean,boolean,boolean,boolean,text,boolean) from public,anon;
revoke all on function public.assign_sale_partner(uuid,uuid) from public,anon;
revoke all on function public.register_partner_settlement(uuid,date,date,numeric,text,text) from public,anon;
grant execute on function public.save_partner(uuid,text,text,text,text,text,text,text,date,date,text,text,text,integer,numeric,text,text,integer,text,uuid,boolean,boolean,boolean,boolean,boolean,text,boolean) to authenticated,service_role;
grant execute on function public.assign_sale_partner(uuid,uuid) to authenticated,service_role;
grant execute on function public.register_partner_settlement(uuid,date,date,numeric,text,text) to authenticated,service_role;
