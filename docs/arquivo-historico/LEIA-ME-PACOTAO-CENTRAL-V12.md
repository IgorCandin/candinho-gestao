# Candinho Company — Pacotão Central V12

## Incluído

### Login
- Ordem correta no desktop: Suplementos | Fitness | Bank | Central | Marketing.
- No telefone/tablet, a faixa com nomes/logos das operações fica oculta.
- Mantém a Company como identidade principal.
- Reforça a logo Company na tela de escolha de operação.

### Central Atendimento
- Realtime em `central_messages` e `central_conversations`.
- Inbox atualiza automaticamente sem F5.
- Indicador "Ao vivo".
- Etiquetas coloridas por conversa:
  Novo lead, Orçamento enviado, Aguardando resposta, Aguardando pagamento,
  Venda fechada, Problema/Urgente, Pós-venda e Parceiro.
- Filtro por etiqueta.
- Troca de etiqueta dentro da conversa.
- Campo para anexar imagem, vídeo MP4 ou PDF no WhatsApp.
- Preview do arquivo antes do envio.
- Renderização de imagem, vídeo e arquivo no histórico quando houver mídia persistida.

## Banco
A migration `central_inbox_realtime_labels_media` já foi aplicada no projeto de produção durante a montagem deste pacote.
O arquivo SQL também está incluído no repositório para manter o histórico versionado.

## Atenção — Edge Function
O código novo de `central-meta-send` está incluído em:
`supabase/functions/central-meta-send/index.ts`

A tentativa de deploy automático pela integração foi bloqueada pelas configurações de segurança da ferramenta.
Portanto, o frontend, realtime e etiquetas ficam prontos com o commit; para anexos serem enviados de verdade pela Meta, a nova versão da Edge Function também precisa ser publicada no Supabase.

## Aplicação
1. Extraia o ZIP na raiz de `candinho-gestao`.
2. Revise no GitHub Desktop.
3. Commit + Push.
4. Aguarde o deploy da Vercel.
5. Depois publique `central-meta-send` no Supabase para liberar envio real de anexos.

Commit sugerido:
`Pacotão Central V12 · Realtime, etiquetas, mídia e UX mobile`
