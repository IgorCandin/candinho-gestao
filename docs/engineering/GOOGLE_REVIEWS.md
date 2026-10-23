# Avaliações do Google na Vitrine

## Estado

Integração preparada. Em 23/10/2026, o responsável informou aprovação do projeto `923790320974`, protocolo `7-3896000042034`, com cota de 300 QPM. Essa informação não comprova conexão OAuth ou sincronização: faltam credenciais privadas do cliente desktop, consentimento do administrador, seleção da unidade e configuração na hospedagem. Link informado pelo responsável: https://maps.app.goo.gl/jBwJKoXhCydht8Vd8. Não afirmar que está sincronizando antes de validar uma resposta real.

Pedido de acesso enviado pelo responsável em 19/10/2026: protocolo `7-3896000042034`, projeto **My Maps Project**, ID `stable-glass-489311-m7`, número `923790320974`. O Google informou 7–10 dias úteis; não abrir pedidos duplicados. O projeto anterior `trans-opus-425801-b7` pertencia à conta incorreta e não deve ser usado. Data de verificação do perfil informada pelo responsável: 2 de março; não foi comprovada por API.

## Preparação do cliente OAuth e conexão assistida

Reutilizar o assistente existente; não repetir o pedido de aprovação. A consulta real depende de habilitação das APIs, OAuth e validação da unidade. Em 23/10, `--help` foi verificado sem iniciar OAuth ou salvar credenciais; a conexão real continua pendente.

1. No projeto **stable-glass-489311-m7**, abrir Google Auth Platform e configurar nome do aplicativo (Candinho — avaliações da Vitrine), contato do responsável e audiência adequada à conta administradora. Solicitar somente `https://www.googleapis.com/auth/business.manage`, exigido pelo Google mesmo para ler avaliações. A implementação não escreve no perfil. Conferir os requisitos de publicação/verificação que o Google apresentar. Modo externo **Testing** pode expirar o refresh token em sete dias para esse escopo: não considerar uma conexão de teste como solução permanente.
2. Criar cliente OAuth do tipo **Aplicativo para computador** para o assistente local e baixar o JSON em uma pasta privada fora do repositório. O assistente rejeita cliente de outro projeto ou tipo web; não cadastrar um redirect de produção para esse cliente. JSON e refresh token nunca vão para o chat. Arquivos padrão `client_secret*.json` e `.env*` também estão ignorados no Git.
3. Após a aprovação, habilitar **Google My Business API**, **My Business Account Management API** e **My Business Business Information API**. As duas últimas permitem descobrir contas/unidades sem copiar IDs manualmente. Nenhum novo formulário de aprovação é enviado pelo assistente.
4. Na raiz do projeto, executar:

   ```powershell
   node scripts/connect-google-business.mjs --credentials "C:/caminho-privado/client_secret_google.json"
   ```

5. Abrir o endereço exibido no navegador e revisar/conceder a autorização no Google. O responsável executa esse consentimento. O retorno usa loopback `127.0.0.1` em porta aleatória, state descartável e PKCE S256; o código retorna direto ao assistente, não por mensagem. O fluxo expira após cinco minutos.
6. Escolher explicitamente o perfil da Candinho na lista; comparar nome/conta com o Maps e confirmar digitando `CONECTAR`. Não há escolha automática do primeiro perfil. O assistente consulta as avaliações desse recurso para validar o acesso antes de salvar qualquer token.
7. O resultado fica em `.env.google-business.local`, apenas no computador e ignorado pelo Git. Nunca sobrescreve arquivo anterior. Transferir as cinco variáveis pelo canal seguro de configuração do servidor da Vitrine; cliente/segredo/refresh token como variáveis sensíveis, sem exibir valores em logs ou no chat. O arquivo não é carregado automaticamente pelo Next.js e não ativa o site sozinho. Publicar o ambiente configurado e validar `/company/vitrine` e ambas as vitrines. Esse último passo de hospedagem é técnico, não exige copiar tokens em uma conversa.

Se houver recusa, API não habilitada, cota ou perfil incorreto, nada é salvo e os depoimentos atuais permanecem. Desconectar pelo controle de aplicativos autorizados da conta Google, remover o refresh token da hospedagem e republicar. Manter o JSON/arquivo de configuração em pasta de acesso restrito ao responsável; a opção `mode: 0600` do assistente não substitui as permissões ACL do Windows.

## Ativação

1. No Google Cloud, usar um projeto da Candinho aprovado para as Business Profile APIs e habilitar a Google My Business API. Aprovação do Google pode ser necessária; não contornar com scraping.
2. Configurar o cliente OAuth e autorizar a conta administradora com acesso offline ao escopo `https://www.googleapis.com/auth/business.manage`. Esse escopo do Google também permite administração; nossa implementação executa somente leitura de avaliações. A concessão deve ser revisada e feita pelo responsável. Não pedir senha, código de autorização ou tokens no chat.
3. Obter o recurso da unidade correta em `accounts/ACCOUNT_ID/locations/LOCATION_ID` usando as APIs de contas/unidades. Confirmar que corresponde ao perfil do link informado, sem adivinhar IDs pelo nome da empresa.
4. Configurar `GOOGLE_BUSINESS_CLIENT_ID`, `GOOGLE_BUSINESS_CLIENT_SECRET`, `GOOGLE_BUSINESS_REFRESH_TOKEN` e `GOOGLE_BUSINESS_LOCATION` diretamente nas variáveis de servidor da hospedagem. Segredos devem ser sensíveis, sem prefixo NEXT_PUBLIC_, sem Git/logs. A URL pública pode ser alterada por `GOOGLE_BUSINESS_MAPS_URL`. Fazer novo deployment após configurar.
5. Em `/company/vitrine`, conferir Conectado; verificar nome, estrelas e texto da resposta real contra o perfil da empresa. Conferir ambas as rotas públicas `/catalogo` e `/catalogo/descobrir`. Falha, revogação ou falta de configuração mantém os depoimentos manuais e informa pendência na gestão.

## Comportamento e limites

- Busca ao abrir/recarregar a página, com OAuth e HTTP executados somente no servidor; não atualiza uma aba já aberta continuamente. Não há cron nem promessa de atualização instantânea.
- Consulta as 50 avaliações mais recentemente atualizadas e apresenta até seis com comentário, sem filtro de estrelas. O link abre todas as avaliações do perfil; não é link individual de uma avaliação.
- Preserva texto, nome público e estrelas retornados. Comentários sem texto não entram nos cartões; não se inventam relatos, compradores verificados ou recomendações.
- Resposta bem-sucedida substitui a seleção manual para impedir duplicatas. Cadastros existentes não são excluídos. Ausência de comentários na resposta bem-sucedida não é erro nem motivo para atribuir os manuais ao Google.
- Requisições `no-store`, timeout de 5s por etapa, sem cópia persistente dos dados do Google no Supabase. Não há alteração de schema, venda, estoque, cupom nem resposta automática a avaliações. Logs não incluem dados do Google nem credenciais.
- A falha usa os depoimentos manuais identificados como cadastros da equipe, sem selo de sincronização. Conta revogada pode ser desconectada removendo o refresh token no ambiente e republicando.

## Referências oficiais

- https://developers.google.com/my-business/content/basic-setup
- https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list
- https://developers.google.com/my-business/content/policies

## Validação

Testar OAuth indisponível/revogado, timeout, resposta vazia/malformada, nomes e texto escapados pelo React, estrelas baixas preservadas, ausência de duplicatas manuais, configuração ausente sem chamadas externas e proteção das credenciais. Fixtures são simuladas e não devem aparecer em produção.

Testes do assistente cobrem PKCE/state, projeto/tipo do cliente, paginação de contas/unidades, seleção pelo recurso completo, recusa 403, ciclo de paginação e serialização sem injetar variáveis. `--help` funciona sem abrir OAuth, chamar APIs ou criar arquivos.
