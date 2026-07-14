# Preparação da importação AppSheet

Este diretório contém uma proposta local e revisável. Nenhum SQL daqui foi aplicado ao Supabase e os arquivos não estão em `supabase/migrations`, portanto não participam do fluxo normal de deploy.

## Estado observado

- Projeto conectado: `candinho-suplementos` (`ilboydbakpcfoaexpnhw`), região `sa-east-1`, PostgreSQL 17.
- O schema público atual contém o núcleo `customers`, `sales`, `sale_items`, `products`, `locations`, `stock_balances` e `inventory_movements`.
- Ainda não existem destinos públicos próprios para parceiros, pedidos de fornecedor, pagamentos e entregas.
- Leads usam `public.sales.record_type = 'lead'`.
- Produção já contém `public.appsheet_import_runs`, `public.appsheet_import_raw_rows` e `public.appsheet_import_chunks`, além de cinco migrações remotas de importação que não estão na pasta local. Esta proposta não reutiliza nem altera esses objetos: usa o schema privado `appsheet_import` para evitar colisão e exposição pela Data API.
- A comparação somente leitura confirmou os 75 produtos da aba `ESTOQUE` em `public.products`, por nome exato.

## Arquivos e ordem proposta

1. `001_create_private_staging.sql`: cria o schema privado, tabelas de execução/linhas brutas/entidades preparadas/erros e funções idempotentes de staging.
2. `002_prepare_entities.sql`: transforma somente staging em clientes, vendas, leads, itens, produtos, saldos, movimentações, pedidos, parceiros, pagamentos e entregas preparados.
3. `003_validation_queries.sql`: consultas exclusivamente de leitura para reconciliação.

Não existe SQL de promoção para `public.*` nesta etapa. Ele só deve ser escrito após aprovação do relatório, definição das tabelas públicas ausentes e resolução das duplicidades.

## Fluxo local

```powershell
npm run data:stage -- --workbook ".\data-import\Finanças (3).xlsx" --output ".\data-import\generated"
npm run data:analyze
```

Os NDJSON, o manifesto e o relatório ficam em `data-import/generated/`. Toda a pasta `data-import/` está no `.gitignore`, pois contém dados pessoais de clientes.

## Idempotência e rastreabilidade

- A execução é identificada pelo SHA-256 do XLSX (`import_runs.source_sha256` único).
- A linha bruta usa a chave `(import_run_id, source_sheet, source_row)`.
- Cada entidade preparada usa `(import_run_id, entity_type, source_sheet, source_row, source_subkey)`.
- Repetir staging atualiza o payload da mesma linha; não cria uma segunda cópia.
- Duplicidades de ID do AppSheet são preservadas e reportadas, não bloqueadas por uma restrição única.
- Cada linha bruta e preparada mantém ID original, aba, linha original e data de importação.
- Toda entidade começa com `approved_for_promotion = false`; a execução começa com `final_import_approved = false`.

## Mapeamento de entidades

| Destino lógico | Origem principal | Destino público atual/proposto |
| --- | --- | --- |
| Clientes | `FICHA_CLIENTES` | `public.customers` |
| Vendas | `MOVIMENTO_GERAL` (`Venda` e `Cancelado`) | `public.sales` (`record_type = 'sale'`) |
| Leads | `MOVIMENTO_GERAL` (`Lead`) | `public.sales` (`record_type = 'lead'`) |
| Itens vendidos | produto/custo/valor de `MOVIMENTO_GERAL` | `public.sale_items`; quantidade implícita 1 |
| Produtos | `ESTOQUE` | `public.products` |
| Estoque | colunas `Estoque <LOCAL>` de `ESTOQUE` | `public.stock_balances` |
| Movimentações | `LOG_ESTOQUE` e `MOV_ESTOQUE` | `public.inventory_movements` |
| Pedidos de fornecedor | `PEDIDOS_FORNECEDOR` | nova tabela pública necessária |
| Parceiros/fornecedores | `PARCEIROS` e `LISTA_FORNECEDORES` | nova tabela pública necessária |
| Movimentações de parceiros | `MOV_PARCEIROS` | nova tabela pública necessária |
| Pagamentos | status/valor/data de `MOVIMENTO_GERAL` | nova tabela pública necessária |
| Entregas | status/data/endereço de `MOVIMENTO_GERAL` | nova tabela pública necessária |

## Decisões que exigem aprovação

- Confirmar se as três linhas com `Tipo de Registro = Cancelado` são vendas canceladas.
- Confirmar a quantidade implícita `1` por linha de `MOVIMENTO_GERAL`.
- Escolher o modelo público para parceiros, pedidos, pagamentos e entregas.
- Decidir se `LOG_ESTOQUE` e `MOV_ESTOQUE` se complementam ou contêm eventos repetidos.
- Resolver um grupo de clientes duplicados e seis assinaturas de venda possivelmente duplicadas identificados no relatório local.
- Definir como colunas sem correspondência serão arquivadas ou adicionadas ao novo modelo.

## Segurança

O staging proposto fica fora do schema `public`, revoga acesso de `anon` e `authenticated`, habilita e força RLS sem políticas para usuários do aplicativo, e expõe funções apenas ao papel administrativo `service_role`. As views usam `security_invoker`. Uma execução aprovada exige status, usuário e data coerentes; ainda assim, não há função de promoção nesta proposta.
