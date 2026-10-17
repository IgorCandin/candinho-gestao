# Qualidade, duplicidades e liberação mobile

## Situação

Mobile ainda não está homologado. A migração pode avançar junto dos testes do responsável, mas publicação/build não comprovam que um ajuste ou acerto real funcionou.

## O que já dá para usar sem instalação adicional

- `npm run test:company`: regressões locais de contexto Company/legado, conversões Fitness, consignações, retornos de promoções e permissões simuladas. Nenhuma RPC real executada pelos testes.
- `npm run audit:duplicates`: compara corpos de funções de pelo menos 80 tokens em arquivos distintos, ignorando espaços/comentários. Apenas candidatos exatos; não detecta toda semelhança semântica nem duplicidade de dados. Não imprime trechos de código ou dados pessoais e não altera arquivos.
- Primeira execução: 831 arquivos examinados, 12 grupos. Exemplos: validações repetidas no Bank, transformação de dados comercial e cópia de `fitnessSignalCopy`. Nenhuma refatoração automática: funções visualmente iguais podem ter contratos e permissões diferentes.
- Já disponíveis: webapp-testing, React best practices, Web Design Guidelines e orientações Supabase. A prioridade é aplicá-las e guardar evidências, não instalar várias skills sobrepostas.
- Escopo da revisão de interface desta rodada: links, formulários/contexto e conversão; não é auditoria visual integral do ERP. Checklist inclui labels, foco, avisos assíncronos e alternativas ao swipe.

## IA que testa “como uma pessoa”

Sem o link do vídeo/repositório não dá para identificar com certeza. Candidatas verificadas:

- [TestSprite](https://github.com/TestSprite/testsprite-cli): plataforma de testes por IA com execução cloud/CLI, API key e opção de túnel. Repositório do CLI aberto não torna todo o serviço gratuito. Antes de adotar, conferir plano, escopos, retenção e dados enviados.
- [Browser Use](https://github.com/browser-use/browser-use): automação de navegador por agente, local ou cloud. Exige modelo/configuração; ações com uma sessão autenticada podem alterar dados. Não instalado nesta rodada.
- [Stagehand](https://github.com/browserbase/stagehand): alternativa de automação de navegador orientada por código/IA, para avaliar somente se os testes atuais não forem suficientes.

Nenhuma ferramenta foi conectada ao ERP, nenhum túnel aberto e nenhuma credencial solicitada. Testes autônomos de escrita exigem ambiente isolado, usuário próprio de menor privilégio e dados fictícios. Preview ligado ao Supabase real **não é** ambiente isolado.

## Skills pesquisadas

Consulta em 17/10/2026: [webapp-testing](https://www.skills.sh/anthropics/skills/webapp-testing), fonte Anthropic, cerca de 179,6 mil instalações; [Web Design Guidelines](https://www.skills.sh/vercel-labs/agent-skills/web-design-guidelines), fonte Vercel, cerca de 747,6 mil. Contagens são temporais e não garantem segurança. Ambas já estão disponíveis localmente; não é necessário reinstalar.

Comandos de instalação de referência, **não executados**: `npx skills add https://github.com/anthropics/skills --skill webapp-testing` e `npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines`.

## Portões para finalizar mobile

### Lote de tipos e testes sem API — 17/10

- Causa confirmada no build webpack local: `companyMode` era prop de três páginas de rota e consignações também aceitava argumento `undefined`. O verificador gerado do Next.js rejeitava esses contratos.
- Correção: componentes completos movidos para `src/components/operational-pages/`, sem alterar consultas, ações ou layout. Entradas legadas recebem apenas props de rota; entradas Company usam os mesmos componentes com contexto explícito. Não desativar verificação nem editar tipos gerados.
- 44 testes Node aprovados; quatro novos cobrem registros/links nos dois contextos, leitura sem escrita, acesso negado antes da consulta, falha não disfarçada de lista vazia e busca/filtros/paginação.
- `npm test` executa todas as regressões Node; `npm run test:company` inclui lotes/sabores e páginas compartilhadas. Nenhuma chamada a API de IA ou banco real.
- Playwright isolado do runtime do ERP, versão fixada em `tests/browser/requirements.txt`. Executar `python tests/browser/readonly_smoke.py --base-url https://candinho.duckdns.org`. Perfil novo sem credenciais; bloqueia todos os métodos diferentes de GET/HEAD; seis rotas em dois tamanhos. Confere acesso ao login, não funcionalidade autenticada nem aprovação mobile. Evidência de execução deve ser registrada separadamente.
- Permanecem: fluxos autenticados e ações reais em ambiente isolado, iPhone/Safari e lint/segurança preexistentes. Não marcar aprovação do responsável automaticamente.

Evidência de execução deste lote: 44/44 testes Node; lint direcionado sem erros/avisos; TypeScript isolado aprovado e fase TypeScript do build webpack concluída (63s), sem as três incompatibilidades anteriores. Build local parou depois no prerender de `/catalogo` por ausência da configuração Supabase local; não mascarado com valores fictícios. Build remoto completo READY, commit `e051c94`, produção `dpl_BUbsQuiXJcrXkNUjvK1ePauezqk4`. Playwright 1.64.0/Chromium: 12/12 verificações sem login (1366×768 e 390×844) em lotes, sabores, histórico de sabores, consignações, movimentações e Central; todos os métodos de gravação bloqueados. Não verifica funções autenticadas ou Safari real. Comparação dos três componentes movidos com `83f544d` confirmou conteúdo idêntico, descontando apenas o nome da função.

1. Operações: venda/orçamento, pagamento e entrega independentes, cancelamento, estoque por variação, conversão, consignação e parceiro. Teste real somente em uma operação desejada pelo responsável ou ambiente isolado.
2. Navegação: links e retornos mantêm Company; destino sem substituto continua explicitamente pendente, sem esconder função.
3. iPhone/Safari: retrato e paisagem, teclado aberto, rolar até o último botão, fechar/voltar nas janelas e focar campos sem cortes. Emulação desktop não substitui aparelho real.
4. Dados: não juntar clientes/produtos por nome semelhante. Duplicidade de cadastro exige relatório somente leitura, identidade/vínculos e confirmação antes de qualquer fusão.
5. Qualidade: distinguir sinal antigo do Doctor de erro atual reproduzido; conservar histórico. Corrigir por lotes o lint preexistente e revalidar alertas de dependências antes do encerramento.

O mapa mantém as tarefas abertas até evidência de aprovação. Não zerar Doctor, notas ou histórico para aparentar conclusão.
