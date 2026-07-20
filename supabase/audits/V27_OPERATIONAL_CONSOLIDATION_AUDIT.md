# V27 · Auditoria de Consolidação Operacional

## Escopo

A V27 fecha três lacunas posteriores à V26:

1. sabores visíveis na visão geral de estoque;
2. sabores visíveis no Portal do Parceiro;
3. seletor de operações sem KPIs duplicados.

---

## V26 verificada

Commit:

`da3a6a513e970161a22386e4d3064b7444975055`

Deployment Vercel correspondente:

`dpl_DcgKk7R6yL9sbNXEY8eyBD87Mh5c`

Estado verificado:

- READY
- production
- `candinho.duckdns.org`
- aliasError = null

Runtime errors consultados com janela explícita de 30 minutos:

- nenhum erro encontrado

---

## Banco V27

Migration aplicada diretamente em produção:

`v27_flavor_integrity_and_partner_portal_v2_fix`

A primeira tentativa foi revertida integralmente pelo Postgres devido a um `ORDER BY` após `UNION`.

A versão corrigida foi aplicada com sucesso.

Não houve estado parcial entre as tentativas.

---

## Integridade de sabores

Criada:

`product_flavor_integrity_overview`

Ela compara:

- agregado físico x físico por sabores
- agregado reservado x reservado por sabores
- agregado a caminho x a caminho por sabores
- histórico antigo ainda sem classificação

A view é `security_invoker=true`.

---

## Portal do Parceiro

Criadas:

- `partner_portal_get_stock_v2()`
- `partner_portal_get_sales_v2(date,date)`

O dashboard do parceiro foi atualizado para consumir as versões V2.

### Estoque

Produto sem sabor:

uma linha por produto.

Produto com sabor:

uma linha por produto + sabor com saldo.

### Vendas

A venda recebe `flavor_summary`.

Esse resumo usa a mesma origem da V26:

`sale_item_flavor_display`

Portanto cobre:

- sabor nativo de venda nova
- classificação histórica

---

## Grants

Funções validadas diretamente no banco:

- `inventory_workspace_snapshot`
- `partner_portal_dashboard`
- `partner_portal_get_stock_v2`
- `partner_portal_get_sales_v2`

Resultado:

- SECURITY DEFINER = true
- search_path = public
- authenticated EXECUTE = true
- anon EXECUTE = false

---

## Estado dos sabores durante a implantação

Consulta realizada antes da mudança visual:

- enabled_products = 0
- active_flavors = 0
- historical_pending = 0

Nenhum produto foi ativado automaticamente.

---

## Frontend

A página `/dashboard` deixa de exibir mini-KPIs no seletor.

A página `/estoque` passa a exibir:

- saúde dos sabores
- divergências
- histórico pendente
- indicador por produto

Nova página:

`/estoque/sabores`

O Portal do Parceiro passa a exibir:

- sabor no estoque
- sabor nas últimas vendas

---

## Meta

Nenhuma função da Meta foi modificada.

Preservadas:

- `central-meta-send`
- `central-meta-webhook`
