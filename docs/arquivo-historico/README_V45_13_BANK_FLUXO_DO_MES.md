# Candinho V45.13 · Bank — Fluxo do mês

Pacote cumulativo sobre V45.12 e inclui a correção V45.12.1 do saldo acumulado.

## 1. Projeção do topo

Antes:
`Saldo + A receber − compromissos`

Agora:
`Saldo atual − compromissos obrigatórios`

Entradas futuras NÃO entram mais na projeção de caixa.

Ordem dos cards:
1. Saldo disponível
2. A pagar até o fim do mês
3. Projeção confirmada
4. A receber neste mês
5. Notinhas pendentes, quando houver

## 2. Próximos vencimentos

Novo bloco:
`Próximos vencimentos`

Mostra somente:
- hoje;
- amanhã.

Esses itens deixam de aparecer duplicados na lista longa.

Mesmo assim, seus valores continuam sendo descontados da projeção diária
dos grupos seguintes.

Exemplo:
Saldo R$ 1.200
Hoje/amanhã R$ 360
Próximo grupo começa com R$ 840.

## 3. Saldo acumulado por dia

Mantém a correção V45.12.1:

Saldo atual
→ paga primeiro dia
→ sobra vira saldo do segundo dia
→ sobra vira saldo do terceiro dia.

Déficit também é carregado.

## 4. Empréstimos e Notinhas

Empréstimos mostram:
`Parcela R$ X`

e separadamente:
`Saldo total ainda devido`

Exemplo:
Empréstimo Ian
Ian
Parcela R$ 200,00
R$ 4.347,39
05/09/2026

Notinhas mostram:
`Sem valor de parcela fixa`

Mesmo quando existe histórico de um valor mensal anteriormente informado,
a Home não trata a Notinha como compromisso fixo.

## 5. Ordem da tela Este mês

Prioridade visual:
- cards principais;
- atrasados, quando existirem;
- Próximos vencimentos;
- Empréstimos e Notinhas;
- Vencimentos do mês;
- Entradas deste mês;
- demais blocos auxiliares.

## 6. Entradas deixa de ser aba principal

A rota `/bank/entradas` continua existindo para cadastro e edição,
mas deixa de aparecer na navegação principal.

No telefone o menu Bank passa de 5 para 4 atalhos.

A Home passa a mostrar:
- Fixos a receber;
- Operações;
- Avulsos;
- entradas fixas aguardando;
- contas avulsas aguardando.

Os botões de cadastro/gerenciamento continuam disponíveis dentro do bloco.

## Banco

Nenhuma migration nova.

As regras financeiras do V45.12 permanecem intactas.

## Commit sugerido

`V45.13 - reorganiza fluxo mensal do Bank e remove entradas da navegacao`
