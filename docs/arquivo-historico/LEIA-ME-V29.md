# Candinho Company · V29
## Lotes, Validades, FEFO e Rastreabilidade

A V29 adiciona uma camada de rastreabilidade física ao estoque de Suplementos.

Ela responde:

- qual lote está no estoque;
- quando vence;
- qual lote deve sair primeiro;
- quais unidades estão vencidas;
- quais unidades estão em quarentena;
- quanto do estoque antigo ainda não possui lote classificado;
- qual cliente recebeu determinado lote;
- como restaurar o lote correto ao cancelar uma venda;
- como manter o mesmo lote em uma transferência entre pontos.

## Estado anterior

Antes da V29 o banco não possuía estrutura nativa de lote e validade.

O estoque conhecia produto, local, sabor e quantidade, mas não mantinha uma
dimensão de lote/validade.

## Ativação segura

O controle é ativado produto por produto.

Nenhum produto foi ativado automaticamente.

Estado validado após a implantação:

- produtos com rastreio ativo: 0
- lotes criados automaticamente: 0
- movimentos de lote criados automaticamente: 0
- recibos antigos alterados: 0

Portanto nenhum estoque existente recebeu lote ou validade inventados.

## Estoque legado

Depois de ativar um produto que já possui estoque, as unidades atuais aparecem
como `Estoque legado sem lote`.

A nova ferramenta permite classificar:

- produto;
- sabor, quando houver;
- local;
- lote;
- validade;
- quantidade.

Essa classificação NÃO movimenta o estoque físico novamente.

Ela apenas transforma uma parte do saldo existente em saldo rastreado.

A soma classificada nunca pode ultrapassar o saldo físico ainda não rastreado.

## Novos recebimentos

O formulário de recebimento de pedido passa a usar:

`receive_purchase_order_item_v2`

Quando o produto tem rastreio ativo:

- lote é obrigatório;
- validade é obrigatória.

O recebimento continua atualizando:

- pedido;
- estoque total;
- sabor;
- custo;
- reservas aguardando estoque.

E passa a atualizar também:

- lote;
- validade;
- fornecedor de origem;
- saldo daquele lote.

## FEFO

Para produtos rastreados, vendas e transferências consomem automaticamente
primeiro o lote válido com validade mais próxima.

FEFO:

`First Expire, First Out`

Ou seja:

`Primeiro a vencer, primeiro a sair`

Lotes vencidos e lotes em quarentena não entram na baixa automática de venda.

Estoque antigo ainda não classificado pode continuar sendo usado, mas aparece
explicitamente como `untracked`.

## Cancelamento

Quando uma venda rastreada é cancelada, o sistema restaura exatamente os lotes
que foram consumidos por aquela venda.

Não devolve a quantidade para um lote aleatório.

## Transferência

Quando um produto rastreado é transferido entre pontos:

- o lote sai da origem;
- o mesmo lote entra no destino;
- a validade é preservada.

Estoque legado sem lote continua identificado como legado durante a
transferência.

## Quarentena

Um lote pode ser colocado em quarentena sem apagar o saldo físico.

Isso serve para situações como:

- suspeita de avaria;
- recolhimento;
- conferência;
- problema de fornecedor;
- necessidade de bloqueio temporário.

Lote em quarentena não entra no FEFO de vendas.

## Rastreabilidade de clientes

Nova página:

`/estoque/lotes`

Detalhe:

`/estoque/lotes/[id]`

Ao abrir um lote é possível visualizar as vendas rastreadas ligadas a ele e os
clientes envolvidos.

Em um cenário de recall/recolhimento, a operação consegue identificar quais
clientes receberam aquele lote.

## Integração com sabores

Lote e sabor coexistem.

Exemplo:

Pré-treino T

- lote L001
- sabor Ice
- validade 10/2027
- local CS
- quantidade 3

Outro lote do mesmo produto pode ter outro sabor ou validade.

## Segurança

Tabelas novas:

- `inventory_lots`
- `inventory_lot_movements`

Para `authenticated`:

- SELECT permitido via RLS
- INSERT direto bloqueado
- UPDATE direto bloqueado
- DELETE direto bloqueado

Mutações passam por RPCs protegidas.

Funções públicas de operação:

- `set_product_lot_tracking`
- `classify_legacy_inventory_lot`
- `set_inventory_lot_quarantine`
- `receive_purchase_order_item_v2`
- `inventory_lot_dashboard_snapshot`

Função interna:

- `apply_inventory_lot_tracking`

A função interna não é executável diretamente por `authenticated` ou `anon`.

## Teste transacional

Foi executado um teste real dentro de transação com ROLLBACK:

1. ativação temporária de rastreio em produto com estoque;
2. saída de uma unidade;
3. entrada de uma unidade com lote e validade;
4. confirmação da criação do lote;
5. rollback completo.

Resultado:

- trigger executou sem erro;
- lote temporário foi criado durante o teste;
- nenhum dado de teste permaneceu depois do rollback.

Validação após o teste:

- `TESTE-V29` persistido: 0

## V28

Antes do V29 foi confirmado:

- commit V28: `55a39ddb6399be4dbcd71826ba97c9d0ffb3f1ef`
- deployment correspondente: READY
- produção
- alias `candinho.duckdns.org`
- aliasError: null
- nenhum erro de runtime encontrado na janela de 30 minutos consultada

## Meta

Nenhuma alteração foi feita em:

- `central-meta-send`
- `central-meta-webhook`

## Commit sugerido

`V29 · Lotes, validades, FEFO e rastreabilidade`
