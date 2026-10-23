# Sabores provisórios no pedido Company

Cadastro rápido aceita sabores opcionais (um por linha), sem salvar produto ao abrir/confirmar o modal. Um produto provisório aparece nas opções dos outros itens: escolher o mesmo produto e outro sabor mantém uma única chave de cadastro. Editar o provisório atualiza os itens relacionados; seleção removida precisa ser refeita. Produto sem sabor e produtos existentes permanecem possíveis.

A RPC transacional existente cria produto/sabores pelo `create_product_record_v2` já utilizado no cadastro completo, uma única vez por chave. Resolve IDs definitivos no servidor e entrega `flavor_id` correto ao `create_purchase_order` existente. Não introduz CRUD ou recebimento paralelo. Rejeita nomes repetidos/vazios, sabor inexistente, metadados divergentes e mesmo produto/sabor duplicado. Falha posterior reverte tudo.

Migration gerada pelo CLI: `20261023171740_company_purchase_draft_flavors.sql`. Somente substituição da função, sem backfill ou estoque inicial. Aplicar antes da interface; contrato antigo sem sabores continua compatível. Antes de aplicar, corpo atual conferido contra migration anterior por MD5 normalizado (`a2cc0ec24ae7f2134775ee3203c01582`), descartando diferença só de finais de linha. ACL existente preservada.

Validação: SQL antigo reproduziu perda do sabor. PostgreSQL isolado aprovou dois sabores/um produto, sem sabor, duplicidades, inválidos, metadados divergentes, permissões, limite de itens e rollback após falha de pedido/agendamento. Os CRUDs delegados são stubs nesse teste de contrato/atomicidade: não equivale a testar recebimento completo no Supabase. UI real em fixture de hooks verificou dois itens, payload sem UUID fictício de sabor e ausência de RPC antes do submit; suíte 179/179, lint e diff check passaram.

Reproduzir: `PGLITE_MODULE` aponta para instalação temporária de `@electric-sql/pglite@0.3.14`; executar `node scripts/test-purchase-draft-flavors-sql.cjs`. Sem dependência de runtime adicionada ao ERP. Build/produção e QA físico exigem evidências próprias. Nenhum produto, pedido ou recebimento real foi criado para teste.
