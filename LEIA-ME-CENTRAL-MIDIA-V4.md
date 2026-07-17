# Candinho Central · Mídia Operacional V4

## O que entra neste pacote

- Biblioteca de mídia com filtros por operação, tipo, status da IA e contato.
- Upload de fotos, vídeos e PDFs com vínculo opcional a um contato.
- Cards da biblioteca clicáveis e com indicação de contexto.
- Nova rota `/central/midia/[id]` com visualização individual do arquivo.
- Vínculo de mídia a contato e conversa.
- Reclassificação manual com Nexus para JPEG, PNG e WebP quando `OPENAI_API_KEY` estiver configurada.
- Exibição de categoria, ambiente, produtos reconhecidos, uso sugerido e tags da IA.
- Migration `upgrade_central_media_library_v2` já aplicada no Supabase de produção.
- Hardening do trigger `configure_generic_partner_profile()`, removendo execução direta por `anon`/`authenticated`; o trigger automático continua funcionando.

## Validação

- ESLint: 0 erros; 2 avisos não bloqueantes de `<img>` para URLs assinadas privadas.
- TypeScript: sucesso.
- Next.js production build: sucesso.
- Nova rota dinâmica `/central/midia/[id]` reconhecida no build.

## Importante

As migrations deste ZIP já foram aplicadas no Supabase de produção. Elas estão incluídas apenas para manter o Git sincronizado com o banco.

A classificação por Nexus continua dependendo da configuração de `OPENAI_API_KEY` nos Secrets do Supabase.
