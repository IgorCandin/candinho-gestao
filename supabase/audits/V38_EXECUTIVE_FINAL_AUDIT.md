# V38 · Auditoria técnica
## Gestão Executiva e Homologação

## Base

Commit:

`48220e8d2be517193a5686c8a0452040b26a98f7`

Mensagem:

`V37.1 · Corrige typecheck do histórico de parceiros`

Deployment correspondente:

READY.

Runtime errors consultados:

nenhum na janela de 30 minutos usada antes da montagem da V38.

---

## Arquitetura

A V38 é frontend/server-read only.

Novo arquivo:

`src/lib/executive-data.ts`

Nova rota:

`src/app/(app)/central/executivo/page.tsx`

Arquivos de entrada atualizados:

- Dashboard
- Central Home
- globals.css

Novo CSS:

`v38-executive.css`

---

## Fontes de dados

### Vendas Suplementos

`public.sales`

Filtros:

- record_type = sale
- general_status <> cancelled
- quoted_at dentro do mês atual

### Vendas Fitness

`public.fitness_sales`

Filtros:

- general_status <> cancelled
- quoted_on dentro do mês atual

### Recebido no mês

- `sales.paid_at`
- `fitness_sales.paid_on`

### Estoque

`getInventoryOverview()`

### Parceiros

`getPartnersOverview()`

### Bank

`getBankDashboardData()`

### Pós-venda

`post_sale_batches`

### Trocas/devoluções

`return_cases`

### Consignações

`fitness_consignments`

### Marketing

`marketing_projects`

### Sabores

`product_flavor_integrity_overview.integrity_status`

---

## Resultado comercial

Não é DRE contábil.

Usa:

- total_amount
- total_cost
- total_profit

Nome exibido:

`Resultado comercial gerencial`

A interface informa explicitamente que despesas gerais, impostos, taxas e retiradas ainda não foram classificados para uma DRE contábil completa.

---

## Forecast

### 7 dias

Consulta:

- bank_charges_overview
- bank_receivables_overview

Somente itens datados e ainda abertos.

### 30/60/90

Usa:

`bank.annualProjection`

O frontend soma:

- 1 primeiro ciclo
- 2 primeiros ciclos
- 3 primeiros ciclos

---

## Integridade de sabores

Primeira validação técnica encontrou nome de coluna incorreto:

`status`

A coluna real é:

`integrity_status`

O pacote foi corrigido antes da entrega.

Consulta-base validada depois da correção.

Resultado observado:

0 divergências.

---

## Snapshot observado

- supplement_sales_month = 20
- fitness_sales_month = 2
- post_sale_open = 24
- open_returns = 0
- open_consignments = 0
- marketing_projects = 3
- flavor_issues = 0

Os números são dinâmicos.

---

## TypeScript

Arquivos analisados:

- executive-data.ts
- executivo/page.tsx
- dashboard/page.tsx
- central/page.tsx

Diagnostics sintáticos:

0.

---

## Mudanças destrutivas

Nenhuma.

Nenhuma migration é necessária.

Nenhuma Edge Function é alterada.

Nenhuma tabela é alterada.

Nenhum dado é modificado.
