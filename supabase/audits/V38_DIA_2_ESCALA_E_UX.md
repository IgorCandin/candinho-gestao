# V38 · Dia 2 — Escala e UX

## Produção antes deste pacote

- Último commit validado: `abaa69f5bbbcad2f04e0140efd3892562dfc69a8`
- Deploy Vercel: READY
- Vendas/Leads já possuem paginação server-side.
- Fitness já usa fotos por SKU/variante no deck.

## ✅ Corrigido neste pacote

### Ficha individual do cliente

Antes:

`getCustomerSales(customerId)`
→ carregava `getSalesHistory()`
→ até 500 vendas da empresa
→ filtrava o cliente em memória.

`getCustomerLeads(customerId)`
→ carregava todos os leads
→ carregava os itens de todos os leads
→ filtrava o cliente depois.

`getCustomerPendingOrders(customerId)`
→ carregava todos os pedidos pendentes
→ filtrava o cliente depois.

Agora:

- vendas filtradas diretamente por `customer_id`;
- leads filtrados diretamente por `customer_id`;
- itens carregados somente para os leads daquele cliente;
- pedidos pendentes filtrados diretamente por `customer_id`.

A tela visual do cliente não foi reescrita.

### Navegação anterior / próximo

Antes:

- Produto: carregava catálogo inteiro;
- Cliente: carregava todos os IDs;
- Venda: carregava todos os IDs;
- Orçamento: carregava todos os IDs;
- Parceiro: carregava todos os IDs;
- Fitness: carregava todos os IDs.

Agora:

`erp_entity_swipe_navigation()`

O banco calcula a vizinhança com `lag/lead` e devolve apenas:

- `previous_id`
- `next_id`

A ordenação de Produto respeita a ordenação comercial já utilizada no catálogo.

## Arquitetura de baixo risco

Foi criado `src/lib/data-scaled.ts`.

O `tsconfig.json` direciona somente o import exato:

`@/lib/data`

para a nova camada.

A camada:

1. reexporta tudo do `data.ts` original;
2. sobrescreve explicitamente apenas:
   - `getCustomerSales`
   - `getCustomerLeads`
   - `getCustomerPendingOrders`
   - `getEntitySwipeNavigation`

Isso evita substituir o arquivo central de dados com milhares de linhas.

## UX

Nenhum CSS consolidado foi substituído neste pacote.

Regra mantida após os problemas de ontem:

> UX aprovada é preservada; correções devem ser cirúrgicas e baseadas em evidência.

### Pente-fino ainda recomendado

- páginas com tabelas acima de centenas de registros;
- histórico de movimentações;
- pedidos de fornecedor;
- parceiros;
- telas de gestão que ainda usam `.limit(500)`;
- testar desktop em zoom 100% antes de alterar estilos.

## Seleção em massa

Já existente / consolidada:

- Produtos → seleção para catálogo;
- Promoções/Produtos → seleção para PDF A4.

Não foi criada duplicidade em outras áreas sem demanda operacional concreta.

## Próximos candidatos

1. Paginação de movimentações de estoque.
2. Paginação de pedidos de fornecedor.
3. Paginação de históricos Fitness.
4. Revisão de queries `.limit(500)`.
5. Auditoria visual módulo por módulo.
