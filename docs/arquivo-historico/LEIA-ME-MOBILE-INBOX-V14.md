# Candinho Company · Mobile + Inbox V14

## Mobile
- O botão Menu passa para o lado esquerdo.
- O menu abre como uma gaveta lateral esquerda, seguindo a lógica da sidebar do PC.
- O botão Voltar fica do lado direito nas páginas internas.
- Nas telas iniciais de Suplementos, Fitness, Bank e Marketing, a barra de cabeçalho móvel deixa de ocupar espaço.
- Nessas telas iniciais fica somente um botão compacto `Menu` no canto superior esquerdo.

## Inbox
Novo botão `Excluir do Inbox`.

Ao confirmar:
- apaga a conversa somente da Candinho Central;
- apaga as mensagens locais dessa conversa;
- apaga insights locais vinculados por cascade;
- remove anexos do Storage que pertencem ao fluxo de WhatsApp da própria conversa;
- NÃO apaga nada no WhatsApp/Meta;
- mantém o contato e a identidade do cliente;
- se o cliente enviar uma nova mensagem, o webhook recria a conversa automaticamente no Inbox.

A Edge Function `central-delete-conversation` já foi publicada no Supabase de produção durante a montagem deste pacote.

## Aplicação
Extraia o ZIP na raiz de `candinho-gestao`, substitua os arquivos e faça commit + push.

Commit sugerido:
`Mobile + Inbox V14 · Menu lateral e excluir conversa local`
