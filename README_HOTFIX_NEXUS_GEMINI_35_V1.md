# Hotfix Nexus · Gemini 3.5 Flash-Lite V1

Corrige a falha de produção do Nexus causada pelo modelo antigo
`gemini-2.5-flash-lite`.

## Erro confirmado

A Vercel registrou no `/api/nexus/ask`:

`This model models/gemini-2.5-flash-lite is no longer available to new users.`

## O que muda

### Aplicação Next.js

`src/lib/nexus-ai.ts`

- padrão do Gemini passa para `gemini-3.5-flash-lite`;
- qualquer rota que ainda envie explicitamente
  `gemini-2.5-flash-lite` é remapeada automaticamente;
- variável `GEMINI_NEXUS_MODEL` antiga também é normalizada;
- fallback para OpenAI continua funcionando quando houver
  `OPENAI_API_KEY` e `NEXUS_OPENAI_FALLBACK` não estiver desativado;
- detalhes técnicos do provedor não vazam mais para a interface;
- logs do servidor continuam registrando o código da falha.

Isso corrige de uma vez:
- Nexus Operacional;
- Nexus Fitness;
- campanhas Fitness;
- Nexus Guia do catálogo;
- geração de mensagem de Leads;
- páginas públicas;
- demais rotas que usam `generateNexus`.

### Supabase Edge Functions

`supabase/functions/_shared/nexus-ai.ts`

Aplica a mesma normalização para funções que usam o Nexus compartilhado no
Supabase.

**Atenção:** substituir o arquivo no GitHub não redeploya automaticamente uma
Edge Function já publicada. A correção principal do Nexus do site ocorre pelo
deploy da Vercel. O arquivo compartilhado fica atualizado no repositório para o
próximo deploy das Edge Functions.

## Banco

Sem SQL.
Sem migration.

## Teste depois do deploy

1. `/suplementos/nexus`
   - pergunte: `O que eu deveria priorizar hoje?`
2. `/fitness/nexus`
   - faça uma pergunta simples.
3. `/catalogo`
   - abra o Nexus Guia e faça uma pergunta.
4. Abra um Lead e gere a mensagem do Nexus.
5. Confira na Vercel que não aparece mais:
   `gemini-2.5-flash-lite`

O modelo esperado nos logs/retorno é:
`gemini-3.5-flash-lite`

## Aplicação

Extrair na raiz → substituir → Commit → Push origin

Commit sugerido:

`fix: migra Nexus para Gemini 3.5 Flash-Lite`
