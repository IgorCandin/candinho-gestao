# Teste rápido · UX Lapidação V2

## A. Nexus

1. Abra `/suplementos`.
2. Confira textos do bloco `Comece por aqui`.
3. Abra no celular.
4. Confirme que títulos, resumos e botões estão mais legíveis sem overflow.
5. Abra `/suplementos/nexus` e confira a mesma melhora nos sinais.

## B. Nova Venda

1. Abra `/vendas/nova`.
2. Escolha o estoque CS.
3. Abra o seletor de Produto.
4. Produtos com saldo no CS devem ficar verdes e mostrar `N disp.`.
5. Troque o estoque de origem.
6. A cor/quantidade deve mudar conforme o novo estoque.
7. Produtos sem estoque continuam na lista e a ordem continua alfabética.
8. Confirme que preço, sabor e venda funcionam como antes.

## C. Vitrine

1. Abra `/catalogo` no desktop e celular.
2. Confira botões do Catálogo Assistido: ícone e texto não devem ficar colados.
3. Abra o Nexus Guia.
4. Confira mensagens, campo e botões.
5. Abra um `/catalogo/[slug]`.
6. Confira página, compra e Nexus no celular.
7. Garanta que nenhum card ficou cortado.

## D. Parceiro

1. Abra um `/parceiros/[id]`.
2. Confira `Pendências do cadastro`.
3. Veja percentual e campos faltantes.
4. Clique em `Completar cadastro`.
5. Preencha um campo e salve.
6. Volte e confira o percentual atualizado.

## E. Recompensa antecipada

1. Abra parceria com brinde por meta e ainda abaixo da próxima meta.
2. O botão deve dizer `Registrar antecipada`.
3. Abaixo dele deve mostrar próxima meta + vendas restantes.
4. Se a meta estiver realmente alcançada, deve dizer `Entregar recompensa`.
5. Registrar uma recompensa continua usando o fluxo antigo e baixando estoque
   somente quando produto/estoque forem informados.
