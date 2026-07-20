# V33 · Auditoria técnica — Inteligência de Estoque

## Escopo

Operações:

- Candinho Suplementos
- Candinho Fitness

A V33 é somente leitura analítica.

Não altera:

- saldos;
- pedidos;
- vendas;
- reservas;
- consignações;
- recebimentos;
- lotes;
- sabores;
- Meta.

---

## Suplementos

### Fontes reutilizadas

- `purchase_planning_overview`
- `inventory_lot_overview`
- `products`
- `sales`
- `sale_items`

Isso preserva a lógica já consolidada de:

- estoque físico;
- reserva;
- disponível;
- a caminho;
- backlog;
- cobertura;
- prioridade de compra;
- lote/validade.

### Nova view

`inventory_intelligence_overview`

### Nova RPC

`inventory_intelligence_snapshot()`

---

## Fitness

### Fontes reutilizadas

- `fitness_stock_operational`
- `fitness_variants`
- `fitness_sales`
- `fitness_sale_items`
- `fitness_consignments`
- `fitness_consignment_items`

### Nova view

`fitness_inventory_intelligence_overview`

### Nova RPC

`fitness_inventory_intelligence_snapshot()`

---

## Curva ABC

Janela:

90 dias.

Critério:

faturamento real não cancelado.

Faixas:

- A até 80% acumulado
- B até 95%
- C restante
- N sem faturamento

Fitness:

A classificação é calculada por produto e aplicada às variações.

---

## Estoque parado

### 60 dias

Marcado como giro lento.

### 90 dias

Marcado como estoque parado.

Proteção para produtos/variações novas:

se nunca houve venda, a idade do cadastro precisa atingir o mesmo limite.

---

## Excesso

Suplementos:

`available + incoming - target_units`

Só vira `overstock` se:

- receita 90d = 0;

ou:

- cobertura > max(target_cover_days * 2, 60).

Fitness:

`available + incoming - reorder_target`

Só vira `overstock` se:

- receita da variação 90d = 0;

ou:

- cobertura estimada > 60 dias.

---

## Validade

Somente Suplementos.

A V33 lê a camada V29.

Não cria lote e não modifica FEFO.

---

## Consignação

Somente Fitness.

A V33 calcula:

- quantidade ainda em prova;
- quantidade com prazo de retorno vencido;
- quantidade de consignações vencidas.

Não fecha nem altera consignação.

---

## Estado validado — Suplementos

- total_products = 68
- action_products = 43
- stagnant_products_90d = 5
- stagnant_capital_90d = R$ 154,11
- excess_products = 16
- excess_capital = R$ 1.025,53
- critical_products = 16
- urgent_products = 0
- attention_products = 2
- expired_units = 0
- expires_30_units = 0
- expires_90_units = 0
- stock_cost_value = R$ 3.285,76

ABC:

- A = 18
- B = 13
- C = 9
- N = 28

---

## Estado validado — Fitness

- total_variants = 62
- total_products = 25
- action_variants = 59
- out_of_stock_variants = 26
- low_stock_variants = 8
- excess_variants = 26
- excess_capital = R$ 685,37
- stock_cost_value = R$ 875,40
- consigned_units = 0
- overdue_consigned_units = 0
- stagnant_variants_90d = 0

---

## Segurança

### inventory_intelligence_snapshot

- SECURITY DEFINER = true
- search_path = public
- authenticated_execute = true
- anon_execute = false

### fitness_inventory_intelligence_snapshot

- SECURITY DEFINER = true
- search_path = public
- authenticated_execute = true
- anon_execute = false

As views usam `security_invoker=true`.

---

## Runtime audit da V32

Commit confirmado:

`dc505809bb3e3ebad1d0105caf5134f5f61bbf09`

Deployment:

- READY
- production

Durante a janela de 30 minutos foi detectado erro atual em:

`/parceiros/[id]`

Erro:

`column inventory_history.product does not exist`

Causa:

consulta antiga no arquivo:

`src/lib/partner-legacy-history.ts`

Correção incluída na V33:

- remove seleção da coluna inexistente;
- usa `product_id` e relação `products(name)`;
- não altera dados legados.

Um erro de permissão de `supplier_product_price_summary` também apareceu na janela,
mas seu último deployment associado era a primeira publicação V32, anterior aos
commits de proteção/correção subsequentes.

---

## Meta

Nenhuma alteração em Edge Functions Meta.
