-- Primeira versão da busca global. A migration 20260717211543 corrige os aliases explícitos das colunas do UNION.
create or replace function public.central_global_search(p_query text,p_limit integer default 60)
returns table(result_type text,entity_id uuid,title text,subtitle text,href text,operation_scope text,score integer)
language plpgsql stable security definer set search_path=public as $$
declare v_query text:=lower(btrim(coalesce(p_query,'')));
begin
  if not (public.current_user_role()='admin' or public.can_access_operation('supplements') or public.can_access_operation('fitness') or public.can_access_marketing()) then raise exception 'Acesso negado'; end if;
  if length(v_query)<2 then return; end if;
  return query with results as (
    select 'contact'::text,c.id,c.display_name,concat_ws(' · ',nullif(c.phone,''),nullif(c.email,''),case when c.instagram_username is not null then '@'||c.instagram_username end),'/central/clientes/'||c.id::text,c.operation_scope,case when lower(c.display_name)=v_query then 100 when lower(coalesce(c.phone,''))=v_query or lower(coalesce(c.email,''))=v_query then 95 when lower(c.display_name) like v_query||'%' then 85 else 70 end
    from public.central_contacts c where public.central_can_access_scope(c.operation_scope) and (lower(c.display_name) like '%'||v_query||'%' or lower(coalesce(c.phone,'')) like '%'||v_query||'%' or lower(coalesce(c.email,'')) like '%'||v_query||'%' or lower(coalesce(c.instagram_username,'')) like '%'||v_query||'%')
  ) select * from results limit least(greatest(coalesce(p_limit,60),1),150);
end;$$;
revoke all on function public.central_global_search(text,integer) from public,anon;
grant execute on function public.central_global_search(text,integer) to authenticated;
