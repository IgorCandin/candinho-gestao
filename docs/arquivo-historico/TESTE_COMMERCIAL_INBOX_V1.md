# Teste — Commercial Inbox V1

## A. Confirmar deploy

1. Commitar o pacote.
2. Confirmar Vercel como READY.
3. O build não deve mais apontar nullability em `public-storefront-company-ux.tsx`.

## B. Testar o interesse já existente

1. Abrir `/leads`.
2. No topo deve aparecer `Inbox Comercial`.
3. Deve existir o interesse de teste do Abduzido como `Novo`.
4. Abrir o lead e confirmar:
   - cliente;
   - Abduzido;
   - observação `Origem: Catálogo público`;
   - contexto do pedido.

## C. Fluxo de atendimento

1. Na Inbox, clicar `WhatsApp`.
2. O item deve mudar de `Novo` para `Em atendimento`.
3. Clicar `Já chamei`.
4. Deve ir para `Aguardando cliente`.
5. Clicar `Pronto para fechar`.
6. Deve ir para `Pronto para fechar`.
7. Abrir `Nexus / mensagem` e testar o gerador já existente no lead.

## D. Novo pedido real pela vitrine

1. Abrir uma página pública de produto em janela anônima.
2. Clicar `Quero comprar`.
3. Informar nome e telefone de um cliente já existente.
4. Enviar.
5. Abrir `/leads` na operação.
6. Confirmar que:
   - aparece na Inbox;
   - o cliente não foi duplicado;
   - foi criado/reutilizado um lead normal;
   - produto está vinculado;
   - contexto está nas observações.

## E. Anti-duplicação

1. Repetir o mesmo pedido com o mesmo telefone/produto em menos de 24h.
2. Não deve aparecer um segundo item igual na Inbox.

## F. Conversão

1. Levar o item até `Pronto para fechar`.
2. Abrir o lead.
3. Converter pelo fluxo normal.
4. Confirmar a venda.
5. Voltar à Inbox.
6. O item convertido deve ter saído da fila ativa.
7. O lead/venda continuam no histórico.

## G. Encerramento sem venda

1. Em outro item, clicar `Encerrar`.
2. Ele deve sair da Inbox ativa.
3. O registro bruto não deve ser apagado.
