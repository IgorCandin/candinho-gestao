# Pacote Candinho Central · Interface V1

Pacote preparado sobre o código atual do `candinho-gestao`, preservando as operações existentes de Candinho Suplementos, Candinho Fitness e Candinho Bank.

## O que entrou na interface

- Home V2 mais enxuta, com acesso às operações sem repetir dashboards completos.
- Candinho Central com visão geral, Inbox, Clientes, Mídia, Nexus e Integrações.
- Inbox para WhatsApp, Instagram e Facebook, consumindo a estrutura já preparada no Supabase.
- Biblioteca privada de mídia com busca e classificação por IA.
- Nexus com sugestões de resposta para revisão humana.
- Portal Parceiro com vendas, estoque do ponto, regra/percentual da parceria e histórico mensal.
- Gestão de acesso de parceiros dentro da Área Gerencial de Parceiros.
- Estoque V2, separando cadastro de Produtos do controle físico por local.
- Área de Teste escondida pela feature flag, sem apagar suas tabelas.
- Proteção de rotas para Central e Portal Parceiro.

## Backend já aplicado no Supabase de produção

O backend deste pacote já foi aplicado diretamente ao projeto Supabase conectado. Não execute migrações destrutivas para “recriar” essas estruturas na produção.

Principais RPCs usadas pela interface:

- `app_bootstrap_snapshot()`
- `central_dashboard_snapshot()`
- `central_inbox_snapshot(...)`
- `central_integration_health_snapshot()`
- `central_media_search(...)`
- `central_mark_conversation_read(...)`
- `central_set_conversation_status(...)`
- `inventory_workspace_snapshot()`
- `partner_portal_admin_snapshot()`
- `partner_portal_dashboard(...)`
- `partner_portal_get_monthly_history(...)`

Edge Functions já implantadas:

- `central-meta-webhook`
- `central-media-classify`
- `central-nexus-suggest`
- `partner-portal-invite`

Migrações aplicadas ao vivo em 17/07/2026:

- `20260717133136_create_candinho_central_foundation`
- `20260717133312_harden_candinho_central_foundation`
- `20260717133359_create_central_media_storage`
- `20260717134633_create_partner_portal_access`
- `20260717134916_create_inventory_workspace`
- `20260717134938_fix_inventory_workspace_aggregations`
- `20260717135016_add_partner_portal_admin_overview`
- `20260717135351_create_company_home_snapshot`
- `20260717135824_create_central_operational_views`
- `20260717135836_create_inventory_workspace_attention`
- `20260717154206_create_integration_status_overview`
- `20260717154353_index_partner_user_links_created_by`
- `20260717154504_auto_link_central_contacts`
- `20260717154515_add_manual_central_contact_link`
- `20260717154655_create_ui_contract_snapshots`
- `20260717154734_create_app_bootstrap_snapshot`
- `20260717154806_optimize_ui_feature_flags_policies`
- `20260717155049_add_central_partner_governance_audit`
- `20260717155202_add_partner_monthly_history_and_integration_health`
- `20260717155235_harden_central_auto_link_permissions`
- `20260717155320_prevent_secrets_in_central_integration_settings`

> Observação: o histórico local de migrações do arquivo recebido é anterior a parte dessas alterações conectadas. Este pacote documenta o estado já aplicado na produção, mas não tenta reexecutar ou duplicar as migrações.

## Validação realizada

- `npm ci`: concluído.
- `npm run lint`: concluído sem erros; existe apenas um aviso não bloqueante do Next.js sobre `<img>` na biblioteca de mídia privada.
- `npm run build`: concluído com sucesso no Next.js 16.2.10.
- Novas rotas compiladas: `/central`, `/central/inbox`, `/central/clientes`, `/central/midia`, `/central/nexus`, `/central/integracoes` e `/parceiro`.

## Como instalar sobre o projeto atual

1. Faça um backup da pasta atual ou confirme que suas mudanças atuais já estão commitadas.
2. Extraia o conteúdo deste ZIP por cima da pasta atual `candinho-gestao`.
3. Aceite substituir os arquivos com o mesmo nome.
4. NÃO apague nem substitua sua pasta `.git`.
5. NÃO apague nem compartilhe seu `.env.local` / `.env` de produção.
6. Abra o GitHub Desktop e revise as alterações.
7. Sugestão de commit: `Pacote Candinho Central · Interface V1`.
8. Faça `Push origin`. A Vercel deve iniciar o deploy pelo fluxo já conectado ao repositório.

## Credenciais ainda necessárias para ativar recursos externos

O código não inclui segredos. Para usar os recursos completos, as credenciais devem continuar nas configurações seguras do Supabase/Vercel:

- Meta: token de verificação e App Secret para o webhook.
- OpenAI: API key para classificação de mídia e sugestões do Nexus.

Nunca grave tokens, senhas, API keys ou App Secrets na tabela `central_integrations`.
