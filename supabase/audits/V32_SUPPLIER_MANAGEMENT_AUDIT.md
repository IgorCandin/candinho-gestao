# V32 — Auditoria do centro gerencial de fornecedores

Data da auditoria: 20/07/2026  
Escopo: Candinho Suplementos (`suppliers`, `purchase_orders`, `purchase_order_items` e `purchase_receipts`). O fluxo Fitness permanece separado e não foi alterado.

## Estado encontrado antes da implementação

- 10 fornecedores cadastrados e ativos.
- 73 pedidos, sendo 70 recebidos e 3 pendentes.
- 73 itens de pedido e 10 eventos nativos de recebimento.
- Histórico entre 30/04/2026 e 13/07/2026.
- 53 pares fornecedor–produto; 14 pares têm compras repetidas.
- 3 produtos foram comprados de mais de um fornecedor.
- Nenhum pedido histórico possuía `expected_on`; portanto não existia amostra legítima de prazo prometido versus real.
- Os 10 recebimentos nativos não tinham divergência entre o custo recebido e o custo do item.
- Parte dos pedidos recebidos veio do legado com `quantity_received` preenchido, mas sem evento em `purchase_receipts`. Esses pedidos servem para histórico de preço, porém não recebem uma data real de entrega inventada.
- A V28 já mantinha prazo cadastrado, cobertura alvo, pedido mínimo, frete grátis, condições de pagamento e sugestão de compra por fornecedor.

## Lacunas confirmadas

- Não havia uma página gerencial de fornecedores na operação Suplementos.
- Não havia visão consolidada de último preço, melhor preço recente, evolução de custo ou comparação entre fornecedores.
- Não havia concentração de compras, divergência de recebimento ou score operacional consolidado.
- O histórico de pedidos existia apenas na lista geral e em cada pedido, não dentro da ficha do fornecedor.

## Implementação

A migração `20260720120208_v32_supplier_management_intelligence.sql` adiciona quatro visões somente leitura e com `security_invoker = true`:

- `supplier_purchase_order_facts`: fatos por pedido, entrega real mensurável e divergências.
- `supplier_product_purchase_history`: histórico de custo por fornecedor e produto.
- `supplier_product_price_summary`: último preço pago, preço anterior, melhor preço em 180 dias e posição entre fornecedores.
- `supplier_management_overview`: concentração em 12 meses, fornecedor padrão, condições comerciais, gaps de pedido/frete e indicadores operacionais.

Foram adicionadas as rotas:

- `/fornecedores`: visão executiva e comparação real de preços.
- `/fornecedores/[id]`: ficha comercial, desempenho, preços, evolução de custos e pedidos.

Os pedidos, o planejador e o detalhe de pedido ganharam acesso direto ao centro de fornecedores. Nenhuma função de criação ou recebimento foi modificada.

## Definições dos indicadores

- **Último preço pago:** custo unitário do item mais recente com quantidade recebida e pedido em estado `received` ou `partial`.
- **Melhor preço recente:** menor custo pago nos últimos 180 dias.
- **Concentração:** valor dos pedidos não cancelados do fornecedor dividido pelo valor total comprado nos últimos 365 dias.
- **Prazo real:** diferença entre data do pedido e último evento nativo de recebimento, apenas quando o pedido está totalmente recebido e também possui data prometida.
- **Atraso:** entrega real posterior a `expected_on`.
- **Divergência:** pedido recebido com diferença de quantidade ou evento de recebimento com custo diferente do item do pedido.
- **Score operacional:** começa em 100 e desconta atraso (55 pontos proporcionais), divergência de custo (20) e pedidos divergentes (25). Fica `null`/“Em formação” enquanto não houver entrega com promessa mensurável.
- **Gap de pedido/frete:** diferença positiva entre a sugestão da V28 e o mínimo/frete grátis cadastrado. Condições ausentes continuam em zero e não são inventadas.

## Segurança

- As novas visões usam o usuário chamador e respeitam o RLS das tabelas-base.
- Acesso anônimo e público foi revogado explicitamente.
- Apenas `authenticated` e `service_role` receberam `SELECT`.
- Não foram criadas funções `security definer` nem novas operações de escrita.

## Validações executadas

- Migração aplicada com sucesso no Supabase de produção.
- 10 linhas na visão gerencial, 52 pares com preço, 73 linhas de histórico e 6 linhas comparáveis entre fornecedores.
- Build Next.js de produção concluído, incluindo `/fornecedores` e `/fornecedores/[id]`.
- ESLint dos arquivos alterados concluído sem erros.
- Acesso direto sem sessão foi validado e a nova rota incluída no proxy protegido, com redirecionamento para o login em vez de executar consultas anônimas.
- Advisors do Supabase executados: nenhuma advertência nova de segurança vinculada à V32; índices recém-criados aparecem como ainda não utilizados, comportamento esperado imediatamente após a criação.
- A automação visual foi preparada, mas o Chrome automatizado encerrou o canal CDP neste ambiente Windows. A rota local respondeu HTTP 200 e a compilação server-side das duas páginas foi validada pelo build.

## Limitação de dados transparente

O score, atraso e comparação prometido versus real começarão a aparecer à medida que novos pedidos forem criados com “Previsão de chegada” e recebidos pelo fluxo nativo. O sistema mostra “Sem amostra” em vez de transformar pedidos legados em entregas pontuais fictícias.
