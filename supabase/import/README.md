# Preparação da importação AppSheet

Este diretório contém scripts manuais e revisáveis, fora de `supabase/migrations`. Os arquivos 001–003 já foram aplicados ao schema privado de staging do projeto confirmado; os arquivos 004–006 são somente preparação local e ainda não foram executados.

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
3. `003_validation_queries.sql`: consultas exclusivamente de leitura para reconciliação, incluindo todos os campos das possíveis vendas duplicadas.
4. `004_create_promotion_control.sql`: prepara ledger privado, preimages de rollback e as tabelas públicas ainda ausentes. Não promove registros.
5. `005_promote_validated_run.sql`: define `appsheet_import.promote_run`, mas não a chama.
6. `006_rollback_promotion.sql`: define `appsheet_import.rollback_promotion`, mas não a chama.

Os arquivos 004–006 contêm DDL/DML para uma fase futura e **não devem ser executados** sem aprovação explícita. As chamadas ficam comentadas e a função de promoção recusa qualquer run que não esteja integralmente aprovado, com 2.414 entidades válidas e zero erro.

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
- A célula vazia conhecida de `ESTOQUE`, ID `025`, linha 26, local `CS`, é normalizada para zero somente durante a preparação; a planilha e `raw_rows` permanecem intactos.
- Telefones repetidos geram `duplicate_customer_phone` com severidade `warning`. Telefone nunca é usado para mesclar clientes.

## Mapeamento de entidades

| Destino lógico | Origem principal | Destino público atual/proposto |
| --- | --- | --- |
| Clientes | `FICHA_CLIENTES` | `public.customers` |
| Vendas | `MOVIMENTO_GERAL` (`Venda` e `Cancelado`) | `public.sales` (`record_type = 'sale'`) |
| Leads | `MOVIMENTO_GERAL` (`Lead`) | `public.sales` (`record_type = 'lead'`) |
| Itens vendidos | produto/custo/valor de `MOVIMENTO_GERAL` | `public.sale_items`; quantidade implícita 1 |
| Produtos | `ESTOQUE` | `public.products` |
| Estoque | colunas `Estoque <LOCAL>` de `ESTOQUE` | `public.stock_balances` |
| Movimentações históricas | `LOG_ESTOQUE` e `MOV_ESTOQUE` | `public.inventory_history`, sem reaplicar eventos antigos ao saldo atual |
| Pedidos de fornecedor | `PEDIDOS_FORNECEDOR` | `public.supplier_orders` proposto no 004 |
| Parceiros/fornecedores | `PARCEIROS` e `LISTA_FORNECEDORES` | `public.partners` proposto no 004 |
| Movimentações de parceiros | `MOV_PARCEIROS` | `public.partner_movements` proposto no 004 |
| Pagamentos | status/valor/data de `MOVIMENTO_GERAL` | `public.payments` proposto no 004 e resumo em `public.sales` |
| Entregas | status/data/endereço de `MOVIMENTO_GERAL` | `public.deliveries` proposto no 004 e resumo em `public.sales` |

## Decisões que exigem aprovação

- Confirmar se as três linhas com `Tipo de Registro = Cancelado` são vendas canceladas.
- Confirmar a quantidade implícita `1` por linha de `MOVIMENTO_GERAL`.
- Escolher o modelo público para parceiros, pedidos, pagamentos e entregas.
- Decidir se `LOG_ESTOQUE` e `MOV_ESTOQUE` se complementam ou contêm eventos repetidos.
- O telefone compartilhado por dois clientes foi classificado como warning; os dois IDs permanecem separados.
- As seis assinaturas de venda possivelmente duplicadas permanecem como 12 vendas distintas porque possuem IDs originais diferentes.
- Definir como colunas sem correspondência serão arquivadas ou adicionadas ao novo modelo.

## Promoção e rollback controlados

- Produtos e locais existentes são somente associados; não são sobrescritos.
- Clientes são inseridos por ID/linha original. Telefone não participa da identidade.
- Vendas com assinatura semelhante continuam distintas por proveniência e `idempotency_key`.
- Os 491 eventos de estoque são preservados em `inventory_history`. O saldo operacional é alcançado por no máximo um movimento `adjustment` por produto/local, usando o trigger oficial.
- Cada linha inserida recebe um vínculo privado e um hash pós-promoção. Cada saldo recebe preimage completo.
- A promoção exige transação `SERIALIZABLE` e recusa mudanças nas contagens públicas ou no snapshot de estoque que formam o baseline aprovado.
- O rollback exige transação `SERIALIZABLE` e aborta se detectar edição posterior, dependência nova, hash divergente ou saldo sem preimage correspondente.
- Excluir um movimento não desfaz seu trigger; por isso o rollback restaura `stock_balances` pelos preimages.
- Depois de rollback, a aprovação é invalidada e uma nova promoção exige aprovação explícita.

## Segurança

O staging fica fora do schema `public`, revoga acesso de `anon` e `authenticated`, habilita e força RLS sem políticas para usuários do aplicativo, e expõe funções apenas ao papel administrativo `service_role`. As views usam `security_invoker`. Uma execução aprovada exige status, usuário e data coerentes. Os scripts 004–006 apenas preparam a estrutura e as funções para revisão: não foram instalados nem executados no projeto remoto, e todas as chamadas de promoção/rollback permanecem comentadas.
