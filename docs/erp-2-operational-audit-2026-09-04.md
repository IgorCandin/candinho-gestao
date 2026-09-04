# Auditoria operacional — ERP 2.0

Data: 04/09/2026

## Princípio do novo ERP

O ERP 1.0 organiza o sistema por operação e cadastro. O ERP 2.0 deve organizar o trabalho por resultado: vender, concluir, acompanhar, consultar produtos, repor e organizar o dia. Suplementos e Fitness continuam sendo origens dos dados, mas deixam de obrigar o usuário a trocar de operação para executar o trabalho.

## Estado dos seis módulos

| Módulo | Estado | Próxima consolidação |
|---|---|---|
| Vender agora | Suplementos + recompra Fitness | concluir o ciclo comercial Fitness de forma nativa; cadastros sem compra não são mais classificados como recompra |
| Concluir vendas | Suplementos + Fitness | substituir as últimas telas reaproveitadas por uma ficha Company única |
| Atender e acompanhar | CRM global, resolução e reagendamento iniciados | completar pós-venda Fitness e consolidar identidade da mesma pessoa nas duas operações |
| Produtos | Suplementos + Fitness | unificar edição e ações de estoque dentro da Company |
| Comprar e repor | grupos equivalentes e pedidos de Suplementos | incluir estoque, fornecedores, pedidos e recebimentos Fitness; criar detalhe e novo pedido nativos |
| Organizar o dia | Agenda Global real, com calendário e arrastar/soltar | incluir filtros “sem responsável” e “sem próxima ação” e validar origens Fitness |

## Agenda Global / Organizar o dia

Uma única tela substitui a navegação fragmentada entre Meu Dia, Prioridades, Alertas, Pendências e Agenda Global.

### Entradas da fila

- retornos de clientes e leads;
- pós-vendas;
- cobranças e vencimentos;
- entregas, retiradas e rotas;
- pedidos e recebimentos de fornecedores;
- tarefas internas e compromissos;
- alertas sem responsável, sem data ou sem próxima ação;
- sugestões relevantes do Nexus.

### Modos de trabalho

- Agora: atrasado + hoje, ordenado por impacto e urgência;
- Agenda: dia, semana e mês, com arrastar e soltar;
- Sem dono: itens sem responsável;
- Sem próxima ação: registros que podem ser esquecidos;
- Concluídos: histórico do que foi executado.

Cada item deve abrir o registro correto dentro da Company. Alterar a data na agenda precisa atualizar a origem, sem criar uma segunda tarefa desconectada.

## Comprar e repor

O módulo atual resolve grupos equivalentes de Suplementos, mas ainda não é global.

### Estrutura recomendada

1. Radar de ruptura: falta real por grupo equivalente, giro recente e estoque disponível.
2. Sugestão de compra: produto preferido, quantidade, fornecedor e custo esperado.
3. Pedidos em aberto: Suplementos e Fitness, separados por operação quando necessário.
4. Recebimento: parcial ou total, divergência de quantidade/custo e atualização de estoque.
5. Exceções: cancelado pelo fornecedor, atrasado, sem previsão e item substituído.

Não somar produtos Fitness em grupos equivalentes de suplementos. A unificação é da fila de trabalho; as regras de estoque continuam próprias de cada operação.

## Funções do ERP 1.0 que devem migrar

- Agenda Global e arrastar/soltar;
- criação e conclusão de tarefas;
- respostas rápidas de atendimento;
- rotas, retiradas e entregas;
- recebimento parcial e cancelamento de pedido;
- movimentação, reserva e transferência de estoque;
- promoções e consulta comercial de preço;
- histórico completo de cliente, venda e produto;
- qualidade, integridade e alertas críticos;
- mídia do produto quando necessária durante venda;
- Nexus contextual para sugerir texto, prioridade e próxima ação.

## O que não deve virar menu principal

- Nexus IA: deve assistir cada fila, não competir com o trabalho;
- alertas, prioridades e pendências: devem ser filtros de Organizar o dia;
- visão geral e gestão: devem virar indicadores dentro do módulo correspondente;
- operações antigas: permanecem como contingência durante a migração;
- Vitrine: acesso contextual por Produto e Marketing;
- Bank e Candinho Atletas: continuam como áreas independentes.

## Duplicidades e transições detectadas

- Meu Dia, Prioridades, Alertas, Pendências e Agenda possuem responsabilidades sobrepostas.
- Produtos e Estoque aparecem em diversos menus com entradas diferentes para o mesmo registro.
- Pós-venda existe separado em Suplementos e Fitness, embora a ação humana seja a mesma.
- Vendas pendentes separavam pagamento e entrega; Concluir vendas já corrige essa duplicidade.
- Algumas fichas Company ainda reutilizam o componente antigo e seus botões internos podem retornar ao ERP 1.0.
- Comprar e repor ainda abre novo pedido e detalhe na arquitetura antiga.
- Cadastro novo e edição de clientes ainda usam formulários antigos, embora a listagem global seja Company.
- O ciclo de venda Fitness ainda precisa registrar contato, conversão e próxima ação com o mesmo nível de detalhe de Suplementos.

## Pendências que impedem aposentar o ERP 1.0

- criar, editar e concluir vendas inteiramente dentro da Company;
- receber e cancelar pedidos de Suplementos e Fitness sem voltar à operação antiga;
- movimentar, reservar, contar e transferir estoque nas duas operações;
- editar cadastro e mídia de produtos de forma nativa;
- concluir pós-venda Fitness e unificar pessoas duplicadas entre as operações;
- administrar fornecedores, promoções e condições comerciais;
- consultar relatórios de venda, lucro, estoque e qualidade;
- conferir permissões, usuários e trilha de auditoria;
- testar a paridade das filas e totais durante uma semana operacional.

## Ordem recomendada de construção

1. Organizar o dia, usando a Agenda Global existente como fonte única.
2. Completar Comprar e repor com Fitness e recebimentos.
3. Tornar CRM e pós-venda totalmente nativos da Company.
4. Incorporar Vender agora da Fitness.
5. Substituir links de contingência restantes por rotas Company.
6. Executar uma semana em paralelo e comparar contagens com o ERP 1.0 antes de aposentar qualquer tela.

## Regra de aceitação para aposentadoria do ERP 1.0

Um fluxo só pode ser desativado quando o ERP 2.0 consegue criar, consultar, editar, concluir, cancelar quando aplicável, preservar histórico e retornar ao ponto de trabalho sem trocar de operação. As contagens das duas versões devem coincidir durante pelo menos uma semana operacional.
