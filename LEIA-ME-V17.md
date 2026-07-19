# Candinho Company · V17 — Fechamento cirúrgico da Inbox pausada

## O que já foi aplicado diretamente no Supabase
- Revogada execução, para usuários comuns, das RPCs antigas de:
  - atribuir conversa;
  - criar retorno de conversa;
  - marcar conversa como lida;
  - alterar etiqueta;
  - alterar status.
- Revogadas escritas diretas de usuários em:
  - central_conversations;
  - central_messages;
  - central_ai_insights.
- `central-delete-conversation` foi transformada em endpoint encerrado HTTP 410.

## O que este pacote remove do frontend ativo
1. A página de detalhe da Mídia deixa de carregar até 200 conversas da antiga Inbox.
2. O vínculo de Mídia passa a trabalhar somente com Contato.
3. Um vínculo histórico de conversa já existente é preservado enquanto o contato não for trocado.
4. A ficha de Contato da Central deixa de consultar `central_inbox_overview`.
5. A seção visual "Conversas" é removida da ficha do contato.
6. Prioridades deixa de exibir o card e a seção de Atendimentos.
7. `/api/central/delete-conversation` passa a responder 410.

## O que NÃO é alterado
- central-meta-webhook
- central-meta-send
- tokens ou configurações da Meta
- identidades WhatsApp / Instagram / Facebook
- contatos da Central
- mensagens históricas já armazenadas

Isso evita conflito com o trabalho da integração Meta.

## Próxima ação depois do commit
Quando o V17 estiver READY na Vercel, aplicar em produção a migration:

`20260719161000_finalize_paused_inbox_read_surface.sql`

Ela fecha a leitura da antiga `central_inbox_snapshot` e da view `central_inbox_overview`
para usuários comuns, pois o frontend V17 já não depende mais delas.

## Commit sugerido
`V17 · Fecha Inbox pausada e remove consultas antigas`
