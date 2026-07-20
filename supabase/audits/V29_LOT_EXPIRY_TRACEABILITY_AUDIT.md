# V29 · Auditoria técnica

## Estrutura adicionada

### products

- `lot_tracking_enabled`

### purchase_receipts

- `lot_number`
- `expires_on`

### inventory_movements

- `lot_number`
- `expires_on`

### tabelas

- `inventory_lots`
- `inventory_lot_movements`

### views

- `inventory_lot_overview`
- `inventory_lot_coverage_overview`
- `inventory_lot_traceability`

## Motor automático

Trigger:

`zz_inventory_movements_apply_lot_tracking`

Executa depois de:

`inventory_movements_apply_balance`

Isso permite que a camada de lote acompanhe o movimento físico já validado pelo
motor oficial de estoque.

## Saídas

### Venda

- usa lote válido;
- ignora quarentena;
- ignora lote vencido;
- ordena por validade mais próxima;
- registra a ligação venda ↔ lote.

### Transferência

- baixa o lote na origem;
- recria/atualiza o mesmo lote no destino;
- preserva validade.

### Cancelamento

- consulta os lotes usados na venda;
- restaura as quantidades nos lotes originais;
- marca a quantidade já restaurada para evitar duplicidade.

### Ajuste

Estoque legado sem lote é consumido primeiro em ajuste negativo.

Depois, quando necessário, o ajuste pode consumir saldo rastreado.

## Compatibilidade

Produtos sem `lot_tracking_enabled` continuam funcionando como antes.

Nenhum produto foi ativado automaticamente.

O frontend antigo também não consegue quebrar silenciosamente um produto já
ativado: um recebimento `purchase` sem lote/validade é bloqueado pelo trigger.

## Estado validado

Após migrations e teste rollback:

- tracking_products = 0
- lot_rows = 0
- lot_movement_rows = 0
- persisted_test_lots = 0
- receipts_with_lot = 0

Isso confirma ausência de migração inventada de estoque histórico.

## Segurança

RPCs auditadas:

- `classify_legacy_inventory_lot`
- `inventory_lot_dashboard_snapshot`
- `receive_purchase_order_item_v2`
- `set_inventory_lot_quarantine`
- `set_product_lot_tracking`

Todas:

- SECURITY DEFINER
- search_path=public
- authenticated EXECUTE=true
- anon EXECUTE=false

Internas:

- `get_or_create_inventory_lot`
- `apply_inventory_lot_tracking`

Não ficam abertas para uso direto de `authenticated`/`anon`.

## Observação operacional

FEFO perfeito começa conforme o estoque é classificado.

Enquanto existirem unidades históricas sem lote, elas aparecem como
`legacy_untracked`.

A V29 não inventa qual lote era uma unidade antiga.

## Meta

Nenhuma Edge Function da Meta foi alterada.
