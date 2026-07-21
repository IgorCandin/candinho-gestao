# V38 · Orçamento confirmado e escala operacional

## 🔴 Bug real corrigido

Cenário reproduzido com o orçamento #14:

- total: R$ 129,90;
- parceiro: C.T.S. Pâmella Nunes;
- brinde: Coqueteleira;
- estado original: `quoted`.

Ao editar um orçamento existente, `save_budget_quote_v2()` executava:

```sql
delete from public.sales_quote_items where quote_id=v_quote_id;
```

Como a função é `RETURNS TABLE(quote_id uuid, lead_id uuid)`, o PostgreSQL
considerava `quote_id` ambíguo entre variável PL/pgSQL e coluna.

Erro reproduzido:

`column reference "quote_id" is ambiguous`

Correção:

```sql
delete from public.sales_quote_items qi
where qi.quote_id=v_quote_id;
```

## Confirmação mais resistente

`confirm_budget_quote_v2()` agora é idempotente:

- orçamento `quoted` → confirma normalmente;
- orçamento já `confirmed` → devolve a venda existente.

Também foi criado um trigger que, quando o save recebeu campos exclusivos do
modo confirmado, executa a confirmação dentro da mesma transação.

## Teste realista realizado

O orçamento #14 foi simulado com:

- usuário administrador Candinho;
- parceiro C.T.S. Pâmella Nunes;
- brinde Coqueteleira;
- R$ 129,90;
- entrega futura;
- pós-venda agendado.

Resultado dentro de transação com `ROLLBACK`:

- edição: OK;
- confirmação: OK;
- segunda confirmação idempotente: OK.

O orçamento #14 real permaneceu inalterado como `quoted`.

## Escala operacional

### Movimentações Suplementos
- 50 por página;
- busca;
- filtro por tipo.

### Movimentações Fitness
- 50 por página;
- busca por produto, SKU, tamanho, cor e observação;
- filtros Compra / Venda / Conversão.

### Pedidos de fornecedor
- pendentes e histórico separados;
- 30 por página;
- KPIs calculados sobre todos os pendentes;
- ordenação por data, fornecedor e unidades pendentes.

## UX
Nenhum CSS consolidado foi substituído.
