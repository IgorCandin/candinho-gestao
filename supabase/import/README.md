# Preparação da importação AppSheet

Este diretório contém scripts manuais e revisáveis, fora de `supabase/migrations`. Os arquivos 001–003 já foram aplicados ao schema privado de staging. Uma versão anterior do 004 foi instalada; a versão atualizada de 004 e as novas versões de 005–006 ainda não foram executadas.

## Estado observado

- Projeto conectado: `candinho-suplementos` (`ilboydbakpcfoaexpnhw`), região `sa-east-1`, PostgreSQL 17.
- O schema público atual contém o núcleo `customers`, `sales`, `sale_items`, `products`, `locations`, `stock_balances` e `inventory_movements`.
- As estruturas públicas auxiliares de parceiros, pedidos, pagamentos, entregas e histórico já foram criadas pelo 004 anterior, mas continuam vazias.
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
| Estoque operacional | inventário físico após o marco zero | `public.stock_balances`, alterado somente por movimentos auditáveis |
| Observações de estoque diferidas | todas as 450 observações de `ESTOQUE` | permanecem no staging e nos vínculos privados; nenhuma define saldo atual |
| Movimentações históricas | `LOG_ESTOQUE`, `MOV_ESTOQUE` e `MOV_PARCEIROS` | `public.inventory_history`, sem reaplicar eventos antigos ao saldo atual |
| Pedidos de fornecedor | `PEDIDOS_FORNECEDOR` | `public.supplier_orders` proposto no 004 |
| Parceiros/fornecedores | `PARCEIROS` e `LISTA_FORNECEDORES` | `public.partners` proposto no 004 |
| Movimentações de parceiros | `MOV_PARCEIROS` | histórico em `public.inventory_history`; `public.partner_movements` permanece operacionalmente vazio |
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

- `BATISTA` é corrigido para `ADRIANA` no mesmo UUID; seus vínculos existentes são preservados.
- `CS`, `CTS`, `ADRIANA`, `ITAPHARMA` e `INGRID` são os cinco locais selecionáveis com capacidade explícita de estoque. `ENRICO` permanece cadastrado sem essa capacidade.
- `ES`, `TT` e `PARCEIROS` não são criados como localizações públicas. As colunas históricas de ES/TT são desconsideradas operacionalmente e continuam rastreáveis somente no staging.
- `locations.tracks_inventory` é a capacidade explícita de estoque; local ou parceiro ativo não vira estoque por inferência.
- `Estoque Empresa` é um total calculado dos locais com `tracks_inventory = true`, não uma localização física.
- Os 450 snapshots de origem continuam rastreáveis e são todos marcados como `deferred`; nenhum deles é materializado.
- Os 39 saldos públicos atuais, somando 125 unidades, são zerados por 39 movimentos `adjustment` com namespace idempotente `inventory_reset_2026_07_14:<produto>:<local>`.
- Cada um dos cinco locais começa sem saldo novo materializado; após o marco zero, quantidades serão informadas somente por inventário físico manual.
- `C.T.S. Pâmella Nunes` é promovida como parceira `Ponto de Retirada` e o local `CTS` pode receber estoque por inventário físico posterior.
- Clientes são inseridos por ID/linha original. Telefone não participa da identidade.
- Vendas com assinatura semelhante continuam distintas por proveniência e `idempotency_key`.
- Os 491 eventos de estoque e os 6 eventos de parceiros são preservados em `inventory_history`. `MOV_PARCEIROS` linha 5, ID `004`, permanece histórico mesmo com parceiro vazio e quantidade zero; não cria parceiro nem movimento operacional.
- Toda venda exige `location_id` de um dos locais ativos com estoque habilitado. A RPC existente baixa os itens exclusivamente nesse local, e o trigger oficial rejeita qualquer resultado negativo.
- Cada linha inserida recebe um vínculo privado e um hash pós-promoção. Cada saldo recebe preimage completo.
- A promoção exige transação `SERIALIZABLE` e recusa mudanças nas contagens públicas ou no snapshot de estoque que formam o baseline aprovado.
- O rollback exige transação `SERIALIZABLE` e aborta se detectar edição posterior, dependência nova, hash divergente ou saldo sem preimage correspondente.
- Excluir um movimento não desfaz seu trigger; por isso o rollback restaura `stock_balances` pelos preimages.
- Depois de rollback, a aprovação é invalidada e uma nova promoção exige aprovação explícita.

## Segurança

O staging fica fora do schema `public`, revoga acesso de `anon` e `authenticated`, habilita e força RLS sem políticas para usuários do aplicativo, e expõe funções apenas ao papel administrativo `service_role`. As views usam `security_invoker`. Uma execução aprovada exige status, usuário e data coerentes. Nesta revisão nenhuma versão atualizada de 004–006 foi instalada e nenhuma chamada de promoção ou rollback foi executada; todas permanecem comentadas.
