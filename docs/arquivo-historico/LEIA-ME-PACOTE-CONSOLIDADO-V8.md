# Candinho Company · Pacote Consolidado V8

## Objetivo

Fechar o ciclo operacional iniciado no Candinho Central, priorizando os dois blocos que ainda estavam incompletos: Portal Parceiro e integrações de atendimento.

Este pacote é consolidado sobre o V7. Não é necessário aplicar V6 ou V7 separadamente antes dele quando o projeto já está na linha atual.

## Portal Parceiro · correção crítica

Foi corrigida uma colisão de rotas entre:

- `/parceiro` — portal externo do parceiro;
- `/parceiros` — gestão interna de parceiros da Candinho Suplementos.

O middleware e o AppShell usavam uma verificação por prefixo que podia interpretar `/parceiros` como se fosse `/parceiro`. Isso podia redirecionar a área gerencial de forma incorreta.

Agora o Portal Parceiro é reconhecido apenas em `/parceiro` ou em subrotas `/parceiro/...`.

## Login e redirecionamento por perfil

- Usuário com role `partner` entra diretamente em `/parceiro` após autenticar.
- Parceiro já autenticado que abrir `/login` é enviado para `/parceiro`.
- Usuários internos continuam indo para `/dashboard` ou para um `next` seguro.
- Parceiro não pode abrir Suplementos, Fitness, Bank, Marketing, Central ou gestão interna de parceiros.
- O Portal agora diferencia erro técnico de vínculo ausente.
- Botão de sair disponível diretamente no Portal.

## Diagnóstico administrativo do Portal

Nova RPC:

- `partner_portal_health_snapshot()`

A Área Gerencial de Parceiros agora mostra:

- login/username do portal;
- vínculo ativo ou pausado;
- último login bem-sucedido;
- perfil/role correto;
- vazamento indevido de permissão interna;
- status `ready`, `paused`, `no_login`, `invalid_role`, `permission_leak` etc.

Também foi adicionada ação para pausar e reativar um acesso existente sem recriar a conta.

No momento da preparação deste pacote, CTS e ITAPHARMA estavam com diagnóstico de backend `ready`, porém sem `last_sign_in_at`, ou seja, ainda não havia registro de login bem-sucedido dos usuários finais.

## Inbox · resposta real preparada

Foi criado o componente de resposta dentro da conversa.

Agora o operador pode:

1. abrir uma conversa;
2. gerar uma sugestão com Nexus;
3. revisar/editar a sugestão;
4. enviar pelo canal Meta conectado;
5. registrar a resposta no histórico da conversa.

O botão antigo duplicado de Nexus nas ações da conversa foi removido. O Nexus fica junto ao campo de resposta, onde faz mais sentido operacionalmente.

## Nova Edge Function · central-meta-send

Função publicada com JWT obrigatório.

Responsabilidades:

- validar o usuário autenticado;
- validar permissão de escrita para o escopo da conversa;
- localizar canal e identidade externa do contato;
- enviar texto por WhatsApp, Instagram ou Facebook quando o canal estiver configurado;
- registrar a mensagem de saída em `central_messages`;
- atualizar o status da integração;
- nunca persistir access tokens em `central_integrations`.

Secrets esperados para envio:

- `META_GRAPH_API_VERSION`
- `META_WHATSAPP_ACCESS_TOKEN` ou `META_ACCESS_TOKEN`
- `META_INSTAGRAM_ACCESS_TOKEN` ou `META_ACCESS_TOKEN`
- `META_FACEBOOK_PAGE_ACCESS_TOKEN` ou `META_ACCESS_TOKEN`

## Webhook Meta V3

`central-meta-webhook` foi atualizado em produção para a versão 3.

Melhorias:

- preserva o escopo cadastrado da conta mesmo antes do primeiro evento;
- ao receber um evento real, marca a integração correspondente como conectada;
- atualiza `last_sync_at`;
- continua validando assinatura HMAC da Meta;
- processa mensagens WhatsApp, Instagram e Facebook;
- processa status de entrega do WhatsApp para mensagens de saída.

## Diagnóstico de integrações V2

`central-integration-readiness` foi atualizado em produção.

Agora diferencia:

- pronto para receber;
- pronto para responder;
- token de verificação;
- App Secret;
- versão da Graph API;
- token de envio por canal;
- disponibilidade da OpenAI;
- status das funções de webhook, envio, Nexus, mídia e convite de parceiro.

## O que ainda depende de configuração externa

O código está preparado, mas não existem contas Meta cadastradas em `central_integrations` no momento da geração deste pacote.

Para funcionar com mensagens reais ainda é necessário, diretamente nos painéis oficiais e Secrets:

1. cadastrar os IDs técnicos das contas/canais na tela Integrações;
2. configurar os Secrets Meta no Supabase;
3. configurar o callback do webhook no aplicativo da Meta;
4. assinar os eventos necessários de cada canal;
5. enviar/receber uma mensagem real para validar ponta a ponta.

Para Nexus e classificação de mídia, `OPENAI_API_KEY` deve ser configurada como Secret do ambiente da Edge Function. Não colocar a chave no frontend, banco ou arquivo versionado.

## Segurança

- `central-meta-send` exige JWT.
- Webhook Meta permanece sem JWT porque recebe chamadas externas da Meta, mas faz validação própria de assinatura HMAC.
- `partner_portal_health_snapshot` não é executável por `anon`.
- Tokens e chaves não são armazenados em `central_integrations.settings`.
- O advisor do Supabase continua mostrando avisos preexistentes de arquitetura/RPC e o bucket público `product-images`; estes não foram alterados de forma ampla neste pacote para evitar quebrar operações existentes.
- `resolve_login_email` continua anônimo intencionalmente por causa do login por username; um endurecimento futuro deve preservar essa funcionalidade.

## Validação local

- ESLint: 0 erros; 2 warnings antigos de `<img>` na Mídia.
- TypeScript: 0 erros.
- Next.js production build: exit code 0.
- Rotas `/parceiro` e `/parceiros/gerencial` presentes no build.
- Edge Functions `central-meta-send`, `central-meta-webhook` V3 e `central-integration-readiness` V2 confirmadas como ACTIVE no Supabase.

## Commit sugerido

`Pacote Consolidado V8 · Portal Parceiro e Integrações End-to-End`
