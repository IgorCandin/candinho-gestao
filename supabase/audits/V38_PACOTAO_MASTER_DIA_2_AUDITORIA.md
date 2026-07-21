# V38 · Pacotão Master Dia 2 — Auditoria de escala

## Estado validado antes do pacote

Último deploy de produção do fechamento da noite:
- commit `abaa69f5bbbcad2f04e0140efd3892562dfc69a8`
- estado Vercel: `READY`

## Bloco 1 — Ficha individual do cliente

Corrigido:

- vendas deixam de carregar histórico global para depois filtrar;
- leads deixam de carregar todos os leads da empresa;
- itens de lead são buscados somente para os leads daquele cliente;
- pedidos pendentes são filtrados diretamente no banco.

Consultas passam a usar `customer_id`.

## Bloco 2 — Navegação anterior/próximo

Corrigido para:

- Produto
- Cliente
- Venda
- Orçamento
- Parceiro
- Produto Fitness
- Cliente Fitness
- Venda Fitness

O RPC `erp_entity_swipe_navigation()` devolve apenas os dois vizinhos.

## Bloco 3 — Índices de crescimento operacional

Aplicados:

- `fitness_inventory_movements(created_at desc)`
- `fitness_inventory_movements(variant_id, created_at desc)`
- `fitness_purchase_orders(ordered_on desc, created_at desc)`
- `fitness_purchase_orders(status, ordered_on desc)`
- `inventory_history(product_id, occurred_at desc)`
- `central_messages(sent_at desc)`
- `central_webhook_events(created_at desc)`

Também permanecem os índices aplicados no bloco anterior para:

- vendas por cliente/tipo/data;
- itens por venda;
- ordenação de clientes;
- produtos e clientes Fitness;
- vendas Fitness;
- orçamentos.

## Bloco 4 — Saúde de escala

Criado:

`erp_scale_health_snapshot()`

Snapshot validado na produção no momento da auditoria:

- Vendas: 325
- Itens de venda: 329
- Clientes: 158
- Movimentações: 130
- Histórico de estoque: 496
- Movimentações Fitness: 138
- Pedidos Fitness: 15
- Itens de pedidos Fitness: 77
- Mensagens Central: 429
- Webhooks: 1.286
- Eventos de auditoria: 745

A maior tabela operacional em crescimento entre as exibidas é atualmente
`central_webhook_events`.

## Bloco 5 — Tela read-only

Rota criada:

`/central/executivo/escala`

Apenas usuários com `canManageUsers` acessam.

Ela exibe os contadores de crescimento sem alterar dados.

## UX

Nenhum CSS consolidado foi substituído.

Nenhuma tela aprovada foi redesenhada.

A decisão continua sendo:

> preservar o que já está funcionando e corrigir UX somente com evidência real.

## Pontos que ainda podem crescer no futuro

Os próximos candidatos para paginação visual real são:

1. movimentações de estoque;
2. movimentações Fitness;
3. pedidos de fornecedor;
4. logs/auditoria;
5. mensagens da Central;
6. históricos administrativos extensos.

Esses itens não foram truncados silenciosamente neste pacote.
A decisão foi evitar esconder histórico do usuário apenas para reduzir carga.
A paginação deve ser implementada na UI quando o volume real justificar.
