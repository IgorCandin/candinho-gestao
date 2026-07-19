# Hotfix Central V12.1

Corrige o erro de runtime da tela `/central/inbox` introduzido no Pacotão Central V12.

## Causa
A página Server Component importava `CENTRAL_LABELS` e `labelName()` de um arquivo marcado com `"use client"`.
Isso é inválido no runtime do Next.js quando a função é chamada no servidor.

## Correção
- Move `CENTRAL_LABELS` e `labelName()` para `src/lib/central-labels.ts`, que é seguro para Server e Client Components.
- O componente de troca de etiqueta continua Client Component.
- A página do Inbox passa a consumir as constantes pelo módulo compartilhado.

## Aplicação
Extraia por cima da raiz de `candinho-gestao`, substitua os arquivos e faça commit + push.

Commit sugerido:
`Hotfix Central V12.1 · Corrige runtime do Inbox`
