# Pacote — Commercial Inbox V1 + Hotfix V7

Este pacote faz duas coisas no mesmo deploy:

1. corrige o build quebrado da Vitrine Company V7;
2. implementa a primeira versão da Inbox Comercial dentro de Leads.

## Erro do deploy anterior

A Vercel falhou em:

`src/components/public-storefront-company-ux.tsx:241`

Erro:

`'host' is possibly 'null'`

O elemento já era validado antes, mas era capturado por funções internas e o TypeScript strict não preservava o narrowing.

O hotfix estabiliza:

- `storefrontHost`;
- select de operação;
- botões Suplementos/Fitness;
- primeiro item de promoções agrupadas.

Foi feita checagem semântica local desse arquivo com `strict: true`: 0 diagnósticos.

## Inbox Comercial

Arquivos principais:

- `src/components/commercial-inbox-panel.tsx`
- `src/components/commercial-inbox-panel.module.css`
- `src/lib/commercial-inbox-data.ts`
- `src/app/(app)/leads/page.tsx`
- `src/app/api/catalogo/interesse/route.ts`
- `supabase/migrations/20260803093000_commercial_inbox_catalog_v1.sql`

Migrations `commercial_inbox_catalog_v1` e `commercial_inbox_permissions_v1` já aplicadas no Supabase de produção.

NÃO rode SQL manualmente.

## Commit sugerido

`feat: cria Inbox Comercial e corrige Vitrine Company V7`
