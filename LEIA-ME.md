# Correção Build Vercel — Supabase Edge Functions

O Next.js estava incluindo `supabase/functions/**/*.ts` no type-check do aplicativo e tentando resolver imports do Deno como `npm:@supabase/supabase-js@2`.

A correção adiciona `supabase/functions/**/*.ts` ao `exclude` do `tsconfig.json`.

Extraia sobre a raiz do projeto e substitua `tsconfig.json`.
Commit sugerido: `Correção build · excluir Supabase Edge Functions do TypeScript Next`
