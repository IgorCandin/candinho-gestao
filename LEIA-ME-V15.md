# V15 · Marketing fix + Inbox pausado

## Marketing / Nexus
O erro atual não era mais CORS nem permissão.
Os logs mostraram que:
- o POST chegou corretamente à Edge Function;
- o PDF foi lido do Storage com sucesso;
- a chamada à OpenAI retornou HTTP 400.

A versão 2 de `marketing-pdf-ingest` corrige o formato do `file_data` enviado à Responses API:
`data:application/pdf;base64,...`

Também passa a salvar o detalhe real retornado pela OpenAI em caso de erro, em vez de mostrar apenas "Falha ao interpretar PDF (400)".

A Edge Function V2 já foi publicada no Supabase de produção e os 3 PDFs foram recolocados como `pending` para nova tentativa.

## Inbox pausado
A Inbox foi retirada da atividade operacional do site:
- Realtime de `central_messages` e `central_conversations` já foi removido da publicação `supabase_realtime` em produção;
- `/central/inbox` passa a redirecionar para `/central` e não executa consultas pesadas;
- atalhos antigos para Inbox são escondidos;
- o CSS específico da Inbox deixa de ser carregado globalmente.

### Importante
O webhook da Meta continua ativo para não quebrar a integração existente. Portanto, mensagens recebidas ainda podem ser registradas no banco mesmo com a interface da Inbox pausada. Isso preserva a possibilidade de reativação futura. Para zerar também o armazenamento de mensagens seria necessário alterar o webhook, o que é uma decisão separada porque muda o comportamento da integração Meta.

## Commit sugerido
`V15 · Corrige PDF do Nexus e pausa Inbox da Central`
