create or replace function public.nexus_move_shortcut_to_slot_v1(p_id uuid,p_slot integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_context text; v_row record; v_position integer:=0;
begin
  if v_user is null then raise exception 'Sessão inválida' using errcode='42501'; end if;
  if p_slot<1 or p_slot>12 then raise exception 'Posição inválida'; end if;
  select context_route into v_context from public.nexus_user_shortcuts where id=p_id and user_id=v_user;
  if not found then raise exception 'Atalho não encontrado'; end if;
  update public.nexus_user_shortcuts set sort_order=10000+sort_order where user_id=v_user and context_route=v_context;
  for v_row in select id from public.nexus_user_shortcuts where user_id=v_user and context_route=v_context and id<>p_id order by sort_order,created_at loop
    v_position:=v_position+1; if v_position=p_slot then v_position:=v_position+1; end if;
    update public.nexus_user_shortcuts set sort_order=v_position*10,updated_at=now() where id=v_row.id;
  end loop;
  update public.nexus_user_shortcuts set sort_order=p_slot*10,updated_at=now() where id=p_id;
  return true;
end; $$;
revoke all on function public.nexus_move_shortcut_to_slot_v1(uuid,integer) from public,anon;
grant execute on function public.nexus_move_shortcut_to_slot_v1(uuid,integer) to authenticated;
