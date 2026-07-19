# Hotfix Central V12.2

Corrige o erro `new row violates row-level security policy` ao anexar arquivos no Atendimento.

## Causa
O upload estava criando arquivos em:

`outbox/<usuario>/<conversa>/arquivo`

As políticas do bucket `central-media` usam a primeira pasta como `operation_scope`.
Como `outbox` não é uma operação válida, o Supabase bloqueava o INSERT por RLS.

## Correção
Agora o caminho é:

`<operation_scope>/outbox/<usuario>/<conversa>/arquivo`

Exemplos:
- `supplements/outbox/...`
- `fitness/outbox/...`
- `company/outbox/...`

Assim o upload respeita as políticas existentes sem enfraquecer a segurança.

## Observação
A Edge Function `central-meta-send` já está publicada na versão 12 no Supabase.
Depois deste hotfix, o fluxo completo de anexo pode ser testado novamente.

Commit sugerido:
`Hotfix Central V12.2 · Corrige RLS no upload de anexos`
