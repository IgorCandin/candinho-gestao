# Candinho Marketing Nativo V1

## Por que antes o PDF ia para a Central?
Porque o Marketing era apenas uma camada visual. Os links da Home e da sidebar apontavam literalmente para:
- `/central/midia?scope=marketing`
- `/central/agenda?scope=marketing`

O upload da Central apenas salvava o arquivo em `central_media_assets`. PDFs não eram classificados e nenhuma tabela/página de Marketing existia.

## O que este pacote cria
- `/marketing/ideias`
- `/marketing/ideias/[id]`
- `/marketing/planejamento`
- Upload de ideia ou PDF dentro do próprio Marketing.
- Tabela `marketing_projects`.
- Um projeto/página por PDF.
- Edge Function `marketing-pdf-ingest`.
- Interpretação do PDF pelo Nexus/OpenAI.
- Extração de:
  - título;
  - resumo;
  - objetivo;
  - produto/tema;
  - formato;
  - público;
  - gancho;
  - roteiro;
  - CTA;
  - seções.
- Os 3 PDFs já enviados pela Central com escopo Marketing foram migrados para `marketing_projects` como `pending`.
- Ao abrir `/marketing/ideias` pela primeira vez após o deploy, eles são processados automaticamente um a um.

## Já aplicado fora do ZIP
- Migration `marketing_native_ideas_projects` já aplicada no Supabase de produção.
- Edge Function `marketing-pdf-ingest` já publicada e ativa no Supabase.

## Compatibilidade com o menu atual
A sidebar ainda possui links antigos para URLs da Central. Para não quebrar o arquivo compartilhado `app-shell.tsx`, este pacote adiciona redirecionamento automático:
- `/central/midia?scope=marketing` -> `/marketing/ideias`
- `/central/agenda?scope=marketing` -> `/marketing/planejamento`

Assim, mesmo clicando no menu antigo, o usuário permanece visualmente dentro da Operação Marketing.

## Commit sugerido
`Marketing Nativo V1 · PDFs viram páginas de roteiro com Nexus`
