# Hotfix — UX do Planejador de compras

Corrige a tela:

`/pedidos-fornecedor/planejamento`

## Problema visto no print

A tela usa sidebar, mas os cards de resumo e fornecedor estavam decidindo a quantidade
de colunas pelo viewport inteiro. Na área útil sobrava pouco espaço e acontecia:

- título, valor e descrição do KPI colados;
- números misturados com texto;
- quatro cards muito estreitos;
- três fornecedores lado a lado apertados;
- botões dentro do fornecedor sem espaço;
- ações do PageHeader duplicando a nova barra `Estoque e compras`.

## Correção

### Resumo
- 2 cards por linha no desktop comum;
- 4 somente em telas realmente largas;
- 1 por linha no celular;
- valor, título e descrição agora têm blocos separados.

### Fornecedores
- 2 cards por linha na largura normal;
- 3 apenas em telas muito largas;
- 1 no celular;
- números internos continuam em 3 blocos;
- botões `Criar pedido` e `Configurar fornecedor` não se esmagam.

### Filtros
- busca ocupa uma linha quando a área fica estreita;
- prioridades e fornecedor ficam em grid responsivo;
- tabela mantém scroll horizontal em vez de comprimir as colunas.

### Cabeçalho
Foram removidos os botões repetidos `Fornecedores`, `Novo pedido` e `Pedidos`,
porque a barra `Estoque e compras` já mantém esses caminhos sempre visíveis.

## Banco
Nenhum SQL.
Nenhuma migration.
Nenhuma mudança no Supabase.

## Aplicação
Extrair na raiz -> substituir -> GitHub Desktop -> Commit -> Push origin

Commit sugerido:

`fix: corrige ux do planejador de compras`
