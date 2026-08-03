# Black de Agosto · Marketing + Google Agenda

## Estado de produção em 03/08/2026

A integração foi ativada diretamente no Supabase de produção antes deste pacote ser gerado.
Este pacote existe para manter o repositório Git alinhado ao estado real de produção e liberar a interface de conclusão/histórico na página do Marketing.

Fluxo oficial:

1. A tarefa nasce em `operational_tasks` com `operation_scope = marketing`.
2. Enquanto estiver `planned`, o trigger envia `marketing_task / upsert` para a fila do Google Agenda.
3. A Edge Function `google-calendar-sync` envia o compromisso ao Apps Script oficial.
4. Ao marcar a tarefa como `completed` ou `cancelled`, o trigger envia `marketing_task / delete`.
5. O evento some do Google Agenda, mas a linha continua no banco e aparece no histórico do Marketing.
6. Ao reabrir a tarefa (`planned`), ela volta ao Google Agenda.

## Black de Agosto · rota recalculada

- 02/08: creatinas publicadas e dia registrado como concluído.
- O Combo Foco Total não saiu no dia 02 e foi movido para 03/08 às 19h.
- 03/08: 13h Wheys; 16h Beta-Alanina + Touro Power; 19h Combo Foco Total.
- 04/08: Saúde + Combo Testo Dilated.
- 05/08: Energia + Combo Vitalidade.
- 06/08 em diante: sequência temática, reforços e reta final até 15/08.

As tarefas da campanha de 02/08 a 15/08 já foram gravadas em produção. Não há seed de campanha neste pacote para evitar duplicação futura.

## Arquivos do pacote

- `src/app/(app)/marketing/planejamento/page.tsx`
  - pendências separadas do histórico;
  - botão Concluir / Cancelar / Reabrir;
  - histórico preservado após conclusão;
  - explicação da sincronização com o Google Agenda.
- `supabase/functions/google-calendar-sync/index.ts`
  - suporte ao `marketing_task`;
  - prioridade para jobs pendentes;
  - retry de erros recentes;
  - limite de lote;
  - timeout no Apps Script para não travar a Edge Function.
- `supabase/migrations/20260803154500_marketing_google_calendar_sync.sql`
  - schema/trigger/fila/permissão para manter o banco reproduzível.

## Commit sugerido

`feat: sincroniza agenda do Marketing com Google Calendar`
