# V45.7.1 · Hotfix Retorno Radar

Corrige incompatibilidade entre a função `central_schedule_radar_followup`
e o padrão atual de `operational_tasks`.

Antes:
- buscava tarefas com `status='pending'`;
- inseria novas tarefas com `status='pending'`.

Hoje `operational_tasks_status_check` aceita:
- planned
- completed
- cancelled

Correção:
- retorno pendente passa a usar `status='planned'`;
- atualização procura retorno existente em `planned`;
- lógica de não duplicar retorno permanece.

IMPORTANTE:
A migration já foi aplicada no Supabase oficial.
Este pacote serve apenas para manter o GitHub sincronizado com a produção.

Commit sugerido:
`V45.7.1 - corrige agendamento de retorno do Radar`
