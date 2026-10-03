# Auditoria de segurança — 29/09/2026

## Resumo executivo

Foi confirmado risco urgente nas dependências de produção: Next.js 16.2.10 possuía alertas críticos e altos; Sharp e PostCSS também estavam abaixo das versões corrigidas. O código foi preparado para Next.js 16.3.3, Sharp 0.35.4 e PostCSS 8.5.23.

Não foi encontrada chave real em arquivo de ambiente versionado. O único arquivo encontrado é `.env.example`, com valores ilustrativos. Uma ocorrência textual de `service_role` em auditoria SQL descreve permissão e não contém uma credencial.

## Verificado

- Manifesto e lockfile de dependências.
- Varredura do conteúdo rastreado por padrões comuns de chaves e chaves privadas.
- Separação entre chave publicável e segredo Supabase.
- Cliente Supabase de navegador e servidor.
- Proxy de autenticação e matriz de acesso.
- Uso de segredo administrativo no endpoint de histórico do portal do cliente.
- Amostra de rotas de escrita, uploads e operações do Bank.
- Presença de RLS, grants, views e funções `SECURITY DEFINER` nas migrations.

## Não foi possível confirmar apenas pelo repositório

- Variáveis efetivamente configuradas na hospedagem e sua rotação.
- Migrations realmente aplicadas no projeto Supabase de produção.
- Estado atual das políticas RLS, grants, buckets e advisors do banco vivo.
- Proteções ativadas no GitHub: secret scanning, push protection, Dependabot e CodeQL.
- Histórico completo de possíveis segredos removidos de commits antigos.
- Regras de firewall, logs e alertas da hospedagem.

## Problemas confirmados e correções

### SEC-001 — Dependências vulneráveis — prioridade urgente

- Local: `package.json` e `package-lock.json`.
- Impacto: os alertas incluíam execução remota não autenticada em cenários suportados pelo Next.js, bypass de proteção e vulnerabilidades no processamento de imagens.
- Correção: atualização das versões diretas e regeneração do lockfile.
- Validação: auditoria de produção concluída com zero vulnerabilidades; TypeScript aprovado. O build compilou e concluiu a verificação de tipos, mas a geração de `/catalogo` exige as variáveis Supabase que não existem neste checkout local.

### SEC-002 — Ausência de automação versionada de atualização — prioridade média

- Local: não existia `.github/dependabot.yml`.
- Impacto: correções de segurança podem permanecer invisíveis até uma auditoria manual.
- Correção: Dependabot semanal, agrupando atualizações menores e de patch; atualizações principais permanecem separadas para revisão.

## Alertas para validação externa

### Banco Supabase

O histórico contém muitas funções `SECURITY DEFINER` e views. Isso não prova vulnerabilidade, pois migrations posteriores revogam acessos e adicionam `security_invoker`, mas o estado efetivo precisa ser verificado no banco com advisors e consulta de grants/policies. Prioridade alta de validação, sem migration automática nesta etapa.

### Endpoint administrativo do portal do cliente

`/api/customer-portal/history` usa a chave secreta somente no servidor após validar o usuário por e-mail. A chave não é enviada ao navegador. O endpoint consulta clientes em memória para encontrar o vínculo; é funcional, mas deve evoluir para lookup restrito no banco/RPC para reduzir a quantidade de dados lida com privilégio administrativo.

### Rotas públicas da Vitrine

Rotas sob `/api/catalogo` são deliberadamente públicas para catálogo e geração de interesse. Devem receber rate limit/antiabuso na infraestrutura. O repositório valida tamanho e formato de vários campos, mas não comprova proteção de borda.

## Ações do responsável

1. Confirmar no GitHub se Secret Scanning/Push Protection e Dependabot estão habilitados para o repositório privado.
2. Autorizar uma inspeção somente de leitura do projeto Supabase de produção para RLS, grants, advisors e migrations aplicadas.
3. Confirmar na Vercel que apenas chaves publicáveis usam prefixo `NEXT_PUBLIC_` e rotacionar qualquer segredo cuja exposição seja suspeita.
4. Avaliar rate limiting das rotas públicas antes de campanhas de grande volume.

Nenhum segredo, dado real, regra de venda ou saldo de estoque foi alterado nesta auditoria.

## Validação no Supabase de produção — 29/09/2026

Com autorização do responsável, o Advisor e as configurações do projeto
`candinho-suplementos` foram inspecionados em modo de leitura antes da correção.

Achados confirmados e corrigidos:

- `purchase_planning_overview`, `product_sales_category_intelligence` e
  `replenishment_overview` voltaram a usar `security_invoker=true`;
- a função exclusivamente interna `defer_sale_acquisition_cost_v4545()` deixou
  de ser executável por `PUBLIC`, `anon` e `authenticated`;
- a própria transação verificou as três opções de view e os privilégios da
  função antes do `commit`;
- após atualizar o linter, o Security Advisor passou a mostrar **0 erros**.

O aviso `Leaked Password Protection Disabled` permanece porque o recurso é
disponível apenas no plano Pro. Nenhuma assinatura ou custo foi criado. Os
buckets públicos encontrados são exclusivamente os de imagens de produto;
arquivos internos permanecem sem a marcação `PUBLIC` e possuem políticas.

Migration versionada:
`supabase/migrations/20260929175034_harden_live_advisor_findings.sql`.

## Qualidade encontrada durante a validação

### Atualização de 03/10/2026 — políticas de escrita

Aplicada pelo conector Supabase a migration `restrict_open_write_policies`.
As políticas de `ux_issue_reports` e `customer_partner_link_reviews` agora
validam o perfil ativo e o acesso correspondente ao fluxo. Escrita direta foi
limitada às colunas utilizadas pelas rotas atuais, protegendo autoria e vínculos.
Revisores autorizados podem continuar revisões iniciadas por outro usuário.
Verificação no banco confirmou atualização de status permitida e alteração de
autoria/cliente negada. Teste visual dos fluxos ainda pendente.

### Atualização de 03/10/2026 — funções internas

Aplicada em produção a migration `20261003131229_secure_helper_functions.sql`.
Dez funções auxiliares passaram a usar `search_path=pg_catalog`, após revisão
das definições. Seis funções de trigger perderam execução direta pelo cliente;
seus triggers continuam responsáveis pela execução automática. Não houve
alteração de regras comerciais nem de registros reais. Testes SQL de slug e
relacionamento passaram; testes visuais de venda, sabores e agenda pendentes.

- `npm audit --omit=dev`: aprovado, zero vulnerabilidades.
- `npx tsc --noEmit`: aprovado.
- Compilação Next.js: código compilado com sucesso; prerender local bloqueado somente pela ausência das variáveis Supabase.
- ESLint: 67 erros e 28 avisos já existentes, concentrados em tipagem explícita, pureza de hooks e padrões de imagem/navegação. Tratar em lotes separados para evitar alterações funcionais em massa.

