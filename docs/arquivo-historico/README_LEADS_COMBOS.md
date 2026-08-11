# Hotfix — Combo na edição de Leads

## Problema
Na tela de editar Lead era possível trocar apenas:
- produto;
- sabor;
- cliente;
- status;
- observação.

Os combos cadastrados na operação não apareciam.

## Correção
A edição do Lead agora começa com:

**Tipo de interesse**
- Produto individual
- Combo

Ao escolher Combo:
- lista os combos ativos;
- mostra o preço do combo;
- mostra os componentes;
- se um componente tiver sabores, permite registrar o sabor de interesse;
- sabor pode ficar em branco caso o cliente ainda não tenha decidido.

## Conversão
Também foi corrigida a conversão Lead -> Orçamento -> Venda.

Se o Lead estiver ligado a um combo:
- os produtos do combo vão para o orçamento;
- o preço final do combo é preservado;
- a diferença entre a soma dos itens e o valor do combo vira desconto/ajuste do orçamento;
- o orçamento abre para revisão normal;
- sabores ainda não escolhidos podem ser definidos antes de confirmar a venda.

O Lead só sai da lista depois da confirmação final da venda.

## Banco
A migration deste pacote já foi aplicada no Supabase de produção.

Não execute SQL manualmente.

## Aplicação
Extrair na raiz -> substituir -> GitHub Desktop -> Commit -> Push origin

Commit sugerido:

`fix: permite selecionar combos ao editar leads`
