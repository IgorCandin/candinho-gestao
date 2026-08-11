# V45.22 · CENTRAL GLOBAL, MENUS POR OPERAÇÃO E AGENDA COMPARTILHADA

## Arquitetura

A Company passa a ter quatro operações principais no seletor:
- Suplementos
- Fitness
- Bank
- Central

Marketing deixa de competir como operação principal e passa a ser um módulo da Central.
Physique não entra no carrossel nesta versão.

## Menus de entrada

O padrão visual iniciado na Suplementos passa a existir também em:
- /fitness/inicio
- /bank/inicio
- /central/inicio

No telefone estes gateways não substituem o fluxo atual.

A logo de cada gateway volta para /dashboard, igual à logo do menu lateral.

## Meu Dia

O Meu Dia global passa a ser:
- /central/meu-dia

/nexus/foco fica apenas como compatibilidade e redireciona para a Central.

## Agendas

- Suplementos: /suplementos/agenda
  - mostra apenas tarefas manuais da Suplementos + eventos operacionais da Suplementos.
- Fitness: /fitness/agenda
  - mostra tarefas e eventos da Fitness.
- Central: /central/agenda
  - Agenda Global com Central + Suplementos + Fitness + Marketing + Agenda Estratégica.

As tarefas manuais usam a mesma tabela operational_tasks. Por isso uma alteração de tarefa
aparece nas visões filtradas e na Agenda Global sem duplicação.

Eventos gerados por vendas/pós-venda/pedidos continuam tendo o módulo de origem como
fonte de verdade; a Central os lê em tempo real.

## Google Calendar

A migration estende a fila para tarefas operacionais de:
- Company/Central
- Suplementos
- Fitness
- Marketing (mantém o identificador histórico)
- Agenda Estratégica continua como já era

A Edge Function google-calendar-sync também precisa ser redeployada após o push.

## Estoque e Compras

A tabela "Produtos e quantidades" continua porque é a visão por produto do estoque.
O link "Abrir Produtos" é removido e o bloco passa a se chamar "Saldo por produto":
Produtos é cadastro; Estoque é quantidade.

## Navegação e títulos

- Marketing passa a usar URL canônica /central/marketing.
- URLs antigas /marketing continuam funcionando via redirect.
- RouteTabIdentity foi refeito para títulos consistentes.
- /suplementos/estoque passa a aparecer como "Estoque e compras - Suplementos".
