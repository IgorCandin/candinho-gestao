create or replace function public.ux_health_ignore_offscreen_sticky_v1()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.signal_type='fixed_clip'
     and new.payload->>'element'='header.topbar'
     and (
       coalesce((new.payload->'rect'->>'bottom')::numeric,1) <= 0
       or coalesce((new.payload->'rect'->>'top')::numeric,-1) >= coalesce(new.viewport_height,0)
     ) then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists ux_health_ignore_offscreen_sticky_v1 on public.ux_health_signals;
create trigger ux_health_ignore_offscreen_sticky_v1
before insert on public.ux_health_signals
for each row execute function public.ux_health_ignore_offscreen_sticky_v1();
