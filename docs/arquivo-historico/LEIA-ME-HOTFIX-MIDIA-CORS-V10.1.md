# Candinho Company · Hotfix Mídia CORS V10.1

Corrige o erro `Failed to send a request to the Edge Function` ao clicar em **Classificar com Nexus**.

## Causa
A Edge Function `central-media-classify` em produção responde `405` ao preflight HTTP `OPTIONS` enviado pelo navegador. A requisição falha antes do POST chegar à OpenAI.

## Correção
- O componente de classificação passa a chamar `/api/central/media-classify` no mesmo domínio da Candinho Company.
- A nova rota server-side chama a Edge Function do Supabase usando a sessão autenticada do usuário.
- O navegador deixa de chamar a Edge Function diretamente, eliminando o bloqueio de CORS.
- Nenhuma chave OpenAI é exposta no navegador ou no Git.

## Aplicação
Copie os arquivos desta pasta por cima do projeto V10 atual, faça commit e push.

Commit sugerido:
`Hotfix V10.1 · Corrige classificação Nexus Mídia via server route`

## Validação local
- ESLint: 0 erros, 2 warnings preexistentes de `<img>` na Mídia.
- TypeScript: 0 erros.
- Next.js production build: exit code 0.
- Rota confirmada no build: `/api/central/media-classify`.
