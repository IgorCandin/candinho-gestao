# Candinho Central · Agenda + Pendências V3

## Incluído
- Nova rota `/central/agenda`.
- Nova rota `/central/pendencias`.
- Agenda e pendências no menu lateral da Central.
- Atalho de Pendências no menu mobile.
- Criação de tarefas com escopo Company, Suplementos ou Fitness.
- Vínculo opcional da tarefa com contato unificado da Central.
- Responsável opcional.
- Prioridade Normal, Atenção ou Urgente.
- Ações para concluir, cancelar e reabrir tarefas.
- Indicadores de hoje, atrasadas, próximos 7 dias, pendentes e concluídas no mês.
- Visão Geral da Central agora exibe Agenda e Pendências.
- Migration `20260717193056_create_central_agenda_and_pending_tasks.sql` sincronizada com o Supabase de produção.

## Banco
A migration já foi aplicada no Supabase de produção. O arquivo SQL está no pacote apenas para manter o Git sincronizado.

## Validação
- ESLint: 0 erros (1 aviso antigo de `<img>` na página de Mídia).
- Next.js build: sucesso.
- TypeScript: sucesso.
