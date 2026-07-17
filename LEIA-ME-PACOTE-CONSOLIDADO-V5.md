# Candinho Company · Pacote Consolidado V5

Este pacote reúne, em um único patch, as próximas evoluções da Candinho Company após a Central Mídia V4.

## 1. Identidade visual atualizada

As novas logos fornecidas foram aplicadas como padrão visual do sistema para:

- Candinho Company
- Candinho Suplementos
- Candinho Fitness
- Candinho Bank
- Candinho Central
- Candinho Marketing

As telas de login, Home, App Shell, cartões de operações e documentos que usam a marca de Suplementos foram atualizados para os novos arquivos PNG.

## 2. Nova operação: Candinho Marketing

Foi criada apenas a fundação da operação, sem inventar regras de negócio antes da definição do Igor.

Incluído:

- rota `/marketing`;
- logo e identidade visual próprias;
- operação disponível na Home e no seletor de operações;
- permissões separadas de visualizar e alterar Marketing;
- administrador com acesso total por padrão;
- Giulia e usuários parceiros sem acesso automático;
- suporte ao escopo `marketing` na Candinho Central, Agenda, Mídia e tarefas operacionais;
- feature flag `marketing_enabled`.

Não foram criados por suposição módulos de vendas, estoque, financeiro, campanhas, orçamento ou métricas do Marketing.

## 3. Central · Governança

Nova rota `/central/governanca`, restrita a administrador/gestor de usuários.

A tela consolida o backend já existente de:

- histórico de auditoria;
- alterações de integrações;
- alterações de feature flags;
- acessos do Portal do Parceiro;
- convites de parceiros;
- saúde das integrações e webhooks.

Nenhum segredo ou token de integração é exibido.

## 4. Estoque · Reconciliação

Nova rota `/estoque/reconciliacao` para transformar as pendências de estoque em uma área operacional própria.

Exibe, sem alterar saldos automaticamente:

- locais com histórico legado ainda não migrado;
- locais que precisam de confirmação de contagem física;
- produtos e pontos que exigem atenção;
- atalhos para investigar os itens.

A implementação preserva a regra de não inventar quantidades para CTS, Adriana, ItaPharma ou Ingrid.

## 5. Segurança e permissões

- parceiros continuam sem acesso a Marketing;
- os logins genéricos CTS e ITAPHARMA continuam restritos ao Portal do Parceiro;
- a função interna de configuração automática desses parceiros não pode ser executada por `anon` nem `authenticated`;
- novas RPCs de Marketing não podem ser executadas anonimamente;
- o login por nome de usuário existente não foi alterado.

## 6. Supabase

As migrations deste pacote já foram aplicadas no projeto de produção e estão incluídas aqui apenas para sincronizar o repositório Git:

- `20260717201552_add_marketing_operation_foundation.sql`
- `20260717202938_extend_marketing_operational_tasks.sql`
- `20260717203053_harden_partner_access_for_marketing.sql`

Os timestamps dos arquivos estão alinhados com o histórico real de migrations do Supabase.

## 7. Validação

- TypeScript (`npx tsc --noEmit`): aprovado;
- ESLint: 0 erros, 2 avisos já conhecidos nas imagens privadas da Central Mídia;
- Next.js production build: aprovado com exit code 0;
- rotas confirmadas no build: `/marketing`, `/central/governanca` e `/estoque/reconciliacao`.

## Commit sugerido

`Pacote Consolidado V5 · Logos, Marketing, Governança e Reconciliação`
