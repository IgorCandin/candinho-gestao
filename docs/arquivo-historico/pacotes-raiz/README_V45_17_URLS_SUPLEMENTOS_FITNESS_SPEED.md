# V45.17 · URLs canônicas de Suplementos + velocidade Fitness

## O que já estava pronto antes deste pacote

### Nexus Fitness · próxima compra
Já está na `main` e no banco:
- cesta mínima de 10 peças no TOTAL;
- sugestões de 1 ou 2 unidades;
- progresso `X de 10 peças`;
- aceitar / não incluir;
- ajuste manual entre 1 e 2;
- aprendizado por aceitação e recusa;
- migration corretiva `20260810153719_fix_fitness_nexus_purchase_basket_v2`.

Por isso este pacote NÃO altera a migration nem duplica a cesta.

## 1. URLs da operação Suplementos

A operação Suplementos passa a ter URLs canônicas consistentes.

Exemplos:

- `/agenda` -> `/suplementos/agenda`
- `/clientes` -> `/suplementos/clientes`
- `/clientes/:id` -> `/suplementos/clientes/:id`
- `/produtos` -> `/suplementos/produtos`
- `/produtos/:id` -> `/suplementos/produtos/:id`
- `/vendas` -> `/suplementos/vendas`
- `/vendas/nova` -> `/suplementos/vendas/nova`
- `/estoque` -> `/suplementos/estoque`
- `/fornecedores` -> `/suplementos/fornecedores`
- `/orcamentos` -> `/suplementos/orcamentos`
- `/pos-venda` -> `/suplementos/pos-venda`

Também entram no namespace:
`cadastros`, `leads`, `movimentacoes`, `painel-cs`, `parceiros`,
`pedidos-fornecedor`, `pedidos-pendentes` e `trocas`.

### Estratégia segura

Não movemos as pastas físicas antigas neste pacote.

- links antigos recebem redirect temporário para `/suplementos/...`;
- a URL nova usa rewrite interno para a página física existente;
- query string e subrotas continuam funcionando;
- bookmarks antigos continuam válidos;
- não mexe nas rotas `/fitness`, `/bank`, `/central`, `/marketing`,
  `/nexus`, `/dashboard`, `/catalogo`, `/physique` ou `/configuracoes`.

O redirect fica temporário (307) nesta primeira fase para não deixar cache
permanente no navegador caso alguma rota precise ser ajustada.

## Compatibilidade visual e navegação

Enquanto ainda existirem Links antigos como `/vendas/nova` dentro de telas
históricas, uma camada de compatibilidade:

- converte os links renderizados para `/suplementos/...`;
- evita um redirect extra nos cliques normais;
- mantém Comercial / CRM / Estoque destacados no menu correto;
- preserva query string e subrotas.

Essa camada é temporária e pode ser removida quando todos os hrefs do código
forem migrados fisicamente.

## 2. Fitness abre sem esperar o Nexus

Antes, a Home Fitness aguardava:

- acesso;
- resumo;
- vendas;
- pedidos;
- cálculo completo do Nexus;

antes de mostrar a tela.

Agora:
- acesso/resumo/vendas/pedidos carregam juntos;
- a tela é renderizada;
- Nexus entra em `Suspense` e termina em paralelo.

Resultado esperado: sensação de entrada muito mais rápida mesmo se a análise
do Nexus estiver demorando.

## 3. Loading da operação Fitness

Criado `src/app/(app)/fitness/loading.tsx`.

Ao navegar entre telas Fitness, o App Router passa a ter um fallback visual
imediato em vez de parecer que o clique não respondeu.

## 4. Estoque Fitness

A consulta de:
- estoque principal;
- estoque consignado / em prova;
- acesso do usuário;

passa a rodar em paralelo.

Antes, o estoque principal terminava e só depois começava a consulta de
consignados.

## O que NÃO recuperamos do commit antigo

O commit `86a8b8f` também fazia `getFitnessNexusSnapshot()` buscar as sugestões
de compra junto com o snapshot.

Isso NÃO foi restaurado porque a arquitetura atual já possui
`FitnessNexusPurchaseBasketV2`, que busca a cesta separadamente.

Restaurar aquela parte duplicaria trabalho e poderia deixar a Home Fitness
mais lenta novamente.

## Banco

Nenhuma migration nova.

## Próxima fase das URLs

Depois de validar as URLs canônicas em produção, podemos atualizar os links
internos restantes do código para apontarem diretamente para
`/suplementos/...`, eliminando até o pequeno salto de redirect dos links
legados.

## Commit sugerido

`V45.17 - padroniza URLs de Suplementos e acelera Fitness`
