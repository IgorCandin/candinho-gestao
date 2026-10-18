# Observações de desenvolvimento

### Mobile: foco e rolagem das janelas — 18/10/2026

- Contexto: avançar o mapa enquanto o responsável confere Bank no iPhone, sem perda de funções ou dados reais.
- Evidência anterior: quatro janelas mantinham foco no acionador atrás do diálogo. Causa: sem ciclo completo de foco/Tab/restauração; role=dialog não implementa esses comportamentos.
- Correção: hook local nas janelas de conclusão, recebimento conjunto, fotos e painel Bank; CSS de altura dinâmica, área rolável, margens seguras e controles alcançáveis. Ações e payloads originais preservados.
- Verificação: 72 testes Node, lint direcionado e 20 verificações Chromium isoladas em cinco dimensões. Testes não autenticam nem gravam no banco real; integrações e Safari físico seguem pendentes. Evidências e limites em MOBILE-JANELAS-2026-10-18.md. Publicação condicionada ao build remoto.

### Acompanhar por operação e próximo passo — 18/10/2026

- Mesmo padrão de filtros de Concluir: operação visível, contagens por contato/operação, busca e limpeza. CSS compartilhado por uma classe comum; Concluir preserva seu comportamento.
- Uma pessoa com assuntos nas duas operações aparece em cards separados. Cada assunto mostra orientação, data ou ausência de data e ação específica para pós-venda, retorno ou contato. Telefone ausente aponta para a fila da operação.
- Resultado da conversa fica antes do histórico, inclusive na ordem de teclado. Reagendamentos existentes de 30 dias ficam explícitos nos rótulos. Preparar venda não conclui contato nem registra feedback prematuramente; RPCs mantidas.
- TypeScript/lint aprovados; testes de agrupamento, orientação e preparação sem gravação. Fixture real do componente testada em 1071px, 390px e 320px com filtros, busca, limpeza, teclado, orientação, histórico recolhido, alvos de 44px e sem overflow. Nenhuma operação real gravada. Build e abertura oficial são condições de publicação.

### Filtros de Concluir — 18/10/2026

- Seletor nativo de operação substituído por botões visíveis com contagens e estado aria-pressed. Operação, pendência e busca têm rótulos e agrupamentos próprios; busca pode ser limpa e filtros podem ser restaurados.
- Indicadores do topo e contagens de pendência acompanham a operação/produto selecionados; recebimento, entrega e pagamentos agrupados mantêm suas ações existentes.
- TypeScript/lint aprovados. Fixture local do componente real conferida em 1071px, 390px e 320px: mudança de operação, métricas, pendência, busca, limpeza, teclado, alvos de 44px e ausência de overflow. Sem mutação de dados reais. Build remoto e abertura oficial são condições de publicação.

### Planejamento Bank: acabamento e gate de publicação — 18/10/2026

- Contexto: melhorar leitura e navegação desktop/celular, preservando funções; publicar somente após tipos/build aprovados, sem disputar recursos com outros trabalhos.
- Alteração: hierarquia financeira, atalhos, estados das entradas, filtro de cartão com contagem/valor/restauração e encaixe responsivo. Preservados filtros de vencimento, edição de recebimentos, cálculo e ações do main mais recente.
- Evidência: 67 testes Node e lint direcionado aprovados; Chromium isolado com dados fictícios em 1366×768, 390×844, 320×740 e 844×390, incluindo filas, arrastar, teclado, detalhes e simulador. Vercel `0ea8023` READY: TypeScript 5,4 s, compilação 3,0 s, 36/36 páginas estáticas. Commit final deve passar pelo mesmo gate antes de produção.
- Limite: tipos locais esgotaram heap de 1 GB com prioridade baixa; nenhum processo de outro trabalho encerrado. Nenhuma migration ou gravação em dados reais. Safari/iPhone e ações reais desejadas ainda precisam da conferência do responsável. Registro completo em BANK-INTERFACE-2026-10-18.md; mapa mantém estado Testar.

### Orçamento da própria consignação — 18/10/2026

- Correção de interpretação: o botão genérico para a lista de orçamentos não atendia ao pedido. Cada consignação agora abre seu próprio PDF, a partir das peças, quantidades enviadas e preços registrados no envio. Disponível na linha e nos detalhes.
- Documento somente de leitura, sem criar orçamento duplicado, venda, recebimento ou movimento de estoque. Não usa saldo pendente zerado após finalização nem expõe custos internos/notas. API verifica acesso Fitness, identificador, inexistência e erro dos itens; cache privado/no-store.
- Oito testes operacionais/API/PDF aprovados; TypeScript aprovado. PDF sintético renderizado e conferido visualmente, inclusive logomarca e total R$ 94,80; paginação com nomes longos e 35 itens testada. Build remoto é condição de publicação.

### Atalhos da consignação — 18/10/2026

- Lista Company/Fitness ganhou Orçamentos no cabeçalho e Abrir venda por registro com sale_id. Sem venda vinculada, a ação abre acerto ou histórico; devolução não aparece como venda finalizada.
- Alteração somente de navegação e rótulos. Nenhuma criação de orçamento, venda ou movimento de estoque. Cinco testes operacionais aprovados, incluindo destinos Company/legado e acesso somente de leitura. Build remoto é condição de publicação.

### Fluxo operacional — 17/10/2026

- Consignação aceitava zero vendido como finalização e registrava devolução total. Venda agora exige quantidades explícitas e pelo menos uma peça; devolução tem ação separada. Histórico real não foi reescrito.
- Teste SQL sintético executado com ROLLBACK: venda vinculada, baixa somente da peça vendida e devolução sem duplicar estoque. Consulta posterior confirmou zero fixtures restantes.
- Escritório encaminha recebimento, entrega e pós-venda por operação/fila; estoque destaca demanda sem disponível; menus por tarefa no Início/Ferramentas; Planejamento permite corrigir recebidos.
- Mapa ganha conferência persistida para o planejamento, preservando aprovados e histórico. Migration 20261017220900 aplicada; RLS e grants preservados; teste autenticado revertido.
- 418 reproduzido em venda Suplementos. Auxiliar de orçamento passa a aguardar hidratação do formulário antes de mutar DOM; reconferir após publicação. Bank abriu sem erro nesta visita; 441 e Load failed antigos continuam em investigação no mapa.
- TypeScript aprovado; 53 testes passaram antes de acrescentar regressão de quantidades vazias/zero. Rotina e limites documentados em ROTINA-TESTES-ERP.md. Build remoto e verificação oficial são condição de publicação.

Use este arquivo como fila leve de correções, não como lista automática de mudanças.

## Formato

```text
ID:
Data:
Contexto:
Evidência:
Sugestão:
Status: observado | confirmado | adotado | transformado em teste | descartado
Referências:
```

## Observações atuais

### OBS-TIPOS-20261017 — Props de rota não são opções de componente

- Contexto: build webpack local rejeitou três páginas compartilhadas na migração.
- Evidência: tipos gerados do Next.js rejeitavam `companyMode` em estoque/[id], Fitness/movimentacoes e o argumento opcional de Fitness/consignacoes.
- Mudança: componentes movidos sem alteração funcional; páginas legadas e Company compõem os mesmos componentes. Regra registrada em AGENTS.md e regressão de contratos/navegação adicionada.
- Status: 44 testes Node, lint direcionado e tipos aprovados; build remoto completo READY em produção (`e051c94`). 12 verificações Playwright de acesso ao login aprovadas, com gravações bloqueadas. Build local passou pelos tipos e parou depois por configuração Supabase ausente no prerender do catálogo. Não confundir com homologação de ações reais/mobile; nenhum dado real alterado.
- Referências: tests/operational-pages.test.cjs; QUALIDADE-E-MOBILE-2026-10-17.md.

### OBS-LOTES-20261017 — Lotes, sabores e aliases da Central

- Contexto: continuar migração sem remover funções e testar sem API paga.
- Evidência: links de lote/rastreio usavam Next Link direto; histórico de sabores não era reconhecido pelo conversor de destinos. A página Company de histórico já existia e foi reutilizada. Aliases pausados da Central devolviam ao legado.
- Mudança: entradas de lotes/sabores no catálogo Company, links contextuais e aliases Central diretos. RPCs de classificação, rastreio e quarentena permanecem inalteradas; Inbox/Nexus pausados não são reativados.
- Status: 40 testes Node aprovados, incluindo filtros/fragmentos e aliases. Tipos, lint e publicação devem ser conferidos separadamente. Ações reais e Safari/iPhone pendentes; não marcar aprovação automaticamente.
- Testes sem custo de API: regressões determinísticas locais; nenhuma chave criada, serviço contratado ou ferramenta de IA instalada. Playwright não requer API de modelo. Ambiente de prévia não isola o banco real.
- Referências: tests/company-lots-flavors.test.cjs; /company/mapa.

### OBS-MIG-20261017 — Links internos também precisam preservar contexto

- Contexto: conversões Fitness, estoque, parceiros e Central, sem retirar funções.
- Evidência: detalhe de estoque enviava vendas/compras para rotas legadas; parceiros usavam fila geral mesmo com ID conhecido; links, buscas, paginação e retornos de promoções Central perdiam Company.
- Mudança: destinos compartilhados de navegação/formulários, invalidação das duas URLs e entradas Company que compõem funções existentes. Indicador de contexto só escolhe retorno e nunca autoriza a ação. Auditar corpos repetidos sem fundir automaticamente funções ou cadastros.
- Status: 21 regressões locais passaram com RPC simulada; tipos/lint direcionado são conferidos antes da publicação. Ações reais, aliases restantes e mobile ainda não homologados. Referências: `company-deep-migration.test.cjs`, `QUALIDADE-E-MOBILE-2026-10-17.md`.

### OBS-MIG-20261016 — Migrar retorno de ação, não somente o link de entrada

- Contexto: continuar Suplementos/Fitness na Company sem retirar funções.
- Evidência: consignações não tinham páginas Company e criação/acerto/cancelamento voltavam ao Fitness; movimentações perdiam contexto nos filtros/paginação. Cesta Nexus dependia de painel/título ausente no DOM atual.
- Mudança: composição das páginas existentes em rotas Company, contexto explícito nos componentes compartilhados, filtros/retornos nativos e catálogo de ferramentas pela Gestão. Cesta renderizada diretamente, preservando decisões e mesmas RPCs. Nenhuma regra ou dado de produção alterado.
- Status: testes automatizados de acerto/venda, devolução, cancelamento, falha e contexto legado; TypeScript e lint direcionado aprovados. Homologação autenticada/visual e ações reais continuam pendentes. Publicação deve ser confirmada no relato da entrega.
- Referências: `MIGRACAO-COMPANY-2026-10-16.md`, `tests/company-tools-migration.test.cjs`, `/company/mapa`.

### Entradas e 13º no Planejamento — 16/10/2026

- Contexto: responsável sentiu falta de visualizar/confirmar entradas e citou 13º Igor/Giulia sem valor ou data conhecidos.
- Evidência: Planejamento escondia entradas em disclosure sem formulário. RPC existente de recebimento mensal faz upsert por fonte/mês e não altera saldo de contas. Consulta somente leitura não encontrou fonte com nome 13/décimo.
- Mudança: seção visível, formulário de fonte mensal com valor acumulado e data reais; links para recebíveis/vendas na origem; nenhuma confirmação executada pelo agente. Lembrete do 13º é apenas pendência de planejamento, não lançamento financeiro e não entra nos totais.
- Status: implementação nesta rodada; testes de usuário continuam pendentes. Não inferir valores/datas, nem presumir que confirmação atualiza o saldo automaticamente.

### OBS-001 — Não anunciar publicação sem evidência

- Contexto: em conversas anteriores, funcionalidades foram descritas como publicadas sem que o comportamento em produção estivesse confirmado.
- Evidência: relatos posteriores de rota com erro ou função ausente.
- Sugestão: separar sempre “implementado no código”, “build aprovado”, “banco aplicado” e “produção testada”.
- Status: adotado em `AGENTS.md`.

### OBS-002 — Company não deve escapar para módulos antigos

- Contexto: rotas e atalhos criados dentro da Company levaram para Suplementos/Fitness antigos.
- Evidência: relatos recorrentes durante a migração.
- Sugestão: revisar destino de links e registrar exceções deliberadas.
- Status: adotado como regra; cobertura automatizada ainda pendente.

### OBS-003 — Correção visual não pode remover função

- Contexto: simplificações de UX anteriores ocultaram ou removeram capacidades necessárias.
- Evidência: necessidade de recuperar estoque, conclusão de vendas e ações existentes.
- Sugestão: antes de redesenhar, inventariar ações e testar os fluxos essenciais em desktop e mobile.
- Status: adotado como processo; testes de regressão ainda pendentes.

## Revisão

### OBS-004 — Pós-venda permanece após cancelamento

- Data: 03/10/2026.
- Contexto: calendário do ERP e fila de contatos de pós-venda.
- Evidência: consulta em produção confirmou 3 tarefas automáticas de reposição ainda planejadas para vendas canceladas, incluindo Edirlei. O pós-venda agrupado já estava cancelado; a reposição era a origem do contato ativo.
- Sugestão: conferir vínculo do compromisso com a venda e tratamento do cancelamento na geração, atualização e sincronização da agenda. Retirar da fila o contato originado exclusivamente pela venda cancelada, preservando histórico e contatos de outras vendas válidas do cliente.
- Status: corrigido no banco em 03/10/2026; consulta pós-correção confirmou zero tarefas automáticas ativas ligadas a vendas canceladas e tarefa de Edirlei cancelada. Histórico e vínculos preservados. Validação visual pendente.
- Teste esperado: criar venda com pós-venda, cancelar e verificar que o contato deixa a agenda/fila ativa; uma segunda venda válida do cliente deve manter seu contato.


### OBS-005 — Melhorias de DOM e carregamento da Nova venda

- Data: 03/10/2026.
- Contexto: Nova venda Suplementos na Company e hidratação de conteúdo transmitido pelo servidor.
- Evidência: React 418 reproduzido em produção nos commits ab4b121 e 859ca73. CommercialSaleRefinementUX alterava o DOM sem conferir se NewSaleForm já estava hidratado. O marcador de prontidão publicado impede essa corrida específica, mas o erro persistiu: a causa completa continua aberta.
- Sugestão: preservar melhorias e campos; investigar divergência restante sem esconder erros ou remover renderização do servidor em toda a página.
- Status: proteção parcial publicada; Doctor não encerrado. Tipos aprovados e lint direcionado com zero erros (aviso preexistente de dependência no NewSaleForm).

### OBS-006 — Marcações locais de migração entre operações

- Data: 03/10/2026.
- Contexto: mapa com duas instâncias do roteiro (Suplementos e Fitness).
- Evidência: saveLocal escrevia o mapa da instância inteira, possivelmente desatualizado, e uma sincronização bem-sucedida removia todo o cache compartilhado. Isso podia perder marcações de outras linhas/da outra operação.
- Sugestão: mesclar pelo check_key com o cache atual, remover apenas a linha sincronizada e notificar as duas instâncias. Falhas de conexão e de armazenamento não podem deixar o botão travado nem fingir persistência.
- Status: corrigido no código; verificação de tipos e lint direcionado aprovados. Não alterar marcações reais para testar em produção.

### OBS-007 — Mapa sem permissão de leitura/gravação

- Data: 06/10/2026.
- Evidência: log de produção de 16:07 UTC registrou permission denied for table migration_audit_checks. Consulta confirmou ausência de SELECT/INSERT/UPDATE para authenticated, apesar da migration histórica de grant; RLS estava ativa.
- Correção: restaurar somente leitura e upsert para authenticated, preservando políticas e dados. Remover TRUNCATE/REFERENCES/TRIGGER desnecessários de anon/authenticated; não conceder DELETE nem acesso anônimo.
- Status: migration 20261006162033 aplicada online. Teste com papel authenticated e administrador ativo leu, inseriu e atualizou dentro de transação com ROLLBACK; zero registros fictícios restantes. Advisors sem ERROR; alertas anteriores permanecem. CLI não disponível: arquivo usa a versão exata registrada pelo Supabase, não timestamp inventado.
- Próximo: confirmar janela do mapa e persistência visual quando houver navegação disponível. React 418 continua independente e aberto.

### OBS-008 — Previsão não é saldo confirmado

- Data: 16/10/2026.
- Contexto: planejamento do Bank aprovado pelo responsável.
- Evidência: /bank/mobile transportava a diferença projetada atual como abertura do próximo mês. Reconciliação audit_events 3373 registra reserva externa de novembro e salários já adiantados.
- Mudança: novo planejamento separa saldo, reserva por mês, recebimentos informativos e previsões a conferir. Reserva entra uma vez, sem transporte automático; simulação não grava dados. Usa compromissos existentes, sem reimportação.
- Status: implementação e nove testes aprovados na branch codex/bank-month-planner; PR #26 em rascunho, preview READY, produção não alterada. Validação visual e ações mutantes reais não homologadas. Ver BANK-PLANEJAMENTO-2026-10-16.md.

### OBS-009 — Normalizar a marca, não só a caixa

- Contexto: logos de bancos enviadas com margens internas diferentes; Nubank tinha marca pequena dentro de uma imagem grande.
- Evidência: mesma caixa de 64px deixou Nubank desproporcional às outras logos na prévia.
- Mudança: enquadramento óptico por marca, com escala uniforme e recorte de margem via CSS, preservando arquivos originais e proporções. Regra de antecipar esse acabamento registrada em AGENTS.md; não esperar apontamentos repetidos.
- Status: ajuste de apresentação, sem alteração financeira. Conferir conjunto antes de publicar.

Ao finalizar uma etapa, revisar observações confirmadas e promover as úteis para:

- regra em `AGENTS.md`;
- decisão em `CONTEXT.md`;
- regra verificada em `BUSINESS_RULES.md`;
- teste automatizado ou roteiro de regressão.

### OBS-010 — Compra cancelada não pode alimentar o pós-venda

- Data: 16/10/2026.
- Contexto: auditoria global após Adriana receber contexto com dois wheys, um deles de venda cancelada.
- Evidência: 16 vendas canceladas de Suplementos, em 12 clientes; 11 agrupamentos de pós-venda de 10 clientes continham vendas canceladas. A view agregadora e a seleção de compras atuais do Nexus não filtravam `general_status`. As fichas de cliente usavam o histórico geral sem esse filtro. A lista classificava `cancelled` pela data, fazendo-o aparecer como atraso.
- Correção: excluir canceladas dos totais/contexto de pós-venda e das compras efetivas das fichas (incluindo caminho paginado e legado); manter registros e vínculos para auditoria; tratar cancelados como estado terminal na fila. Rascunhos pendentes são arquivados no log e invalidados no próximo cancelamento. Compras válidas do mesmo agrupamento permanecem.
- Banco: migration `20261016124148` aplicada em produção. Comparação global de contagem/valor/contexto aprovada. Adriana: 1 compra / R$ 190; Gabriel: 2 / R$ 164,80. Hashes de vendas, itens, Fitness e movimentos de estoque iguais antes/depois, 130 vínculos preservados. Pós-venda Fitness e curva de giro já excluíam canceladas.
- Testes: três testes de classificação; regressão SQL em todos os agrupamentos; teste de cancelamento parcial/total com invalidação e auditoria do rascunho, integralmente desfeito com ROLLBACK. Advisors sem ERROR; alertas existentes fora do escopo permanecem.
- Status: banco e código publicados pelo PR #28, produção READY no commit `8b0e946`. Fichas de Adriana e Gabriel conferidas visualmente no domínio normal. Build remoto aprovado e 14 testes Node aprovados. Build local Turbopack limitado pelo junction de dependências.
- Extensão da auditoria: a ficha de parceiros também lia canceladas e mostrava somente pagamento/entrega; filtrar as compras efetivas nessa consulta, mantendo as operações canceladas disponíveis nos orçamentos/vendas para auditoria. Fitness já apresenta a situação correta e exclui canceladas dos totais e do pós-venda.
- Referências: `supabase/tests/cancelled_purchase_history.sql`, `supabase/tests/cancelled_post_sale_draft_rollback.sql`, `tests/post-sale-state.test.cjs`.

### OBS-011 — Contatos, conversão e falta de estoque devem atravessar as filas

- Data: 16/10/2026.
- Contexto: Gestão mostrava 0/12 apesar dos contatos registrados; Vender sugeria recompra de quem acabara de ser chamado. Conversões iniciadas pelo atalho da Company não preservavam o lead original. Venda sem estoque tinha reserva pendente, mas nenhum compromisso urgente de compra.
- Evidência: a meta consultava apenas commercial_contact_attempts. Gestão/Company registravam também feedbacks e customer_interactions. O atalho enviava `lead` na URL, porém NewSalePage ignorava o parâmetro. Elaine e Guilherme tinham um lead original pendente e outro gerado pelo orçamento confirmado.
- Correção: views com security_invoker consolidam contatos por cliente e dia de São Paulo, preservando datas explícitas de retorno; ambas as RPCs da fila usam a mesma meta e pausa. Vender filtra todas as recompras/retornos pela pausa consolidada e atualiza ao retornar à aba. Conversão usa a ação existente que prepara orçamento vinculado; URLs anteriores preservam o lead ao salvar. Confirmação encerra os retornos específicos do lead. Reparação de órfãos limitada a correspondência única no mesmo dia, com produtos/quantidades cobertos pela venda e auditoria.
- Estoque: triggers em reservas e situação da venda mantêm um card urgente por venda com a falta efetiva. Reposição/reserva cobre a pendência; cancelamento a cancela. Não alteram estoque, pagamento ou criam compra de fornecedor. Backfill criou cards das duas vendas atuais sem whey.
- Banco: migrations 20261016183046 e 20261016183328 aplicadas. Contagem consolidada de 55 pessoas em 16/10; Willians pausado até 22/10; somente os dois órfãos identificados reconciliados. CLI indisponível; arquivos usam as versões exatas registradas pelo Supabase.
- Testes: integração transacional com ROLLBACK verifica deduplicação de fontes, retorno explícito, conversão via RPC, encerramento do lead, criação/idempotência da urgência, cobertura e cancelamento. Advisors comparados antes/depois: nenhum ERROR final e mesmos alertas preexistentes; funções internas novas sem EXECUTE para anon/authenticated.
- Status: banco validado; publicação e verificação visual da interface pendentes nesta etapa.

### OBS-011 — Vitrine de descoberta e acesso direto às ações

- Data: 16/10/2026.
- Contexto: responsável autorizou uma segunda Vitrine, preservando a original, e melhorias diretas em Company, Bank e Atletas.
- Mudança: `/catalogo/descobrir` usa as mesmas fontes públicas de estoque, preços, promoções, imagens, tamanhos/cores e encomendas. Coleções por operação, oito disponíveis por vez, favoritos apenas durante a visita e detalhes em diálogo nativo. Indisponíveis ficam recolhidos ao final. O atendimento/compra continua nas páginas existentes; não há nova reserva ou baixa de estoque.
- Operação: filtro textual de ações na Company e nos portais Bank/Atletas; Bank inclui planejamento mensal. Links nativos nesses dois portais eliminam a espera artificial e permitem abrir em outra aba. As demais entradas preservam seu comportamento. Movimento reduzido é respeitado nos cartões da Company.
- Evidência: navegação local com produtos reais conferiu filtros, favorito, detalhes, tamanhos/cores de Fitness, expansão progressiva e layout de 390px sem overflow. Corrigido conflito de tamanho de botões imposto pelo CSS público antigo. Testes de ações usaram montagem local temporária removida antes de publicar, sem contornar autenticação ou alterar registros.
- Verificações gerais: lint completo revelou 92 erros/28 avisos em arquivos anteriores; lint dos arquivos desta alteração é conferido separadamente. Auditoria das dependências existentes apontou Next.js crítico, sharp e source-map-js altos; nenhuma dependência foi adicionada ou atualizada nesta mudança. Atualização de segurança merece trabalho próprio.
- Status: publicada pelo PR #32, commit `628bfb0`; produção READY. Responsável rejeitou a direção visual da Vitrine; revisão registrada abaixo.

### OBS-012 — Revisão da direção visual da Vitrine experimental

- Data: 16/10/2026. Escopo: somente `/catalogo/descobrir`; Vitrine original preservada.
- Mudança: campanha com cenas selecionáveis, fotos reais sobrepostas, tipografia local Barlow Condensed/Manrope (licenças OFL), coleções assimétricas e galeria com destaque maior. Referências e critérios em `VITRINE-DIRECAO-VISUAL.md`.
- Verificação: lint dos dois componentes e TypeScript aprovados; inspeção visual desktop e 390px, largura de documento sem overflow; diálogo Fitness confirmou preço e tamanho/cor reais. Movimento reduzido preservado. Build remoto exigido antes da publicação.
- Sem alteração de banco, estoque, preços, autenticação ou regras de compra. Avaliação visual do responsável pendente.

### OBS-013 — Recortes e movimento na Vitrine aprovada

- Data: 16/10/2026. Responsável aprovou a direção visual do PR #34 (produção READY, commit `1a18ab4`) e pediu imagens nítidas/transparentes e movimento ligado à rolagem.
- Duas imagens editoriais com alpha, 1254px, derivadas das fotos públicas originais: Creatina Candinho e Abduzido. Associação por produto + foto fonte impede recorte antigo após troca de foto. Os detalhes mantêm os originais. Foto Fitness preservada após recusa do recorte pela ferramenta; não apresentar integração de fundo como alpha real.
- Rolagem move camadas da abertura, coleções e faixa tipográfica; fotos da galeria revelam-se conforme entram na tela. Ponteiro inclina o destaque em desktop. Sem nova biblioteca, autoplay ou bloqueio da rolagem; movimento reduzido preserva conteúdo estático.
- Conferência local em desktop e 390px: fontes maiores, recortes carregados pelo otimizador, alpha confirmado nos arquivos; progresso CSS alterado após scroll; galeria expandida de 8 para 16 e acompanhada pelo observer, sem overflow horizontal. Lint dos arquivos alterados aprovado. Build remoto é condição de publicação.
- Escopo somente visual; nenhuma alteração de dados, preços, estoque, pedidos ou autenticação. Referências e prompts em `VITRINE-DIRECAO-VISUAL.md` e `VITRINE-RECORTES-PROMPTS.md`.
- Na galeria expandida, requisições do otimizador remoto excederam timeout local. Componente de imagem agora tenta o original direto e a miniatura existente antes de mostrar indisponibilidade; não deixa ícone de imagem quebrada. TypeScript e lint dos cinco módulos/configuração aprovados após esse ajuste.

### OBS-014 — Uniformização dos recortes Fitness

- Data: 17/10/2026. Responsável pediu transparência também no Fitness e autorizou processamento técnico nas fotos recusadas pela ferramenta de imagem.
- 21 fotos principais da seleção disponível recebem recortes com alpha: 15 por imagegen integrada, 6 por processamento técnico preservando a foto. Associação por produto/fonte impede recortes antigos após troca de foto. Campanha, coleções e galeria usam o mesmo mapeamento; originais e variantes preservados nos detalhes.
- Fundos das camadas Fitness removidos; recortes sem mistura de cores com o fundo para preservar tecidos brancos. Coleção ajustada para acomodar o recorte sem cobrir seu título.
- Evidência: 21 WebPs verificados com alpha 0–255; aproximadamente 4,2 MB. Inspeção dos recortes; abertura desktop e 390px sem overflow; lint dos módulos alterados e TypeScript aprovados. Build remoto é condição de publicação. Manifesto e prompts em `FITNESS-RECORTES.md`.

### OBS-015 — Enquadramento, cursor e sequência da Vitrine

- Data: 17/10/2026. Responsável relatou cursor desaparecendo ao clicar, impressão de zoom, excesso de seções e rótulos inconsistentes.
- Causa do cursor: `CompanyCursor` escondia o ponteiro nativo no body, mas seu elemento decorativo fica abaixo do top layer dos dialogs. A rota `/catalogo/descobrir` agora usa cursor nativo durante toda a visita; demais áreas preservadas. Effect acompanha mudanças de pathname para limpar corretamente a classe global.
- Direção visual preservada (prata/carvão, ocre/rosa, Barlow/Manrope e recortes). Abertura compacta, menos camadas e movimento discreto; controles redundantes removidos. Sequência reduzida a destaque e produtos, sem coleções repetidas ou faixas de frases entre elas. Seleção padronizada Suplementos/Fitness e sincronizada com a galeria. Padrão inicial Suplementos; favoritos reúnem ambas as operações.
- Galeria de cartões uniformes em 4/3/2 colunas, sem primeiro produto gigante. Imagens com contain e medidas limitadas; campos e detalhes ajustados para celular. Nenhum zoom de navegador ou bloqueio de rolagem introduzido.
- Evidência local: abertura inteira em 1280×720 (limite inferior ~587px) e 390×844 (~654px), sem overflow. Dialog da Creatina com cursor computado `pointer`, nenhum cursor decorativo, preço e compra visíveis. Fitness sincronizou os dois seletores; detalhes com tamanho/cor, favorito e fechamento por Escape conferidos. Favorito Fitness encontrado após navegar em Suplementos. Lint dos módulos e TypeScript aprovados após regenerar tipos locais antigos de rotas Next; build remoto exigido antes de publicar.


### OBS-017 — Casa inteira e cobertura explícita do escritório

- Data: 17/10/2026. Responsável rejeitou painel lateral e pediu visão periférica das pendências.
- Causa: cena selecionava uma sala no celular; escritório consultava somente cadastro/Doctor/reposição/oportunidades/Bank do mês.
- Mudança: todas as salas permanecem visíveis, avisos por hover/foco, toque/clique para fixar, Escape e rolagem interna. Cursor nativo nesta rota. Acrescentadas filas exatas de recebimentos/entregas/pós-venda usando as fontes de Concluir/Acompanhar e permissões existentes. Sem mutação ou alteração de schema.
- Cobertura: lacunas detalhadas em ESCRITORIO-COBERTURA-2026-10-17.md e na própria página; desconhecido não vira zero, categorias não somam pessoas, futuros não são chamados de atrasados.
- Evidência inicial: cinco testes Node aprovados, incluindo interação, estados vazios/indisponíveis, exclusão de canceladas e isolamento por operação. Verificações de tipos/lint/build e visual seguem pendentes até registro complementar. Nenhuma resolução real executada.

### Verificação complementar da casa — 17/10/2026

- 23 testes da Company aprovados, incluindo cinco do escritório. TypeScript e lint dos módulos TSX alterados aprovados.
- Navegador local isolado, com dados de teste: 1440×900 e 390×900; quatro salas visíveis, casa no enquadramento, sem overflow horizontal, avisos fixam/fecham por toque/clique, rolagem interna (600px) e Escape aprovados, sem erros JavaScript. Artefatos de teste ficam fora do projeto.
- Build local compilou e passou pelos tipos, mas interrompeu o prerender de `/catalogo` por ausência das variáveis Supabase neste checkout. Build remoto Vercel do primeiro commit aprovado; build do commit final é condição para publicação.
- Lint global: 141 erros e 29 avisos em áreas amplas do repositório; não usar como sinal de aprovação global. Auditoria do lock npm importado: 1 vulnerabilidade crítica, 2 altas, 4 moderadas e 1 baixa nas dependências existentes Next/sharp. Nenhum pacote ou lock foi alterado nesta entrega.
- Homologação do responsável e ações mutantes reais permanecem pendentes. Consulte PR #39 para resultado do build/publicação final.
### OBS-016 — Fluidez e hierarquia da Vitrine

- Data: 17/10/2026. Responsável considerou a revisão anterior seca, desproporcional e repetitiva. Escopo permanece `/catalogo/descobrir`.
- Plano visual: preservar prata/carvão, Barlow/Manrope e recortes; concentrar a categoria em um seletor Suplementos/Fitness no cabeçalho fixo. Uma foto de destaque, texto e preço alinhados substituem foto secundária repetida e etiqueta flutuante. Galeria mantém cartões uniformes e tons discretos alternados.
- Referências públicas revisitadas: Skiper UI e Cult UI para transições, revelação de fotos e resposta dos controles. A página de demonstração Image Reveal do Skiper não carregou suas fotos; não houve cópia de código ou importação de componentes pagos. MotionSites também exibiu prévias sem carregar. Implementação própria, sem dependências novas.
- Movimento: entrada escalonada das linhas do título e da foto ao trocar categoria; profundidade do destaque ligada à rolagem/ponteiro; revelação das fotos por IntersectionObserver e Web Animations, uma vez por montagem. Favoritos e detalhes respondem à ação. Rolagem nativa, cursor nativo e preferência de movimento reduzido preservados; conteúdo permanece visível sem animações.
- Crítica e verificação local: abertura equilibrada no desktop e 390×844; uma seleção de categoria, sem overflow horizontal. Fitness exibiu 21 opções e recortes; favoritos, tamanho/cor, abertura e Escape dos detalhes conferidos. Cursor computado pointer, classe de cursor customizado ausente; progresso das fotos varia com rolagem. Build remoto é condição de publicação. Dados, preços, estoque e compra preservados.

### OBS-017 — Descoberta pela rolagem e cursor padrão

- Data: 17/10/2026. Responsável pediu experiência menos parecida com catálogo, rotação do destaque a cada 2 segundos entre itens com estoque e restauração da bolinha como padrão global do ERP. A exceção de cursor nativo em `/catalogo/descobrir` foi revogada por esse pedido.
- Plano: manter prata #e9ecef, carvão #181b20, ocre #d7ad61, rosa #dd9bbd e texto #626971; Barlow Condensed nos títulos e Manrope nas ações. Uma área fixa recebe produtos em sequência horizontal durante a rolagem vertical nativa, com foto à esquerda e informação à direita; celular empilha foto e informação. A grade permanece nas buscas/filtros/favoritos. Não há seção promocional repetindo os mesmos itens.
- Revisão do plano: substituir apenas a grade por cartões maiores ainda pareceria catálogo. O palco agora muda de produto ao rolar e encerra cada transição com nome/preço legíveis; profundidade da foto acompanha o gesto. Setas oferecem alternativa à rolagem. Sem JS ou com movimento reduzido, os produtos ficam em fluxo normal.
- Abertura alterna a cada 2000 ms somente produtos disponíveis com foto da operação atual; próxima foto é pré-carregada. Pausa manual, setas, pausa ao examinar/focar a foto ou abrir detalhes, e suspensão fora da tela/aba. Movimento reduzido inicia pausado. Sem anúncios repetidos ao leitor de tela.
- Cursor global usa superfície decorativa `popover=manual`, sem interação ou foco, elevada após abrir/fechar dialog nativo. Isso mantém a bolinha acima dos detalhes sem desativá-la na Vitrine. Ponteiro só é escondido após movimento real do mouse; dispositivos de toque e movimento reduzido preservam o comportamento nativo. Base técnica: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/showPopover.
- Evidência local: desktop e 390×844 sem overflow; sequência e navegação conferidas, busca retornou duas blusas, favorito correto apareceu em Salvos, detalhes com tamanho/cor e bolinha visível acima do diálogo. Protegida troca de produto contra rolagem automática de foco para não mudar o alvo de um clique. Sem dados, regras de estoque, preços, pedidos ou novas dependências. Build remoto exigido antes da publicação.
- Checagem final após recarregar: proteção de foco limitada aos controles dentro da sequência; rolagem livre fora deles continua atualizando o palco. Conferidos avanço para 7/8 pela rolagem e favorito do Chaveiro Mini Scoop sem trocar o alvo do clique. Em 375×667, abertura termina em ~614px, sem overflow.

### OBS-018 — Faixa contínua, cartões compactos e recortes restantes

- Data: 17/10/2026. Responsável pediu todos os produtos alternados transparentes, bolinha também no navegador, movimento contínuo com pausa ao passar o mouse, 4–6 produtos por linha e uso do ritmo do ArtCraft sem copiar a estética. Recorte técnico de todas as fotos restantes foi explicitamente autorizado.
- Plano/revisão: manter prata/carvão, ocre/rosa e Barlow/Manrope; substituir palco gigante por uma prateleira contínua à direita do título. Fotos deslizam sem saltos; hover/foco de teclado/detalhes pausam. Fora da tela/aba, a animação fica suspensa. A vitrine principal volta a cartões em 4 colunas, 6 em telas amplas, 3 em tablets e 2 no celular, com agrupamento opcional por categoria. Aumentar somente as animações do palco anterior manteria o problema de escala; ele foi removido.
- Referência: https://getartcraft.com/ inspecionada no navegador (camadas em movimento e resposta ao scroll). Implementação própria com Web Animations/IntersectionObserver, sem importação da estética, de vídeos ou bibliotecas.
- Animações passam a ter controle visível e persistente. O padrão respeita o aparelho, mas o visitante pode ativar explicitamente mesmo com preferência por movimento reduzido. Testados preferência do sistema, ativação/pausa explícita e armazenamento bloqueado. Não afirmar que a preferência do sistema era a causa do relato sem medição no navegador do responsável.
- Cursor: a implementação anterior só inicializava com ponteiro principal fine e sem movimento reduzido. Agora entrada real de mouse ativa a bolinha em dispositivos híbridos; movimento reduzido mantém a bolinha com posicionamento direto. A superfície decorativa na top layer continua sem capturar cliques.
- 31 recortes novos, oito contornos refinados, mestres lossless e versões de exibição; detalhes em `SUPLEMENTOS-RECORTES.md`. Mapeamento protege contra foto fonte alterada. Seis testes de preferências/arquivos/vínculos aprovados. Sem regras de negócio, estoque, preços ou dependências novas da aplicação.
- Verificação inicial local: quatro colunas em 1280px, sem overflow; fotos transparentes e deslocamento contínuo observados. Verificação final de hover, tamanhos e produção pendente até a publicação; build remoto obrigatório.


### OBS-PHONE-20261017 — Resolver telefone na fila do escritório

- Contexto: responsável quer preencher telefones ausentes sem abrir ficha individual.
- Causa: os dois avisos apontavam para o CRM geral. O CRM deduplica/combina telefone de cadastros vinculados e diferencia operação por compra, enquanto o escritório conta o campo ausente de cada cadastro/operação. O atalho não oferecia edição direta.
- Mudança: `/company/clientes/telefones?operacao=Suplementos|Fitness` consulta os mesmos campos/filtros do aviso, sem deduplicação ou exigência de compra. Suplementos inclui somente ativos; Fitness preserva o escopo do aviso existente. Até 50 registros por página com contagem exata. Links antigos com `pendencia=telefone` redirecionam à fila.
- Gravação: PATCH específico valida operação, permissão de leitura/escrita e formato; usa cliente autenticado/RLS e altera apenas phone do cadastro escolhido. Condição atômica aceita só telefone ainda nulo/vazio, impedindo sobrescrita concorrente. Triggers existentes (incluindo sincronização core→Fitness) continuam valendo; nenhum novo vínculo, schema ou regra foi criado. Não preencher dados em nome do responsável.
- UX: campo e Salvar em cada linha; sucesso remove pendência e atualiza dados; falha mantém campo e mensagem. Rascunhos de outras linhas permanecem.
- Evidência: cinco testes novos de autorização, formato, escopo, atualização mínima e conflito/falha, mais cinco regressões do escritório aprovados. Navegador isolado desktop/390px confere salvar simulado, remoção, contagem e preservação de rascunho/erro sem overflow. Verificações finais e publicação são registradas no PR; nenhuma gravação real executada para teste.


### OBS-019 — Exploração por gesto, tamanhos e recuperação dos serviços da Vitrine

- Data: 18/10/2026. Pedido: manter a estética, entrada de produtos durante o scroll, arrastar além do autoplay, filtros e selos de tamanhos, navegação Produtos/Salvos determinística, coleções sempre agrupadas com Força e Creatina Candinho primeiro, retirar controle de movimento, recuperar cadastro/depoimentos/Nexus/procura. Corrigir corte da Company; revisão geral de zoom como última etapa do mapa.
- Plano/revisão: prata #e9ecef, carvão #181b20, ocre #d7ad61, rosa #dd9bbd, cinza #626971; Barlow/Manrope preservados. Uma faixa conduzida pelo gesto e entradas coordenadas por linha substituem animações quase imperceptíveis. Coleções têm hierarquia fixa, selo de tamanho com flutuação discreta e filtro por estoque positivo. Nenhuma nova biblioteca.
- Serviços reutilizam componentes, consulta de depoimentos ativos, resumo público da campanha, RPC de cupom e endpoint de procura já existentes. Não inventar depoimentos, cupons ou disponibilidade; testes não devem cadastrar pessoas nem enviar procura real. Apresentação textual do Candin identifica o Nexus como assistente oficial; não foi criada fala gravada nem personagem novo.
- A preferência de movimento do aparelho continua respeitada; retirados botão e dependência do antigo estado local de pausa. Arrastar/setas funcionam mesmo sem animação. Produtos e Salvos selecionam explicitamente sua visão, sem alternância inesperada.
- Company: removida a busca adicional; ações compartilham o espaço disponível em desktop e alturas muito baixas mantêm acesso por rolagem. Sem reforma global de cabeçalhos: essa pauta foi acrescentada como bloco final pendente em `/company/mapa`.
- Validações e publicação pendentes de registro na entrega/PR. Sem alterações de banco, preços, estoque, autenticação ou novas dependências.

- Evidência técnica desta rodada: 35 testes Node aprovados, incluindo tamanhos com saldo positivo, ordem Força/Creatina, ciclo do arraste, preferência de movimento e regressões Company; lint de dez módulos alterados aprovado. Build de prévia `0cfbba7` READY (incluindo TypeScript). Mudanças concorrentes do PR #44 preservadas por merge; o novo hub de funções da Company foi recolhido para não consumir a abertura.
- Limite de conferência: controle do navegador indisponível por timeout em abas antiga e nova, inclusive após nova vinculação e ajuste de viewport. Nenhum teste visual/interativo desta rodada deve ser considerado realizado. Não foram gerados cupons, enviados contatos ou procuras reais. Publicação final depende do encerramento desta conferência.

### Conferência complementar OBS-019 — 18/10/2026

- Navegador voltou a responder. Prévia `ac7d74a`: desktop 1440×900 e celular 390×844 sem overflow horizontal; primeira categoria Força e primeiro item Creatina Candinho confirmados.
- Arraste manual de 250px alterou a faixa em exatamente 250px, com hover pausado e sem abrir diálogo por engano. Movimento automático observado antes do hover. Filtro M retornou somente roupas com M em estoque; clicar duas vezes em Salvos manteve favoritos e Produtos voltou à coleção. Selos de tamanho e blocos assistido/cupom/procura/depoimentos inspecionados no celular. Não foi gerado novo cupom nem enviada procura para teste; o código visível já havia sido emitido pelo responsável.
- Company exige login na prévia. Componentes reais foram renderizados isoladamente com dados simulados e todas as folhas CSS atuais: 1280×720 mostra as seis ações com textos dentro dos cartões; 390×844 não apresenta overflow horizontal; expansão das áreas aumenta o conteúdo e o contêiner mantém rolagem (992px de conteúdo em 720px de área). Troca de operação/autenticação e registros reais não foram exercitados nesse teste.
- Cupom vigente é apresentado no atendimento; a gestão existente em `/company/vitrine` permite marcar usado/cancelar. Salvos guarda apenas produtos, sem checkout ou aplicação automática do cupom. Nenhum novo fluxo de resgate foi criado nesta rodada.
- Limitação de navegador registrada acima foi resolvida para a conferência pública e isolada. Publicação/commit final devem ser comprovados pelo PR e produção READY.


### OBS-020 — Enviar Salvos com cupom pelo WhatsApp

- Data: 18/10/2026. Responsável autorizou abrir WhatsApp com produtos e cupom juntos; confirmou atendimento público 5532998318385.
- Em Salvos, a seleção usa todos os favoritos das duas operações, independentemente de filtros. Mensagem inclui nomes, links oficiais, tamanhos disponíveis Fitness sem assumir uma variante escolhida, indicação de indisponibilidade e cupom opcional. Não calcula desconto, cria pedido, reserva estoque nem marca cupom usado.
- Cupom emitido pela função existente é compartilhado com Salvos. Código sem dados pessoais permanece somente no sessionStorage da aba, com memória temporária se armazenamento estiver bloqueado. Campo aceita colar/corrigir/apagar código recebido antes. Nenhum código pessoal é fixado para todos os visitantes.
- Botão abre wa.me no atendimento confirmado, com mensagem codificada para revisão/envio pelo próprio visitante. Nenhuma mensagem real deve ser enviada para teste. Estética prateada/carvão/ocre e tipografia preservadas; painel de seleção com duas colunas no computador e uma no celular.
- Validações e publicação serão registradas no PR/entrega; sem mudanças de schema ou regras da campanha.
- Verificação complementar: navegador desktop e 390×844 conferiu seleção mista, filtro que oculta um favorito sem removê-lo da mensagem, destino exato do WhatsApp, links canônicos, cupom opcional e bloqueio de código malformado. Inspeção do href decodificado, sem clicar em enviar no WhatsApp. Cupom BEMVINDO-EXEMPLO digitado somente na interface; nenhuma emissão real. Testes do cadastro usam RPC simulada para sucesso/falha, compartilhando somente o código retornado. Lint dos seis módulos aprovado; build/TypeScript da prévia 72122fb READY.
