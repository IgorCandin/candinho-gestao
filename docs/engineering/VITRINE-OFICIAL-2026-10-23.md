# Vitrine oficial — entrega agrupada

Cartões: Eardsan4 (vitrine), eJxpG1VT (link de privacidade/acessibilidade), TQR9vkvu (lacunas pontuais) e fase de navegação de AQsgfno9 (portal). Não altera vínculo de clientes, cupom, autenticação, RLS ou banco.

`/catalogo/descobrir` torna-se a entrada anônima. Raízes `/catalogo`, `/vitrine`, `/catalogo/fitness` e `/catalogo/suplementos` redirecionam preservando parâmetros e operação. Redirect temporário 307 permite rollback sem redirect permanente em cache. Detalhes `/catalogo/[slug]` permanecem; canonical/OG específicos impedem que produtos herdem a canonical da coleção. Descobrir indexável, com canonical própria.

Cabeçalho separa Minha conta de Área interna / Company no celular. Não modifica o middleware: telefone sem email mantém portal próprio, parceiros/inativos continuam barrados na entrada Company. Login identifica acesso da equipe. Formulário do cupom ganha política explícita, autocomplete e erro anunciado; booleans e RPC comercial inalterados. Skip link e foco existentes preservados. Não foi instalada solução genérica de cookies nem declarada conformidade jurídica/WCAG integral.

Oito testes focados de rotas, filtros, UI, consentimentos e limites de acesso passaram; suíte completa 187/187; lint direcionado sem erros. Testes são isolados, sem OTP, cupons ou histórico real. Build/TypeScript, conferência visual e publicação precisam ser confirmados por SHA. Detalhes de produto devem ser conferidos por HTTP/fixture, sem disparar o POST de telemetria de PublicProductViewTracker.

Preview do primeiro SHA compilou (READY). Conferido no navegador real em 320/390/414/1024/1366px: Área interna e Minha conta visíveis, sem transbordamento. Teclado alcançou o skip link e o destino ficou abaixo do cabeçalho; alvo recebeu `tabIndex=-1` após a revisão para também mover foco. Canonical oficial e robots index/follow confirmados no DOM. Não equivale a ensaio especializado de acessibilidade ou Safari físico.

Rollback: reverter somente este PR e republicar. Nenhuma migration ou limpeza de dados necessária; links antigos continuam existindo como redirecionamentos.

Pendências separadas: portal completo exige vínculo explícito/auditável e decisão de envio OTP/SMTP, não associação automática por telefone. Google segue aguardando consentimento do titular. Alerta de compra tem reprodução isolada existente; não repetir auditoria nem apagar tarefa manual.

Referências de revisão: Next.js `redirect` (https://nextjs.org/docs/app/api-reference/functions/redirect) e Web Interface Guidelines da Vercel (https://github.com/vercel-labs/web-interface-guidelines). Skills versionadas verificadas; diagnóstico, solução mínima e verificação aplicados. Simplificação restrita às entradas antigas aposentadas, sem refatoração geral.
