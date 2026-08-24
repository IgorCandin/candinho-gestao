# V45.48 — Relatório de preparação (somente leitura)

Base consultada: `main` no commit `ec828bba4a92d2fd47518e773a0a18aa171ecfb8` (V45.45).

Nenhuma migration V45.48 foi executada em produção durante a preparação deste pacote.

## Snapshot observado em 24/08/2026

| Métrica | Antes |
|---|---:|
| Lembretes de recompra planejados | 239 |
| Lembretes vencidos | 153 |
| Candidatos seguros à limpeza histórica pelo precheck | 102 |
| Pós-vendas planejados | 25 |
| Pós-vendas históricos candidatos à limpeza no snapshot | 0 |
| Oportunidades acionáveis | 216 |
| Oportunidades vencidas | 55 |
| Oportunidades de prioridade alta | 26 |
| Retornos vencidos `later/still_using` encontrados pelo último feedback | 10 |
| `lead_stock_watches` ativos | 2 |
| Clientes únicos nas oportunidades acionáveis | 145 |
| Clientes com mais de uma oportunidade | 59 |
| Linhas de oportunidade excedentes por duplicidade de cliente | 71 |

> Os números podem mudar antes da aplicação. O arquivo `supabase/tests/V45_48_PRECHECK_READONLY.sql`
> deve ser usado como fonte final antes do commit/deploy.

## Depois esperado

A migration não apaga nenhum registro. Ela:
- muda para `cancelled` apenas os lembretes automáticos antigos elegíveis e deixa `cleanup_tag`;
- muda para `cancelled` apenas pós-vendas antigos elegíveis e deixa `cleanup_tag`;
- mantém vendas, clientes, interações, estoque, pagamentos e entregas intactos;
- agrupa contextos comerciais virtualmente por cliente;
- limita a saída da fila a 10 pessoas;
- deixa itens sem estoque em `waiting_stock`;
- deixa cooldown/reagendamento em `waiting_date`;
- não cria novas oportunidades para montar a fila;
- mantém `lead_stock_watches` existentes;
- cria atenção somente para NOVOS/EDITADOS recebíveis que forem explicitamente marcados como "sem data combinada";
- corrige a leitura de lucro por produto alocando o `sales.total_profit` final após desconto;
- encerra apenas os dois sinais históricos exatos já conhecidos do UX Doctor.

## Revisão humana recomendada

1. Rodar o PRECHECK e conferir a quantidade exata de candidatos à limpeza.
2. Conferir por amostra 10 lembretes que seriam encerrados.
3. Conferir os dois `lead_stock_watches` antes/depois.
4. Testar criação de venda a receber:
   - com vencimento;
   - sem vencimento + texto `sem data combinada`;
   - sem vencimento e sem justificativa (deve falhar).
5. Rodar `V45_48_POST_MIGRATION_TESTS.sql`.
