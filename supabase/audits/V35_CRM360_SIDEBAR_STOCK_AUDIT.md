# V35 · Auditoria técnica
## CRM Company 360º + Sidebar desktop + Estoque baixo/zerado

## Base

Commit esperado:

`7c93178495ae38f099da33675d814d0b03f68f6d`

V34.1.

---

## Sidebar

Implementação:

`DesktopSidebarController`

Persistência:

`localStorage`

Chave:

`candinho:desktop-sidebar-collapsed`

Breakpoints:

- desktop: `min-width: 821px`
- mobile: botão oculto

A classe aplicada ao shell é:

`sidebar-collapsed`

Nenhum comportamento do menu móvel foi substituído.

---

## Estoque gerencial

Fonte:

`getInventoryOverview()`

Critério estoque baixo:

`available_quantity > 0`
`min_stock > 0`
`available_quantity <= min_stock`

Critério zerado:

`available_quantity <= 0`

Snapshot observado:

- total: 72
- baixo: 7
- zerado: 29

O painel não altera saldos.

---

## CRM 360

Nova função:

`customer_company_360_snapshot(uuid)`

Eventos consolidados:

- supplements_sale
- lead
- interaction
- post_sale
- fitness_sale
- consignment
- return_case

Máximo:

100 eventos por snapshot.

Frontend mostra os 30 mais recentes.

---

## Regra de identidade

Nunca usar nome como chave de fusão.

Fitness é relacionada por:

`regexp_replace(phone,'\D','','g')`

Somente quando o telefone normalizado possui pelo menos 8 dígitos.

A correspondência é somente de leitura.

---

## Permissões

Validação no banco:

- `prosecdef = true`
- `search_path = public`
- authenticated EXECUTE = true
- anon EXECUTE = false

Fitness só é consultada quando:

`can_access_operation('fitness') = true`

A função exige:

`can_access_operation('supplements') = true`

---

## Teste 1

Cliente somente Suplementos.

Snapshot retornou:

- supplements_sales_count: 1
- supplements_spent: 64.90
- lead_count: 3
- interaction_count: 1
- post_sale_total_count: 1
- timeline_count: 6

---

## Teste 2

Identidade presente em Suplementos e Fitness.

Snapshot retornou:

- supplements_sales_count: 3
- fitness_sales_count: 1
- supplements_spent: 169.70
- fitness_spent: 14.90
- total_company_spent: 184.60
- fitness_identity_count: 1
- timeline_count: 4

---

## Mudanças destrutivas

Nenhuma.

A V35 não:

- funde customers;
- altera fitness_customers;
- reescreve vendas;
- cria histórico fictício;
- altera Meta;
- altera Marketing;
- reativa Inbox.

---

## TypeScript

6 arquivos TS/TSX analisados.

Erros sintáticos:

0.
