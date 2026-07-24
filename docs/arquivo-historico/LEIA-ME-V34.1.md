# Hotfix V34.1 · Pós-venda TypeScript

Corrige o erro de build da V34 em:

`src/app/(app)/pos-venda/[id]/page.tsx`

Erro da Vercel:

`Property 'name' does not exist on type '{ name: any; category: any; }[]'.`

Causa:
o relacionamento `sale_items -> products` foi inferido pelo TypeScript do Supabase como array em vez de objeto único.

Correção:
o nome do produto agora é resolvido de forma segura quando `products` vier como objeto ou array.

Nenhuma migration, tabela, Edge Function, Marketing ou Meta é alterada.

Commit sugerido:

`V34.1 · Corrige typecheck do pós-venda`
