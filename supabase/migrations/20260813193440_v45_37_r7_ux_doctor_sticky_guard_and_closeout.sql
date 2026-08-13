create or replace function public.ux_health_ignore_vertical_sticky_v2()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_horizontal numeric := 0;
begin
  if new.signal_type='fixed_clip'
     and new.payload->>'position'='sticky' then
    v_horizontal := greatest(
      coalesce((new.payload->>'horizontal_overflow')::numeric,0),
      0
    );

    if v_horizontal <= 12 then
      return null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ux_health_ignore_vertical_sticky_v2
on public.ux_health_signals;

create trigger ux_health_ignore_vertical_sticky_v2
before insert on public.ux_health_signals
for each row
execute function public.ux_health_ignore_vertical_sticky_v2();

update public.ux_health_signals
set status='resolved',
    resolved_at=now(),
    resolution_note='V45.37.R7: deslocamento vertical normal de elemento sticky; não é clipping visível.'
where status='active'
  and signal_type='fixed_clip'
  and (
    (route='/suplementos/pedidos-fornecedor/proximo-pedido'
      and payload->>'element'='div.next-order-selection-bar')
    or
    (route='/suplementos/pedidos-fornecedor/:id'
      and payload->>'element'='header.topbar')
  );

update public.ux_health_signals
set status='resolved',
    resolved_at=now(),
    resolution_note='V45.37.R7: resíduo pré-R5 do bottom-nav Bank; guarda de safe-area já implantada e sem recorrência.'
where status='active'
  and signal_type='fixed_clip'
  and route='/bank'
  and payload->>'element'='nav.bank-v39-mobile-nav';
