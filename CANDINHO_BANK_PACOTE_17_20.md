# Candinho Bank — Pacote Etapas 17 a 20

Este pacote agrupa quatro etapas para acelerar a implantação.

## Etapa 17 — Entradas previstas
- Nova área `Entradas e Receber`.
- Cadastro de salários, extras, retiradas e outras fontes recorrentes.
- Frequência mensal, anual, semanal ou personalizada.
- Valor fixo ou variável.
- Ativar/pausar e incluir ou remover da projeção.

## Etapa 18 — Contas a receber
- Cadastro de recebimentos pontuais.
- Recebimento total ou parcial.
- Registro da data e da conta onde o dinheiro entrou.
- Vínculo opcional com uma entrada prevista para evitar duplicidade na projeção.
- RPC de recebimento reforçada com `can_write_bank()`.

## Etapa 19 — Dashboard com recebimentos
- Atalho para nova entrada.
- Painel de próximos recebimentos.
- Links diretos para a nova área de Entradas e Receber.

## Etapa 20 — Visão Anual ampliada
- Resumo de saldo atual, entradas em 12 meses e compromissos em 12 meses.
- Saldo projetado ao final do período.
- Saldo projetado acumulado mês a mês, partindo do saldo real atual.
- Detalhamento separado de faturas, mensalidades, cobranças e empréstimos.
