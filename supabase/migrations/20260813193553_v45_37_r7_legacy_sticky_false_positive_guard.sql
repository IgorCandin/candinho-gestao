create or replace function public.ux_health_ignore_vertical_sticky_v2()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_horizontal numeric := 0;
  v_element text := coalesce(new.payload->>'element','');
begin
  if new.signal_type='fixed_clip' then
    v_horizontal := greatest(
      coalesce((new.payload->>'horizontal_overflow')::numeric,0),
      0
    );

    if new.payload->>'position'='sticky'
       and v_horizontal <= 12 then
      return null;
    end if;

    if new.payload->>'position' is null
       and v_horizontal <= 12
       and v_element in (
         'header.topbar',
         'div.next-order-selection-bar',
         'aside.supplier-order-detail-side',
         'div.supplier-order-side',
         'aside.supplier-order-side',
         'div.inventory-detail-side',
         'aside.inventory-detail-side',
         'div.new-sale-side',
         'aside.new-sale-side'
       ) then
      return null;
    end if;
  end if;

  return new;
end;
$$;

update public.ux_health_signals
set status='resolved',
    resolved_at=now(),
    resolution_note='V45.37.R7: sidebar sticky em fluxo normal antes de atingir top:92px; não é clipping visível.'
where status='active'
  and signal_type='fixed_clip'
  and route='/suplementos/pedidos-fornecedor/:id'
  and payload->>'element'='aside.supplier-order-detail-side';
