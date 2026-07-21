# V38 · Consolidação Google Agenda / Apps Script

## Arquitetura oficial

Candinho ERP é a fonte autoritativa.

Fluxo:

`Pós-venda / Agenda Estratégica`
→ `central_calendar_sync_queue`
→ `google-calendar-sync`
→ `Candinho Calendar Bridge (Apps Script)`
→ `Google Agenda`

## Comportamento validado

### Pós-venda
- pendente: cria/atualiza evento;
- concluído: remove evento;
- cancelado: remove evento;
- alteração da data: atualiza evento.

### Agenda Estratégica
- planned + scheduled_on: cria/atualiza;
- completed: remove;
- postponed: remove;
- reaberta + data: volta a sincronizar.

## Produção

Fila após testes:
- done: 34
- pending: 0
- error: 0

O usuário confirmou visualmente:
- eventos de pós-venda apareceram;
- concluir na Candinho removeu o evento do Google.

## Consolidação

`central_google_calendar_status()` agora lê
`central_calendar_internal_config` e não depende mais de
`central_google_calendar_connections`.

O frontend não inicia OAuth.

`google-calendar-oauth` permanece apenas como endpoint legado,
respondendo que Google Cloud/OAuth foi desativado.

## Segredos

Nunca versionar:
- `CANDINHO_SYNC_SECRET`;
- `apps_script_secret`;
- `sync_secret`.

O segredo real deve existir somente:
- em `central_calendar_internal_config`;
- nas Script Properties do Google Apps Script.
