# Pacote consolidado — revisão Produtos, Leads e navegação

## Ajustes incluídos

- Remove o item `Orçamentos` do menu lateral da Candinho Suplementos. A área continua disponível dentro de `Comercial` pelas abas Vendas / Orçamentos / Leads.
- Mantém `Comercial` destacado no menu lateral ao navegar por Vendas, Orçamentos ou Leads.
- Corrige a ordem comercial padrão dos produtos:
  1. Creatina Candinho;
  2. estoque disponível > 0;
  3. somente a caminho;
  4. zerados;
  5. categoria estratégica: Força, Energia, Emagrecimento, Massa, Saúde, Sono, Acessórios, Restrito;
  6. mais vendidos primeiro;
  7. nome como desempate.
- Corrige um erro do frontend que reordenava o catálogo alfabeticamente, anulando a ordem comercial do banco.
- Corrige no Supabase a prioridade do carro-chefe: apenas o produto com nome exato `Creatina Candinho` recebe prioridade máxima. Produtos/combos que apenas citam esse nome não sobem para o topo.
- Volta a excluir itens com `COMBO` do catálogo de produtos, estoque e catálogo PDF, seguindo a regra usada no AppSheet.
- Adiciona alternância visual `Deck` / `Gallery` em Produtos.
- Adiciona borda de disponibilidade:
  - verde: estoque disponível > 0;
  - laranja: disponível = 0 e produto a caminho;
  - vermelho: disponível = 0 e nada a caminho.
- Quando há estoque disponível e também reposição a caminho, mantém a borda verde e exibe um ícone de caminhão laranja.
- Corrige Leads com orçamento de vários itens: cada produto vira uma linha visual própria na listagem, mantendo o mesmo Lead/orçamento por trás.
- Corrige detalhes do Lead para exibir todos os produtos e quantidades, em vez de mostrar somente o primeiro.
- Ajusta histórico de Leads do cliente para chaves únicas quando o mesmo Lead possui vários produtos.
- Revisa também a ordem padrão da tela de estoque: disponível > a caminho > zerado, seguida da categoria estratégica e nome.

## Validação

- Orçamento #10 foi conferido no banco: 4 produtos vinculados ao orçamento e 4 itens vinculados ao Lead.
- `npm run lint`: aprovado.
- `npx tsc --noEmit`: aprovado.
- `npm run build`: aprovado com todas as rotas de Suplementos, Bank e Fitness.

## Banco

A correção da prioridade `Creatina Candinho` já foi aplicada no Supabase de produção.
