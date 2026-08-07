# Candinho V45.8 · Refinamento Comercial + UX

Este pacote não cria um novo módulo.
Ele reorganiza fluxos que já existiam para deixar o ERP mais coerente.

## 1. Comercial: preço normal volta a ser o padrão

Antes:
- a tela Novo Orçamento recebia o estoque depois de
  `applySupplementSalePromotions`;
- ao escolher um produto com promoção ativa, o preço promocional já entrava
  automaticamente.

Agora:
- Novo Orçamento recebe `baseStock`;
- o campo de preço sempre começa no preço normal atual;
- se houver promoção ativa e estoque disponível, surge abaixo do preço:
  - nome da promoção;
  - preço normal → preço promocional;
  - botão `Usar valor promocional`;
- depois de aplicar, o botão vira `Usar preço normal`.

A promoção é uma decisão explícita do vendedor.

## 2. Orçamento e venda deixam de parecer a mesma coisa

### Novo orçamento
Durante a criação:
- Pagamento fica oculto;
- Entrega fica oculta;
- Pós-venda fica oculto;
- o modal não oferece mais "Orçamento confirmado";
- a única ação é `Salvar orçamento`.

Nenhum pagamento, entrega ou baixa é registrado nessa etapa.

### Revisão de orçamento salvo
Ao abrir um orçamento salvo:
- ele pode ser confirmado;
- Pagamento e Entrega continuam fora do orçamento;
- Pós-venda pode ser preparado antes de confirmar;
- quando confirmado, o usuário segue para a venda criada.

Pagamento e entrega pertencem à venda, não à proposta.

As RPCs oficiais `save_budget_quote_v4` e
`confirm_budget_quote_v4` não foram reescritas.

## 3. Nexus Daily · Retorno amanhã

Corrigido o problema visual.

O backend já reagendava a tarefa corretamente, mas o card não recarregava.

Agora:
`Retorno amanhã → Preview → Confirmar → Daily recarrega`

A próxima ação muda imediatamente, igual ao `Adiar 3d`.

## 4. Botões flutuantes saem do caminho

Continuam montados internamente:
- Nexus Copilot;
- Nexus Command;
- Quebra UX;
- Rotina Nexus.

Isso preserva a lógica existente.

Porém os gatilhos fixos deixam de aparecer por cima do conteúdo.

Nova barra normal:
`Ferramentas`

Desktop:
- Meu Dia
- Nexus
- Comando
- Qualidade
- Relatar problema
- rotina ativa, quando existir

Mobile:
- botão/accordion `Ferramentas`
- abre as mesmas opções dentro do fluxo da página

A barra não é `fixed` nem `sticky`.

## 5. Banner individual por produto

Novos campos em `products`:
- `banner_image_url`
- `banner_mobile_image_url`

Novo RPC:
- `set_product_banner_v1`

O upload usa o bucket já existente `product-images`.

### Interno
Na rota:
`/produtos/[id]`

Se houver banner:
- aparece acima do resumo de estoque.

Dentro do painel de imagens:
- gerenciador `Banner individual`;
- Desktop;
- Mobile opcional;
- adicionar;
- trocar;
- remover;
- otimização automática WEBP.

### Vitrine pública
Na rota:
`/catalogo/[slug]`

O banner aparece no topo da página pública.

O RPC público só devolve banner quando:
- página pública está publicada;
- produto está ativo;
- não é restrito;
- categoria de vendas não é Z.

## 6. Primeiro banner oficial

Incluído no pacote:
`public/product-banners/creatina-candinho.webp`

Arte fornecida pelo usuário, apenas convertida para WEBP.
Não houve regeneração da embalagem ou da composição.

Produto vinculado:
`Creatina 300g | Candinho Suplementos`

No telefone, enquanto não houver um banner mobile específico,
o desktop será usado como fallback.

## Banco

As mudanças de banco JÁ foram aplicadas no Supabase oficial:
- `v45_8_product_banners`
- `v45_8_public_product_banner`
- `v45_8_product_banner_snapshot`

A Creatina também JÁ está apontando para:
`/product-banners/creatina-candinho.webp`

Não execute SQL manualmente.

Os arquivos de migration estão no ZIP somente para o GitHub continuar
representando o estado real da produção e para recriação futura do projeto.

## Teste recomendado depois do deploy

### Comercial
1. Abra Novo Orçamento.
2. Escolha um produto sem promoção.
3. Confira preço normal.
4. Escolha produto com Black ativa.
5. Confira que preço normal entra primeiro.
6. Clique `Usar valor promocional`.
7. Clique `Usar preço normal`.
8. Salve o orçamento.
9. Confirme que Pagamento/Entrega não aparecem antes da venda.
10. Abra o orçamento salvo e confirme como venda.
11. Na venda criada, trate pagamento e entrega normalmente.

### Nexus
1. Clique `Retorno amanhã`.
2. Confirme no Preview.
3. Confira se o Daily muda sem recarregar a página manualmente.

### Ferramentas
1. Confirme que não existem mais botões flutuantes cobrindo conteúdo.
2. Teste Nexus pela barra.
3. Teste Ctrl+K pela barra e pelo teclado.
4. Teste Relatar problema.
5. Inicie uma Rotina e confira o progresso na barra.
6. Repita no telefone.

### Banner
1. Abra a Creatina no ERP.
2. Confira o banner no topo.
3. Abra a página pública da Creatina.
4. Confira o banner.
5. Teste enviar banner desktop em outro produto.
6. Teste banner mobile.
7. Remova e adicione novamente.

## Commit sugerido

`V45.8 - refina comercial, orçamento, utilidades e banners de produto`
