# Doctor: Vitrine, zoom e erros React — 19/10/2026

## Escopo e fontes

Continuidade do PR #54, base `b9fd48f`. Skills systematic-debugging, webapp-testing, Web Interface Guidelines, React best practices e Supabase (somente leituras de diagnóstico). Nenhuma migration, dependência, regra financeira, saldo, cliente, pedido ou registro do Doctor alterado nos testes. Sem chamada ao health-check de produção. Preferência de publicação após validação mantida.

## Vitrine: causa do alerta de 129 px

SELECT somente leitura do payload de 18/10/2026: `document_width=414`, `viewport_width=285`, `visual_viewport_width=284.703125`, `visual_viewport_scale=1.45410633`. Header sticky: left 0, right 414, width 414; top -113 por rolagem. O alerta comparava layout de 414 px com a área reduzida pelo zoom manual de ~145%. Isso não comprova conteúdo CSS quebrado: o recorte é esperado ao ampliar e deslocar uma página.

Correção na origem da medição: usar `documentElement.clientWidth/clientHeight` para overflow do documento/elementos fixos, com fallback para `innerWidth/innerHeight`. Manter payload visual para diagnóstico. Sem desativar zoom, esconder overflow, silenciar tipos de erro ou excluir sinais. Sticky continua fiscalizado no eixo horizontal. Header/elemento de 460 px num layout de 414 px ainda gera 46 px de overflow, com ou sem zoom.

Teste de regressão reproduziu falso positivo antes da mudança; depois aprovou zoom e overflow real. Markup SSR da página administrativa e CompanyShell reais, com campanha, depoimento e cupom fictícios (incluindo textos longos): 12 verificações Chromium, seis larguras 285/320/390/683/1093/1366, editor aberto e fechado, sem overflow. `../doctor-review/build.cjs` e `check.py`. Imagens externas bloqueadas; ações e consultas simuladas. Não equivale a Safari físico ou Next autenticado.

## Bank: erro do servidor associado ao React 441

Vercel runtime errors, janela de 7 dias: erro em `/bank`, último em 16/10/2026 15:40:17 UTC, mensagem `Tipo de compromisso não suportado`, digest `713812592@E394`. Doctor registrou React 441 às 15:40:18 UTC. Correlação temporal forte, não prova de todos os erros históricos.

RPC `bank_adjust_month_commitment` aceita charge/invoice/subscription/debt, mas a página oferecia o mesmo ajuste a `weekly_subscription`. Assinaturas/ausência desse tipo na função de produção conferidas por SELECT do catálogo; nenhuma função executada. A RPC semanal existente resolve paid/skipped por ocorrência; não aceita override arbitrário de valor.

Correção de interface/encaminhamento: detalhes semanais identificam valor da semana, conservam Paguei e abrem `/bank/mensalidades?editar=...` para edição e conferência de ocorrências. Aviso explica que editar padrão pode afetar semanas futuras. Não converte valor semanal em total mensal nem inventa uma nova regra de ajuste. Ação mensal recebe proteção de compatibilidade após permissão: requisições antigas semanais seguem para o editor, sem chamar RPC incompatível. Formulário/payload/invalidations mensais mantidos.

Quatro testes isolados: redirecionamento semanal sem RPC de escrita, payload mensal original, acesso negado e SSR da página nos dois casos. Reprodução anterior falhou com o mesmo erro simulado. Tela Bank real com linhas fictícias e markup do diálogo real conferida em 1366×768, 390×844, 320×740 e 844×390; conteúdo sem overflow horizontal, Paguei e editor presentes, sem campo mensal no caso semanal. Hook de foco, Next, ícones e pagamento simulados; não é prova de integração financeira.

## React 418 e Load failed: ainda pendentes

React 418 significa divergência entre HTML do servidor e primeira renderização do cliente ([documentação React](https://react.dev/errors/418)); 441 representa erro de Server Components ([documentação React](https://react.dev/errors/441)). Não são o mesmo problema.

`../doctor-review/hydration.cjs` + `hydration.py`: SSR `renderToString` → `hydrateRoot` em Chromium, React development e componentes reais NewSaleForm, refinamento comercial, painéis opcionais e BudgetConfirmedFlowUX. Três casos fictícios: vazio, produto/cliente pré-selecionados e orçamento salvo pago/entregue. Zero recoverable errors ou pageerrors; form marcou hydration ready nos três. Supabase e Next simulados, rede bloqueada, zero gravações.

Isso não prova resolução do 418 de 17/10: faltam RSC/streaming do Next, módulos globais, dados específicos, extensões e Safari. Não alterados esses componentes, não adicionados suppressHydrationWarning/ignoreBuildErrors. Load failed de 08/10 também não foi reproduzido nem encerrado. O mapa mantém esses itens em andamento e o aceite do responsável separado.

## Gate de entrega

Rodar suite Node, lint direcionado e diff-check; build/TypeScript remotos devem passar no commit final antes de publicar. Não encerrar processos de outros trabalhos nem executar build pesado concorrente no computador compartilhado. Evidência de PR/deployment é necessária para afirmar que a mudança está online.

Integração de `fdde449` preservou as melhorias paralelas da Vitrine e o cabeçalho responsivo PR #57. Ensaio da Vitrine repetido com a nova folha do cabeçalho, sem overflow nos 12 casos; aceite no iPhone permanece pendente. Hidratação 418 não foi declarada resolvida.
