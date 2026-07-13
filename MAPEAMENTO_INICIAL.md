# Mapeamento inicial — AppSheet para sistema próprio

A documentação exportada do AppSheet informa 109 tabelas, 1.709 colunas, 38 slices, 162 views, 22 regras de formatação e 307 ações. O novo sistema não replica essa quantidade: ele consolida estruturas duplicadas e preserva as regras de negócio.

| AppSheet / planilha atual | Destino no novo sistema | Observação |
|---|---|---|
| `ESTOQUE` | `products`, `locations`, `stock_balances` | Produto e saldo deixam de ficar misturados. |
| `MOVIMENTO_GERAL` | `sales`, `sale_items` | Uma venda pode possuir vários itens. Lead permanece sem baixa. |
| `FICHA_CLIENTES` | `customers` + view `customer_summary` | Histórico e total gasto são calculados automaticamente. |
| `LOG_ESTOQUE` | `inventory_movements` | Log imutável; correção gera outro movimento. |
| Transferências / ajustes | funções `transfer_stock` e `set_stock_count` | Operações atômicas e com idempotência. |
| Cancelar venda | função `cancel_sale` | Repetir a ação não devolve estoque duas vezes. |
| Menu Home / Logo | layout do Next.js | Não precisam existir como tabelas. |
| Dashboard | consultas e views | Métricas vêm dos dados reais, não de células auxiliares. |
| Agenda Operacional | módulo futuro `tasks` | Entrará após a migração do núcleo. |
| Pedidos de Fornecedor | módulo futuro `supplier_orders` | Fase seguinte. |
| Rotas / documentos | módulo futuro `routes` e Storage | Fase seguinte. |
| Parceria Pâmella / Itapharma | locais, parceiros e consignação | Será generalizado para qualquer parceiro. |

## Núcleo escolhido para a primeira publicação

1. Autenticação e permissões.
2. Produtos.
3. Locais de estoque.
4. Saldos e movimentações.
5. Vendas e leads.
6. Clientes.
7. Dashboard operacional.

Essa ordem permite testar a parte mais arriscada — estoque e cancelamento — antes de migrar os módulos auxiliares.
