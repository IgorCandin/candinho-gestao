# Compras — Planejar próximo pedido

Nova rota: `/pedidos-fornecedor/proximo-pedido`

## Regra

A lista mostra somente produtos com:

1. Estoque ideal > 0
2. Estoque físico = 0
3. A caminho = 0

Logo:
- ideal 0 não entra;
- produto ainda com estoque físico não entra;
- produto que já está a caminho não entra.

A tela reutiliza `purchase_planning_snapshot`, sem criar outra fonte de verdade.

## O que mostra

- produtos zerados para repor;
- unidades para chegar ao ideal;
- custo estimado;
- venda provável (-10%);
- fornecedor;
- giro 90d;
- última venda;
- indicação quando o produto exige escolha de sabores.

Todos começam selecionados. Dá para desmarcar, filtrar fornecedor, buscar e copiar a lista pronta.

A primeira versão não cria pedido automaticamente. Depois de fechar o planejamento, o botão abre o fluxo oficial de pedido, onde entram sabor, custo real, quantidade final e previsão de chegada.

## Navegação

Na tela `Pedidos de fornecedor` ficam:

- Fornecedores
- Próximo pedido
- Inteligência
- Novo pedido

`Próximo pedido` é rápido e objetivo.
`Inteligência` continua sendo a tela avançada de giro, cobertura e risco.

## Banco

Sem migration, SQL ou alteração no Supabase.

## Aplicação

Extrair na raiz -> substituir -> GitHub Desktop -> Commit -> Push origin

Commit sugerido:

`feat: adiciona planejamento rapido do proximo pedido`
