update public.ux_health_signals
set status='resolved',
    resolved_at=now(),
    resolution_note='V45.37.R4: sticky totalmente fora do viewport por scroll normal; não é clipping visível.'
where status='active'
  and signal_type='fixed_clip'
  and payload->>'element'='header.topbar'
  and (
    coalesce((payload->'rect'->>'bottom')::numeric,1) <= 0
    or coalesce((payload->'rect'->>'top')::numeric,-1) >= coalesce(viewport_height,0)
  );
