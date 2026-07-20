# V28 · Auditoria — Planejamento Inteligente de Compras

## Escopo

A V28 é uma camada analítica.

Ela não:

- cria pedido automaticamente;
- movimenta estoque;
- recebe mercadoria;
- altera venda;
- altera reserva;
- cancela pedido;
- altera Meta.

Ela lê o estado operacional e produz recomendação.

---

## Fontes usadas no cálculo

### Demanda

- `sales`
- `sale_items`

Filtro:

- `record_type = sale`
- venda não cancelada
- janela máxima de 90 dias

### Estoque

- `inventory_location_overview`
- `locations.counts_for_replenishment = true`

### Faltas de venda

- `stock_reservations`
- status `awaiting_stock` ou `partial`

### A caminho

Já está contido no estoque operacional por meio dos pedidos:

- `purchase_orders`
- `purchase_order_items`

### Produto

- custo
- preço de venda
- estoque mínimo
- estoque ideal
- fornecedor padrão
- controle por sabor

---

## Motor de giro

A demanda diária ponderada não soma janelas acumuladas diretamente.

Ela quebra os últimos 90 dias em três faixas:

- 0–30 dias
- 31–60 dias
- 61–90 dias

Pesos:

- 0,60
- 0,25
- 0,15

Isso reduz a influência de vendas antigas sem apagar completamente o histórico recente.

---

## Produtos virtuais

Produtos ligados a:

`product_combos.legacy_product_id`

são excluídos do planejador.

Resultado validado após a correção:

`virtual_combos_in_planner = 0`

A primeira versão do motor mostrou que combos legados poderiam aparecer como compra sugerida.

A lógica foi corrigida antes da criação do pacote V28.

---

## Estado observado

Snapshot direto da view após a implantação:

- suggested_products = 26
- suggested_units = 40
- suggested_investment = R$ 1.516,33
- potential_profit = R$ 1.154,67
- without_supplier = 0

Prioridades:

- critical = 16 produtos / 17 unidades sugeridas / R$ 968,19
- attention = 2 produtos / 4 unidades sugeridas / R$ 174,92
- monitor = 1 produto / 8 unidades sugeridas / R$ 59,28
- ok = 49 produtos / 11 unidades sugeridas / R$ 313,94

A categoria `ok` pode conter compra sugerida para completar cobertura alvo sem existir risco imediato.

---

## Configuração de fornecedores

Campos adicionados:

- `lead_time_days`
- `target_cover_days`
- `minimum_order_amount`
- `free_shipping_threshold`
- `payment_terms`
- `freight_notes`

Estado inicial:

- 10 fornecedores ativos
- 0 fornecedores automaticamente personalizados

Padrões neutros:

- lead_time_days = 7
- target_cover_days = 30
- minimum_order_amount = 0
- free_shipping_threshold = 0

Nenhuma condição comercial real foi inventada.

---

## Segurança

### purchase_planning_snapshot()

- SECURITY DEFINER = true
- search_path = public
- authenticated EXECUTE = true
- anon EXECUTE = false

A função valida perfil ativo e acesso a Suplementos.

### update_supplier_planning_settings(...)

- SECURITY DEFINER = true
- search_path = public
- authenticated EXECUTE = true
- anon EXECUTE = false

A função exige:

`can_write()`

Também registra:

`audit_events.action = planning_settings_updated`

---

## Sabores

A necessidade é calculada no nível do produto.

Quando:

`flavor_tracking_enabled = true`

o frontend mostra:

`Distribuir compra por sabor`

A V28 não distribui quantidade automaticamente entre sabores.

Essa decisão permanece explícita no pedido do fornecedor.

---

## Compatibilidade

O fluxo existente de pedidos continua usando:

- novo pedido
- pedido em lote
- sabores
- recebimento parcial
- estoque de destino
- agenda de previsão de chegada

O planejador apenas direciona a decisão anterior ao pedido.

---

## Meta

Não houve alteração em:

- central-meta-send
- central-meta-webhook
