# V45.13.1 · Radar — correção de permissão

## Problema
`/clientes/radar` falhava no Server Component com:

`permission denied for view customer_sales_opportunities_v1`

As views:
- `customer_sales_opportunities_actionable_v2`
- `customer_sales_opportunities_priority_v2`

já tinham SELECT para `authenticated`, mas dependiam da view base
`customer_sales_opportunities_v1`, que não tinha SELECT concedido.

## Correção
Concede somente SELECT na view base para usuários autenticados.

A migration já foi aplicada no Supabase de produção.
Este pacote existe para manter o repositório sincronizado com o banco.

## Commit sugerido
`V45.13.1 - corrige permissao do Radar de vendas`
