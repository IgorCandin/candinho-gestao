# LAB · Fitness Nexus — Cesta de próxima compra V2

Aplicar SOMENTE na branch:
`codex/bank-2-laboratorio`

## Regra corrigida

Antes, "10 peças" foi interpretado como 10 unidades por sugestão.

Agora:
- a meta é 10 peças no pedido inteiro;
- normalmente cada sugestão recebe 1 unidade;
- combinações com procura mais forte podem receber 2;
- a RPC monta somente a cesta necessária para chegar a pelo menos 10 peças;
- itens aceitos ficam preservados na cesta;
- recusas puxam a próxima melhor sugestão para completar o mínimo.

## Interface

Na tela `/fitness/nexus`:
- mostra `X de 10 peças`;
- mostra quantas peças faltam;
- mostra total da cesta proposta;
- cada sugestão permite quantidade 1 ou 2;
- botão muda para `Incluir 1` / `Incluir 2`;
- `Não incluir` ensina o Nexus e reduz prioridade de combinações parecidas;
- `Desmarcar` retira um item aceito sem contar como recusa;
- ao atingir 10 peças aparece atalho para Pedidos.

Nenhum pedido real é criado automaticamente e nenhum fornecedor é escolhido.

## Aprendizado

A nova pontuação usa:
- vendas em 30/90 dias;
- recusas da mesma família;
- aceitações recentes da família;
- afinidade recente de tamanho;
- afinidade recente de cor.

## Banco

A migration original NÃO foi reescrita.
Foi criada uma migration corretiva:
`20260810153719_fix_fitness_nexus_purchase_basket_v2.sql`

Ela já está aplicada no Supabase de produção.

Validações realizadas em transação com o acesso da Giulia:
- RPC de sugestão autorizada;
- cesta inicial = 10 peças / 10 combinações com os dados atuais;
- aceitar + recusar mantém a cesta em 10 peças;
- quantidade 2 gera 10 peças em 9 combinações;
- testes de escrita foram executados com ROLLBACK, sem deixar feedback falso.

## Commit sugerido

`fix(fitness): corrige cesta Nexus para 10 pecas no pedido`
