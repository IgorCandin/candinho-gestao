-- Fecha somente os dois sinais comprovadamente corrigidos nesta entrega.
-- Valores anteriores preservados no histórico Git:
--   ux_health_signals: active, 4 ocorrências, último em 2026-08-15 14:06:01 UTC.
--   ux_issue_reports: open, criado em 2026-08-18 15:38:41 UTC.

update public.ux_health_signals
set
  status = 'resolved',
  resolved_at = coalesce(resolved_at, now()),
  resolution_note =
    'Última ocorrência às 11:06 de 15/08; correção de hidratação publicada às 11:07, sem recorrência posterior.'
where status = 'active'
  and signal_type = 'client_error'
  and route = '/suplementos/painel'
  and last_seen_at = timestamptz '2026-08-15 14:06:01.455057+00'
  and payload ->> 'message' like '%Minified React error #418%';

update public.ux_issue_reports
set
  status = 'resolved',
  resolved_at = coalesce(resolved_at, now()),
  resolution_notes =
    'A tentativa usou produto com saldo 0. A baixa permaneceu atômica e foi recusada corretamente. O formulário agora oferece apenas produtos, sabores e estoques com saldo disponível, mostra a quantidade e impede confirmação acima do saldo.',
  updated_at = now()
where status not in ('resolved', 'ignored')
  and category = 'broken_action'
  and route = '/suplementos/parceiros/2655e939-361b-4a67-b745-0e45fa1c97ac'
  and description = 'Erro ao salvar a recompensa da parceria'
  and created_at = timestamptz '2026-08-18 15:38:41.128197+00';
