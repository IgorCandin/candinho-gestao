# Hotfix V10.2 — Inbox / Nexus / Meta sem CORS no navegador

## Problema confirmado
O Inbox chamava `central-nexus-suggest` e `central-meta-send` diretamente do navegador via `supabase.functions.invoke`.
As duas Edge Functions retornavam `405` no preflight `OPTIONS`, causando `Failed to send a request to the Edge Function` antes do POST real.

## Correção
- Adiciona proxies same-origin do Next.js:
  - `/api/central/nexus-suggest`
  - `/api/central/meta-send`
- O navegador chama apenas o domínio do Candinho.
- O servidor Next.js invoca as Edge Functions usando a sessão Supabase do usuário.
- Mantém as validações e permissões já existentes nas Edge Functions.
- Não altera tabelas, estoque, Bank, Suplementos ou Fitness.

## Aplicação
Copie o conteúdo desta pasta sobre a raiz do repositório `candinho-gestao`, permitindo sobrescrever `src/components/central-reply-composer.tsx`, depois faça commit/push normalmente.
