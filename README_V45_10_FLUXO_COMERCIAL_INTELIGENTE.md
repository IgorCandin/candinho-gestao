# Candinho V45.10 · Fluxo Comercial Inteligente

## Objetivo
Corrigir a lógica do Novo Orçamento sem voltar a misturar proposta com venda.

## Novo fluxo

### Apenas orçamento
Use quando o cliente ainda não confirmou.

A interface:
- mantém produtos, valores, promoção, desconto e observações;
- esconde Pagamento;
- esconde Entrega;
- esconde Sacola;
- esconde Pós-venda;
- salva como proposta.

### Orçamento confirmado
Use quando o cliente já fechou.

A interface libera:
- Pagamento;
- Entrega;
- Sacola;
- Agenda inteligente;
- confirmação direta da venda.

O modal final volta a ter:
- `Apenas orçamento`
- `Orçamento confirmado`

O V45.8 havia escondido a opção confirmada no primeiro salvamento.
O V45.10 restaura a opção.

## Pós-venda inteligente

O produto já possui `duration_days`.

Regra aplicada no backend ao confirmar venda:

- duração estimada do item =
  `duration_days × quantidade`;
- quando `duration_days` estiver vazio:
  fallback de 30 dias;
- Pós-venda =
  menor duração relevante da compra,
  limitado a no máximo 30 dias.

Exemplos:

### Pré-treino que dura 20 dias
- pós-venda: 20 dias depois da venda;
- não cria um segundo lembrete de reposição no mesmo período.

### Produto que dura 120 dias
- pós-venda: 30 dias depois;
- reposição: 120 dias depois.

### 2 unidades de produto que dura 30 dias
- pós-venda: 30 dias;
- reposição: 60 dias.

## Reposição

Para produtos cuja duração estimada ultrapassa 30 dias,
o ERP cria uma tarefa oficial de `follow_up`.

Ela fica ligada:
- ao cliente;
- à venda;
- ao produto através do registro
  `sale_replenishment_reminders`.

Título:
`Reposição · Produto · Cliente`

A tarefa entra em:
- Agenda;
- Fila Única;
- Nexus;
- fluxo operacional normal.

Não existe agenda paralela.

## Pós-venda oficial

O V45.10 continua usando:
- `sales.post_sale_due_at`
- `post_sale_batches`

Ao calcular a nova data, o trigger oficial já sincroniza
o pós-venda com a estrutura existente.

## Sacola

O controle antigo continua sendo a fonte de verdade.

A camada V45.10 apenas transforma o checkbox em escolha rápida:

- `Sem sacola`
- `Usou sacola`

Isso reduz erro e deixa a decisão mais clara.

## Preview no orçamento confirmado

Antes de salvar, o Comercial mostra:

### Agenda inteligente
- data sugerida de pós-venda;
- produtos que terão reposição posterior;
- duração estimada de cada produto;
- data provável de reposição.

Essa prévia é informativa.
A regra definitiva é executada no banco depois que a venda é criada.

## Banco

A migration:
`smart_sale_followups_and_replenishment_v1`

JÁ FOI APLICADA no Supabase oficial.

Ela NÃO fez backfill de vendas antigas.

Portanto:
- sua Agenda não será preenchida com vendas passadas;
- a regra começa nas próximas vendas confirmadas.

Não rode SQL manualmente.

## Observação sobre Lead

Este pacote remove a obrigação de:
`salvar → abrir lead → converter manualmente`
quando o cliente já confirmou.

Ao escolher `Orçamento confirmado`, a própria ação confirmada
segue para a venda no mesmo fluxo.

A estrutura histórica de lead do orçamento ainda é preservada
internamente para compatibilidade com telas antigas.

Uma remoção completa dessa herança deve ser feita separadamente,
depois de auditar CRM e Commercial Inbox.

## Teste recomendado

1. Novo Orçamento.
2. Confira que inicia em `Apenas orçamento`.
3. Pagamento/Entrega/Pós-venda devem ficar escondidos.
4. Mude para `Orçamento confirmado`.
5. Confira se os blocos finais aparecem.
6. Teste a escolha de Sacola.
7. Adicione um pré-treino de 20 dias.
8. Veja pós-venda sugerido em 20 dias.
9. Adicione produto com duração maior que 30 dias.
10. Veja pós-venda em até 30 dias e reposição futura.
11. Salve como `Apenas orçamento`.
12. Faça outro e escolha `Orçamento confirmado`.
13. Confira a venda criada.
14. Confira o Pós-venda na Agenda.
15. Confira uma tarefa futura de Reposição se houver produto >30 dias.

## Commit sugerido

`V45.10 - corrige fluxo de orçamento e automatiza pos venda e reposicao`
