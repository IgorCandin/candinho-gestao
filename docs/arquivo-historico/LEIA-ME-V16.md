# Candinho Company · V16

## Objetivo
Consolidar a pausa operacional da Inbox/Nexus de Atendimento, remover referências visuais antigas e sincronizar o repositório com mudanças que já estão ativas no Supabase de produção.

## O que já foi aplicado direto em produção
- Inbox fora do Realtime.
- Snapshots da Central sem consulta pesada de conversas.
- Home da Company sem consultar métricas de Inbox.
- Merge automático de contatos restrito ao service_role.
- Policy ampla de listagem do bucket público product-images removida.
- RLS de dashboard_priority_preferences otimizada.
- RPCs V1 antigas sem execução direta por authenticated.
- appsheet-import-once encerrado com HTTP 410 e JWT obrigatório.
- openai-api-diagnostic encerrado com HTTP 410 e JWT obrigatório.
- central-nexus-suggest pausado com HTTP 410 enquanto a Inbox estiver desativada.

## O que este pacote altera no código
- Remove Atendimento e Nexus IA da navegação da Central.
- Troca os atalhos mobile da Central por Prioridades, Busca e Alertas.
- Remove o `display:flex` inline da sidebar, deixando o CSS responsivo voltar a controlar corretamente desktop/mobile.
- Limpa a Home da Central para Prioridades, Clientes, Mídia, Agenda, Pendências e Alertas.
- A rota `/central/nexus` passa a redirecionar para `/central` sem carregar IA.
- O seletor da Company deixa de mostrar métricas falsas/zeradas da Inbox e mostra o estado operacional da Central.
- Adiciona ao repositório as Edge Functions atualmente publicadas em modo encerrado/pausado.
- Adiciona as migrations que já existem em produção e estavam faltando no histórico local.

## Importante sobre migrations
Estas migrations JÁ FORAM executadas no Supabase de produção. Os arquivos entram no GitHub para manter o histórico do projeto alinhado.

O repositório já possui algumas migrations semanticamente equivalentes com timestamps locais diferentes (Bank, Marketing e pausa do Realtime). Os arquivos deste pacote usam os timestamps registrados em produção. As migrations equivalentes existentes são idempotentes e podem continuar no histórico por enquanto; a consolidação física dos nomes pode ser feita depois com calma.

## Meta
Este pacote NÃO altera:
- central-meta-send
- central-meta-webhook
- tokens Meta
- contas Meta
- inscrições de webhook

Assim ele não conflita com o outro chat que está trabalhando na integração externa da Meta.

## Como aplicar
1. Extraia o conteúdo deste ZIP dentro da pasta raiz `candinho-gestao`.
2. Aceite substituir os arquivos existentes.
3. Abra o GitHub Desktop e confira as alterações.
4. Commit sugerido:

`V16 · Limpeza estrutural, Central pausada e sync Supabase`

5. Faça Push.
6. Aguarde o deploy automático da Vercel.

## Arquivos principais alterados
- src/components/app-shell.tsx
- src/app/(app)/central/page.tsx
- src/app/(app)/central/nexus/page.tsx
- src/app/(app)/dashboard/page.tsx
- supabase/functions/appsheet-import-once/index.ts
- supabase/functions/openai-api-diagnostic/index.ts
- supabase/functions/central-nexus-suggest/index.ts
- migrations de sincronização do Supabase
