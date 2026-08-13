-- V45.37.R3 · baixa do relato manual cuja causa foi corrigida.
update public.ux_issue_reports
set status='resolved',
    resolved_at=now(),
    resolution_notes='V45.37.R3: causa funcional corrigida em commercial_contact_action_v1; frontend também endurecido contra refresh instável.',
    updated_at=now()
where status not in ('resolved','ignored')
  and route='/suplementos/fila-comercial'
  and category='broken_action'
  and description='Não foi possível atualizar a fila comercial.';
