# Avaliações do Google na Vitrine

## Estado

Integração preparada; ativação depende do projeto Google aprovado e da autorização OAuth do administrador. Link informado pelo responsável: https://maps.app.goo.gl/jBwJKoXhCydht8Vd8. A confirmação de acesso de administrador não substitui a autorização técnica OAuth. Não afirmar que está sincronizando antes de validar uma resposta real.

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
