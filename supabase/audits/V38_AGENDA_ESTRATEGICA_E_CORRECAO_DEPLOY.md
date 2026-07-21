# V38 · Agenda Estratégica + correção do deploy anterior

## Correção do deploy
O commit `V38 · Escala operacional — Promoções standalone e Central de Rupturas` falhou no build da Vercel.

Causa confirmada nos logs:
`Export ImageSearch doesn't exist in target module`.

Correção:
- `ImageSearch` substituído por `Images`, ícone já utilizado no projeto.
- Nenhuma mudança de banco necessária para essa correção.

## Agenda Estratégica
Nova rota:
`/central/agenda-estrategica`

Recursos:
- 27 tarefas-base do antigo AppSheet;
- geração automática ao abrir cada mês;
- histórico por mês;
- semanas 1, 2, 3 e 4;
- prioridades Baixa, Média, Alta e Extrema;
- categorias;
- filtros por semana, status e categoria;
- concluir;
- adiar;
- reabrir;
- mover de semana;
- registrar impacto no resultado;
- observações;
- criar tarefas extras exclusivas de um mês;
- atalhos para módulos reais da Company.

## Base validada
27 templates ativos:
- Semana 1: 7
- Semana 2: 6
- Semana 3: 8
- Semana 4: 6

## Migrations já aplicadas
- 20260721012116 v38_strategic_agenda_tables
- 20260721012131 v38_strategic_agenda_permissions
- 20260721012148 v38_strategic_agenda_seed_weeks_1_2
- 20260721012205 v38_strategic_agenda_seed_weeks_3_4
- 20260721012218 v38_strategic_agenda_generation
