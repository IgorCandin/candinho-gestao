# Candinho Company · V30
## Central de Trocas, Devoluções e Garantias

A V30 fecha a logística reversa de Suplementos e Fitness.

O problema resolvido:

uma venda já aconteceu e o cliente volta com uma peça ou produto.

Antes era necessário decidir fora do sistema:

- o que foi devolvido;
- se pode voltar ao estoque;
- se precisa ficar separado;
- se deve ser descartado;
- se vai voltar ao fornecedor;
- se o cliente receberá troca, substituição ou reembolso;
- se existe um valor que precisa aparecer no Bank.

Agora existe um fluxo único.

## Fluxo

`Venda entregue`

→ `Abrir ocorrência`

→ `Cliente devolve`

→ `Registrar quantidade e condição`

→ `Conferir`

→ `Definir destino físico`

→ `Definir resolução comercial`

→ `Agendar reembolso no Bank`, quando necessário.

## Operações atendidas

- Candinho Suplementos
- Candinho Fitness

A central é compartilhada:

`/trocas`

Com filtros por operação.

## Tipos de ocorrência

- Troca
- Devolução
- Garantia / defeito
- Item incorreto
- Avaria
- Outro

## Origem obrigatória

A ocorrência nasce de uma venda entregue.

O sistema usa a venda original para recuperar:

- cliente;
- telefone;
- produto ou peça;
- sabor;
- cor;
- tamanho;
- quantidade vendida;
- preço;
- custo.

O sistema impede registrar mais unidades para devolução do que foram vendidas.

Ocorrências abertas ou já resolvidas também entram no cálculo do saldo disponível
para retorno.

Ocorrências recusadas/canceladas liberam novamente esse saldo.

## Recebimento físico

Quando o cliente entrega o item de volta, a operação registra:

- quantidade realmente recebida;
- condição física.

Condições disponíveis:

- lacrado;
- sem uso;
- aberto;
- usado;
- avariado;
- defeito;
- item incorreto.

IMPORTANTE:

registrar que o item foi recebido NÃO devolve o item automaticamente ao estoque.

## Destino físico

Depois da conferência, cada item recebe uma destinação:

- Voltar ao estoque
- Quarentena / separado
- Descarte
- Devolver ao fornecedor

Somente `Voltar ao estoque` movimenta o estoque vendável.

Isso evita que uma roupa usada ou um suplemento aberto seja devolvido ao saldo
disponível por engano.

## Suplementos

Quando o item volta ao estoque:

- produto e sabor são preservados;
- o estoque é recomposto;
- quando existe um único lote rastreado na venda original, o sistema consegue
  associá-lo automaticamente;
- o operador também pode escolher um lote;
- se a venda era estoque histórico sem lote, o retorno pode continuar marcado
  como estoque não rastreado.

A V29 e a V30 trabalham juntas.

## Fitness

Quando uma peça volta ao estoque:

- a mesma variação retorna;
- cor e tamanho são preservados;
- o movimento fica registrado como `return_in`.

## Resolução comercial

A ocorrência pode terminar como:

- Troca
- Reembolso
- Reposição / substituição
- Sem compensação

A V30 não altera silenciosamente a venda original.

Troca/substituição continuam podendo gerar uma nova venda pelo fluxo comercial,
preservando a venda original como histórico.

## Reembolso e Candinho Bank

Quando a resolução possui reembolso:

1. a ocorrência registra o valor;
2. fica com financeiro pendente;
3. usuário com permissão de escrita no Bank pode clicar em `Agendar no Bank`;
4. é criada uma conta a pagar com:
   - cliente;
   - valor;
   - origem Suplementos ou Fitness;
   - referência à ocorrência.

Quando a cobrança do Bank é paga, a visão da ocorrência passa a mostrar o
financeiro como liquidado.

O Bank continua sendo a fonte de verdade do pagamento.

## Encerramento sem devolução

Uma ocorrência pode ser:

- cancelada porque o cliente desistiu;
- recusada pela operação.

Nenhum estoque é movimentado.

Se uma ocorrência já movimentou estoque, ela não pode ser simplesmente
descartada.

## Segurança

Novas tabelas:

- `return_cases`
- `return_case_items`
- `return_case_events`

Usuários autenticados recebem apenas SELECT conforme acesso à operação.

INSERT/UPDATE/DELETE direto ficam bloqueados.

Mutações usam RPCs:

- `create_return_case`
- `receive_return_case`
- `resolve_return_case`
- `close_return_case`
- `schedule_return_refund_in_bank`

Leitura consolidada:

- `returns_center_snapshot`

Todas as RPCs públicas foram validadas com:

- SECURITY DEFINER
- `search_path=public`
- authenticated EXECUTE=true
- anon EXECUTE=false

## Estado na implantação

Nenhuma ocorrência histórica foi criada automaticamente.

Estado inicial:

- return_cases = 0

Vendas entregues atualmente elegíveis para iniciar uma ocorrência:

### Fitness

- 58 vendas
- 58 linhas de itens
- 59 unidades disponíveis para retorno

### Suplementos

- 280 vendas
- 280 linhas de itens
- 280 unidades disponíveis para retorno

Esses números são apenas a base elegível.

Nenhuma troca/devolução foi criada automaticamente.

## V29 validada antes da V30

Commit:

`2937228c8c0be58ea0d5f36ce77986726f3f442b`

Mensagem:

`V29 · Lotes, validades, FEFO e rastreabilidade`

Deployment correspondente:

- produção
- READY

Runtime:

- nenhum erro encontrado na janela explícita dos últimos 30 minutos consultada

## Meta

Nenhuma alteração foi feita em:

- `central-meta-send`
- `central-meta-webhook`

## Rotas novas

- `/trocas`
- `/trocas/nova?operacao=supplements`
- `/trocas/nova?operacao=fitness`
- `/trocas/[id]`

## Commit sugerido

`V30 · Central de trocas, devoluções, garantias e reembolsos`
