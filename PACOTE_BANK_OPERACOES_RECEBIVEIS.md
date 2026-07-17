# Candinho Bank — À Receber nas Operações + Projeção Suplementos

## O que entrou

- Integração ao vivo dos valores a receber da Candinho Suplementos e Candinho Fitness na Bank.
- Nova rota `/bank/operacoes` com detalhamento e link direto para cada venda na operação de origem.
- Novo card clicável `À receber nas operações` no Dashboard da Bank.
- Nova entrada de menu `À Receber Operações`.
- Projeção conservadora da Candinho Suplementos calculada dinamicamente com os 3 últimos meses fechados:
  - abril/2026: R$ 943,60 de lucro
  - maio/2026: R$ 1.784,57 de lucro
  - junho/2026: R$ 1.198,37 de lucro
  - média: R$ 1.308,85
  - fator conservador: 70%
  - projeção mensal: R$ 916,19
- A projeção de R$ 916,19 entra a partir do próximo mês. O mês atual usa apenas valores reais ainda pendentes nas operações, evitando dupla contagem.
- A Visão Anual agora discrimina:
  - Contas a receber da Bank
  - Rendas recorrentes
  - À receber das operações
  - Projeção Suplementos 70%

## Valores atuais encontrados na implantação

- Candinho Suplementos: 5 vendas a receber, R$ 489,60.
- Candinho Fitness: 5 vendas a receber, R$ 209,50.
- Total confirmado a receber nas operações: R$ 699,10.

## Comparação com o financeiro antigo

A lógica antiga separava saldo real, entradas, saídas e projeção mensal/anual. O novo desenho mantém essa ideia, mas sem duplicar os dados das operações: vendas pendentes continuam nas tabelas de Suplementos/Fitness e a Bank apenas consulta e consolida.

## Banco de dados

Migration: `20260717010000_integrate_operation_receivables_bank.sql`

Funções:
- `bank_get_operation_receivables()`
- `bank_get_supplements_profit_projection()`
- `bank_get_annual_projection()` atualizada
