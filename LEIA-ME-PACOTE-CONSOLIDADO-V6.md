# Candinho Company — Pacote Consolidado V6

Este pacote consolida a próxima evolução da Candinho Central e do controle operacional, preservando as operações já existentes.

## 1. Busca Global

Nova rota `/central/busca` e busca destacada na Home da Central.

Pesquisa, respeitando as permissões do usuário, por:
- contatos da Central;
- conversas do Inbox;
- produtos de Suplementos;
- produtos Fitness;
- parceiros;
- tarefas da Agenda;
- arquivos da Biblioteca de Mídia.

A busca é executada por RPC no Supabase e não expõe resultados de operações sem permissão.

## 2. Central de Alertas

Nova rota `/central/alertas`.

Consolida alertas operacionais como:
- mensagens não lidas;
- atendimentos pendentes;
- tarefas atrasadas e tarefas do dia;
- pontos de estoque que exigem conferência;
- produtos em atenção;
- integrações com problema;
- mídias aguardando classificação;
- parceiros sem Portal ativo.

Os alertas são dinâmicos e levam diretamente à área correspondente.

## 3. Governança V2

A Governança foi ampliada com:
- resumo de usuários por perfil;
- quantidade de usuários com acesso ao Marketing;
- saúde das integrações;
- situação dos Portais de Parceiro;
- histórico de auditoria;
- gerenciamento de feature flags.

Feature flags gerenciáveis:
- Candinho Central;
- Home V2;
- Estoque V2;
- Candinho Marketing;
- Portal do Parceiro;
- Área de Teste.

Somente administrador ou usuário com permissão de gestão pode alterar essas flags.

## 4. Permissões V3

A tela de usuários ganhou presets rápidos para:
- Suplementos;
- Fitness;
- Marketing;
- Leitura geral.

Os presets apenas preenchem o formulário. A alteração só é gravada ao salvar, preservando controle humano sobre cada permissão.

## 5. Reconciliação de Estoque V2

A rota `/estoque/reconciliacao` agora possui fluxo de revisão com estados:
- Aberto;
- Em análise;
- Resolvido.

Também suporta observações e histórico de resoluções.

**Importante:** marcar uma pendência como resolvida NÃO altera o estoque físico ou os movimentos de estoque. Ajustes de quantidade continuam sendo operações separadas e explícitas.

## 6. Ajustes complementares

- Busca Global e Alertas adicionados à navegação da Central.
- Atalhos mobile adicionados.
- Home da Central ganhou campo de busca global e indicador de alertas.
- Agenda e Pendências passaram a identificar corretamente o escopo Marketing.
- Auditoria de governança passa a incluir revisões de reconciliação.

## Banco de dados

As migrations desta etapa já foram aplicadas no Supabase de produção. Os arquivos SQL estão incluídos para manter o Git alinhado com esta evolução.

Migrations:
- `20260717205553_create_inventory_reconciliation_workflow_v2.sql`
- `20260717205705_create_central_global_search.sql`
- `20260717205729_create_central_alerts_snapshot.sql`
- `20260717205746_create_central_governance_v2.sql`
- `20260717210520_expand_central_governance_audit_feed_v2.sql`
- `20260717211543_fix_central_global_search_column_aliases.sql`

A última migration da Busca Global corrige a definição das colunas do CTE. As duas migrations devem permanecer em sequência, pois refletem exatamente o histórico já aplicado em produção.

## Validação

- ESLint: 0 erros.
- TypeScript: 0 erros.
- Build Next.js de produção: concluído com exit code 0.
- Smoke test real no Supabase concluído para Busca, Alertas, Governança e Reconciliação.
- Testes de escrita de reconciliação e feature flag executados em transação com rollback, sem alterar dados de produção.
- Novas RPCs não possuem permissão de execução para `anon`.
