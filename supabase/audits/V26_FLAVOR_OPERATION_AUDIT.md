# V26 · Auditoria — Controle de Sabores

## Princípio arquitetural

A V26 não transforma sabores em produtos diferentes.

Modelo adotado:

`products`
→ produto comercial principal

`stock_balances`
→ saldo físico agregado oficial por produto/local

`product_flavors`
→ sabores opcionais do produto

`product_flavor_stock_balances`
→ composição do saldo agregado por sabor/local

Invariante operacional após ativação:

`Σ estoque físico dos sabores por local = estoque físico agregado do produto por local`

Movimentos novos de produto com sabor atualizam os dois níveis.

---

## Estado anterior preservado

Durante a implantação foi verificado:

- produtos existentes com `flavor_tracking_enabled=true`: 0
- linhas criadas automaticamente em `product_flavors`: 0

Portanto nenhum produto existente mudou de comportamento automaticamente.

---

## Estruturas adicionadas

### products

- `flavor_tracking_enabled`
- `flavor_tracking_started_at`

### tabelas novas

- `product_flavors`
- `product_flavor_stock_balances`
- `sale_item_flavor_allocations`

### flavor_id adicionado a

- `sale_items`
- `sales_quote_items`
- `stock_reservations`
- `inventory_movements`
- `purchase_order_items`
- `purchase_receipts`

---

## Histórico

O histórico anterior ao controle de sabores é preservado.

`sale_item_flavor_allocations` permite classificar uma venda histórica sem
alterar o `sale_item`.

Exemplo:

sale_item.quantity = 2

allocations:

- Maçã Verde = 1
- Ice = 1

A soma precisa ser exatamente 2.

Essa operação:

- não cria inventory_movement;
- não altera stock_balances;
- não altera valor da venda;
- não altera lucro;
- apenas acrescenta classificação histórica.

---

## Ativação controlada

Antes de ativar sabores em produto existente, `configure_product_flavors`
valida:

1. lista de sabores;
2. duplicidade de nomes;
3. estoque físico atual em cada local;
4. distribuição exata do estoque entre sabores.

A ativação também é protegida por trigger.

É bloqueada quando existe:

- reserva/venda pendente antiga sem sabor;
- pedido de fornecedor pendente sem sabor.

Isso impede ativar uma dimensão nova enquanto existem compromissos antigos que
não podem ser associados corretamente a um sabor.

---

## Desativação

Após ativado, o controle por sabor do produto não pode ser simplesmente
desligado.

Isso preserva:

- histórico;
- reservas;
- movimentos;
- pedidos;
- consistência do estoque.

Um sabor individual também não pode ser desativado enquanto possuir:

- estoque físico;
- reserva;
- venda aguardando estoque;
- pedido pendente.

---

## Venda e orçamento

O frontend V26 utiliza:

- `save_budget_quote_v2`
- `confirm_budget_quote_v2`

Produtos com sabor exigem `flavor_id`.

Produtos sem sabor exigem `flavor_id=null`.

A mesma combinação produto+sabor não pode ser duplicada no mesmo orçamento,
mas o mesmo produto pode aparecer em sabores diferentes.

Ao confirmar:

- `sale_items.flavor_id` é preservado;
- `stock_reservations.flavor_id` é preservado;
- movimento de entrega imediata recebe `flavor_id`.

---

## Leads

Lead não reserva estoque.

A exceção de permitir `sale_items.flavor_id=null` em lead é intencional.

Isso permite registrar interesse antes de a pessoa escolher o sabor.

`create_lead_v2` aceita sabor opcional.

No orçamento/venda, a escolha passa a ser obrigatória.

---

## Estoque

RPCs V26:

- `register_inventory_adjustment_v2`
- `register_inventory_count_v2`
- `transfer_inventory_v2`

Produtos com sabor exigem flavor_id.

Produtos sem sabor continuam operando sem flavor_id.

`allocate_available_stock_v2` aloca reposições somente para reservas do mesmo
produto + local + sabor.

A função interna não é executável diretamente por `authenticated`.

---

## Fornecedores

`purchase_order_items` agora suporta flavor_id.

A restrição antiga:

`unique(purchase_order_id, product_id)`

foi substituída por unicidade lógica:

`purchase_order_id + product_id + flavor_id`

Assim é permitido:

- Produto X · Maçã · 6
- Produto X · Ice · 6

no mesmo pedido.

O recebimento grava o sabor em:

- `purchase_receipts`
- `inventory_movements`

e aloca somente vendas aguardando o mesmo sabor.

---

## Entrega

`mark_sale_delivered` foi endurecida.

Para venda nova de produto com sabor:

- o item precisa possuir flavor_id;
- o estoque daquele sabor é validado;
- o movimento baixa aquele flavor_id.

A função valida toda a venda antes de iniciar as baixas para reduzir risco de
conclusão parcial.

---

## Cancelamento

`cancel_sale` foi endurecida.

Venda nova:

- restaura o flavor_id nativo do item.

Venda histórica:

- exige classificação completa em `sale_item_flavor_allocations`;
- restaura cada sabor na quantidade classificada.

Se a venda histórica ainda não estiver classificada, o cancelamento é
bloqueado com mensagem explícita.

---

## Brindes

O fluxo automático de brinde permanece sem flavor_id.

Por segurança, produtos com controle por sabor são bloqueados nesse campo.

Eles devem ser adicionados como item normal do orçamento para que o sabor seja
selecionado.

---

## Views

Criadas ou ampliadas:

- `product_flavor_inventory_overview`
- `product_flavor_summary`
- `product_flavor_history_pending`
- `sale_item_flavor_display`
- `inventory_product_reservations`
- `inventory_movement_history`
- `supplier_order_items_overview`
- `supplier_order_summary`

As views existentes tiveram as colunas antigas preservadas antes de acrescentar
campos novos, evitando quebra de consumidores atuais.

---

## Segurança validada

Tabelas novas para `authenticated`:

- SELECT = true
- INSERT = false
- UPDATE = false
- DELETE = false

RPCs críticas V26 auditadas:

- `classify_historical_sale_item_flavors`
- `configure_product_flavors`
- `confirm_budget_quote_v2`
- `register_inventory_adjustment_v2`
- `register_inventory_count_v2`
- `save_budget_quote_v2`
- `transfer_inventory_v2`

Resultado:

- SECURITY DEFINER = true
- search_path = public
- authenticated EXECUTE = true
- anon EXECUTE = false

---

## Compatibilidade com frontend anterior

O backend foi implantado antes do frontend V26.

Isso é seguro porque:

- nenhum produto foi ativado automaticamente;
- produtos atuais continuam sem exigir sabor;
- a nova lógica só entra em ação após ativação explícita.

Depois que um produto for ativado, triggers impedem que um frontend antigo
grave silenciosamente operações críticas sem sabor.

---

## Meta

Nenhuma Edge Function da Meta foi alterada.

Preservadas:

- `central-meta-send`
- `central-meta-webhook`


---

## Validação final antes do ZIP

### Banco

Estado consultado após todas as migrations V26:

- enabled_products: 0
- flavor_rows: 0
- flavor_balance_rows: 0
- historical_allocation_rows: 0

Isso confirma que a implantação do backend não alterou nenhum produto existente
nem inventou classificação histórica.

### Grants

Para:

- product_flavors
- product_flavor_stock_balances
- sale_item_flavor_allocations

Resultado para `authenticated`:

- SELECT = true
- INSERT = false
- UPDATE = false
- DELETE = false

### Funções verificadas

- cancel_sale
- classify_historical_sale_item_flavors
- configure_product_flavors
- confirm_budget_quote_v2
- create_lead_v2
- create_product_record_v2
- mark_sale_delivered
- register_inventory_adjustment_v2
- register_inventory_count_v2
- save_budget_quote_v2
- transfer_inventory_v2
- update_product_record_v2

Todas retornaram:

- security_definer = true
- search_path = public
- authenticated_execute = true
- anon_execute = false

### Frontend do pacote

Checagem de sintaxe TS/TSX:

- 16 arquivos
- 0 erros sintáticos

Varredura de escrita direta nos arquivos novos de `src`:

- `.insert(` = 0
- `.update(` = 0
- `.delete(` = 0
- `.upsert(` = 0

As mutações novas são feitas por RPC.
