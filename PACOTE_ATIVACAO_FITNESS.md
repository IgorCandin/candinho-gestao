# Pacote de ativação — Candinho Fitness

Este pacote consolida o estado atual da Candinho Company e ativa a operação real da Candinho Fitness.

## Incluído

- Candinho Suplementos com Orçamentos, PDF, desconto, brinde, integração com Leads e correção de lint.
- Candinho Bank com as etapas já implementadas.
- Candinho Fitness removida do estado "Em breve" e liberada no seletor de operações.
- Dashboard real da Fitness.
- Vendas, detalhes da venda, recebimento, entrega e cancelamento.
- Produtos e variações por tamanho/cor.
- Estoque, ajuste manual e conversão de conjuntos em peças.
- Clientes.
- Fornecedores.
- Pedidos de compra e recebimento parcial/total.
- Movimentações de estoque.

## Validação executada

- ESLint: aprovado.
- TypeScript: aprovado.
- Next.js production build: aprovado.
- Todas as rotas reais da Fitness foram reconhecidas pelo build.
- Backend Fitness testado em transação com rollback: cliente, fornecedor, ajuste de estoque, pedido, recebimento parcial/total, venda, pagamento, entrega, cancelamento e conversão de estoque.
- Nenhum dado fictício permaneceu no banco após os testes.

## Situação atual dos dados Fitness

A estrutura do banco já contém 7 produtos e 140 variações, porém ainda não há clientes, fornecedores, vendas, pedidos ou saldo físico real cadastrados. Esses dados devem ser alimentados/confirmados antes do uso operacional completo.
