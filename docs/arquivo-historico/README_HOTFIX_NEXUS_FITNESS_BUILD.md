# Hotfix Nexus Fitness Build V1

Corrige o erro do deploy Vercel do pacote
`feat: expande Nexus para Fitness e cria vitrine inteligente`.

## Causa

`fitness-nexus-center.tsx` é Client Component (`"use client"`), mas importava
`fitnessSignalCopy` de `fitness-nexus-data.ts`.

`fitness-nexus-data.ts` usa o cliente Supabase de servidor, que importa
`next/headers`. Isso fez o Turbopack tentar levar `next/headers` para o bundle
do navegador.

## Correção

- Novo `src/lib/fitness-nexus-shared.ts`
  - tipos do snapshot;
  - interpretação determinística dos sinais;
  - zero import de Supabase / `next/headers`.
- `fitness-nexus-center.tsx`
  - passa a importar apenas o módulo browser-safe.

## Banco

Nenhuma migration.
Nenhum SQL.
Não altera os dados do Nexus Fitness.

Commit sugerido:

`fix: separa Nexus Fitness entre server e client`
