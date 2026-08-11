# Compras — Planejar próximo pedido + navegação clara

## O que foi corrigido nesta versão

A área de compras estava difícil de encontrar porque o caminho dependia de entrar em
`Pedidos de fornecedor` ou descobrir que o card `A caminho` levava para lá.

Agora existe uma barra fixa de contexto chamada:

**Estoque e compras**

Ela aparece no topo das páginas de:
- Estoque
- Pedidos
- Novo pedido
- Próximo pedido
- Inteligência
- Fornecedores

Os atalhos ficam sempre visíveis:

1. Estoque
2. Próximo pedido
3. Pedidos em aberto
4. Novo pedido
5. Fornecedores
6. Inteligência

No celular os botões viram uma grade de 2 colunas, evitando menu escondido.

---

## Nova rota

`/pedidos-fornecedor/proximo-pedido`

### Regra

Entra na lista somente produto que atende aos três critérios:

1. **Estoque ideal > 0**
2. **Estoque físico = 0**
3. **A caminho = 0**

Portanto:
- produto com ideal 0 não aparece;
- produto que ainda possui unidade física não aparece;
- produto já comprado e a caminho não aparece.

A tela reutiliza `purchase_planning_snapshot`.
Não cria outra fonte de verdade para estoque.

### O que mostra

No topo:
- produtos zerados para repor;
- unidades necessárias para chegar ao ideal;
- custo estimado;
- venda provável (-10%).

Por fornecedor:
- produto;
- físico;
- a caminho;
- ideal;
- quantidade sugerida;
- custo estimado;
- giro 90d;
- última venda;
- aviso quando precisa escolher sabores.

### Seleção

Todos os itens começam marcados.

É possível:
- desmarcar o que não quer comprar agora;
- filtrar fornecedor;
- buscar produto;
- ver investimento apenas do selecionado;
- copiar a lista do planejamento.

A tela não cria pedido automaticamente nesta primeira versão.
Depois do planejamento, use `Novo pedido` para revisar sabor, quantidade, custo real,
fornecedor e previsão de chegada.

---

## Banco

Nenhuma migration.
Nenhum SQL.
Nenhuma alteração no Supabase.

## Aplicação

Este ZIP substitui o ZIP anterior de `Planejar próximo pedido`.

Extrair na raiz -> substituir -> GitHub Desktop -> Commit -> Push origin

Commit sugerido:

`fix: organiza navegacao de estoque e compras`
