# V38 · Google Calendar · Pós-venda + Agenda Estratégica

## Modelo
A Candinho permanece como fonte autoritativa.
O Google Calendar funciona como espelho para widget e visualização móvel.

## Fontes sincronizadas
- `post_sale_batches`
- `central_strategic_agenda_items`

## Comportamento
### Pós-venda
- planned + due_on: upsert do evento;
- completed/cancelled: delete do evento.

### Agenda Estratégica
- planned + scheduled_on: upsert;
- completed/postponed: delete;
- alteração de data/título/objetivo/prioridade: atualização.

## Fila
`central_calendar_sync_queue`

Mudanças de estado não dependem da resposta do Google.
O banco enfileira e dispara a Edge Function de forma assíncrona.

## Retry
`pg_cron` ativo com:
`*/15 * * * *`

Job:
`candinho-google-calendar-sync-retry`

## Segurança
Tokens OAuth ficam em:
`central_google_calendar_connections`

A tabela:
- não possui acesso para anon;
- não possui acesso para authenticated;
- é utilizada somente por service_role.

O disparo banco → Edge usa segredo aleatório gerado no próprio banco,
armazenado em `central_calendar_internal_config`.

Esse segredo não foi colocado no repositório.

## OAuth
Edge Function:
`google-calendar-oauth` v2

## Worker
Edge Function:
`google-calendar-sync` v2

## Migrations aplicadas
- 20260721013214 v38_google_calendar_sync_core
- 20260721013317 v38_google_calendar_sync_queue_and_sources_v2
- 20260721013618 v38_google_calendar_async_dispatch

## Validação
Cron confirmado ativo.
Fila criada e populada com os registros atuais.
A sincronização externa ainda depende da configuração do OAuth Client Google.


## Correção de build herdada do pacote anterior
O deploy da Agenda Estratégica falhou no typecheck por causa da vitrine de Promoções:
`BRAND_ASSETS.company.reduced` não existe no contrato atual.

O arquivo foi corrigido para:
`BRAND_ASSETS.company.complete`.
