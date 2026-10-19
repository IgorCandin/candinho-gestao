# Doctor — leitura autenticada e contexto seguro, 19/10/2026

## Escopo

Continuidade do PR #59 em `0d4fa0c`. Skills systematic-debugging, webapp-testing, computer-use para o navegador conectado, React best practices e Supabase para consultas somente de leitura. Nenhuma alteração em autenticação, RLS, service worker, rotas comerciais, regras, migrations ou dependências.

Testes reais usaram a sessão já autenticada no navegador conectado. Não foram extraídos cookies, storage de sessão ou credenciais. Aba original da busca Central preservada; testes em aba separada, depois fechada. Override de viewport restaurado. Não foi enviado formulário, confirmado orçamento, cadastrado cliente, salvo produto nem pago/adiado compromisso. Telemetria automática normal do ERP permaneceu ativa; por isso não se afirma ausência de toda escrita automática de diagnóstico.

## Ensaios reais

| Fluxo | Evidência observada | Limite |
| --- | --- | --- |
| Nova venda de Suplementos, acesso direto | Formulário real presente, marcador de hidratação true, logs error/warn vazios | Não salva venda |
| Atualizar a nova venda | Hidratação true, sem erro capturado | Uma leitura imediata móvel retornou null; na leitura seguinte estava true, sem 418 — não interpretar espera por effect como erro |
| Concluir → Nova venda → Suplementos | Seletor de operação real e formulário abriram, marcador true, logs vazios | O guard global NavigationStability faz navegação documental; não chamar isso de teste SPA/RSC puro |
| Bank direto e reload | Dashboard real presente, logs error/warn vazios | Sem abrir pagamento/ajuste nem salvar |
| Bank em largura móvel | Dashboard presente; largura CSS medida 375 px após override solicitado 390×844; sem overflow naquele momento nem logs de erro | Navegador conectado não é Safari/iPhone físico |
| Nova venda móvel e reload | Formulário hidratado; seletor de produto abriu por botão type=button; sem erros capturados | Não selecionado cliente/produto nem enviado formulário |
| Retorno móvel para Concluir | URL e título mudaram para Concluir | networkidle excedeu prazo; leitura DOM seguinte não despachou pelo CDP. Logs capturados continuaram vazios. Não confirmado conteúdo nem causa; não atribuir ao React ou ao ERP sem reprodução |
| Recuperação da automação | Aba de teste fechada; nova aba falhou ao anexar webview. Inventário confirmou somente a aba original | Interrompida repetição após limites do navegador; viewport restaurado |

Logs aqui significam mensagens error/warn capturadas pela ferramenta, não prova de ausência de toda exceção possível. Safari, extensões, comportamento offline, navegação interrompida e gravações de negócio continuam fora da homologação.

## Logs e recursos

- SELECT de `ux_health_signals`: assinaturas de 418 mantinham 26 e 7 ocorrências, últimas em 17/10 e 16/10; Load failed do Bank mantinha uma, última em 08/10. Não houve nova ocorrência desses sinais no instante da consulta. Não foi executado RPC de limpar/encerrar alertas.
- Runtime errors Vercel, últimos 7 dias nas rotas afetadas: somente o grupo Tipo de compromisso não suportado de 16/10, já tratado no PR #59. Não há evidência de servidor para explicar os dois erros clientes; Load failed de 08/10 está fora dessa janela.
- HEAD dos dois chunks mencionados nos registros antigos, de um chunk observado no documento atual e `/sw.js`: 200; JavaScript válido; chunks com cache immutable, worker com must-revalidate. Isso prova disponibilidade agora, não a condição no momento dos erros.
- Worker versionado é pass-through e não mantém cache próprio de HTML/chunks. Não foram limpos caches, removidas extensões ou desregistrado worker do responsável.

## Lacuna confirmada e melhoria

O probe registrava mensagem/arquivo/linha, sem conexão informada pelo navegador, tipo de navegação ou digest. Listener de error sem capture não alcançava falhas não-bubbling de script/stylesheet. Assim, um Load failed genérico podia ficar sem recurso ou contexto suficiente para investigar.

Adicionado somente contexto técnico: instante cliente, online/offline informado pelo navegador, visibilidade, navegação reload/navigate/back-forward e presença de controle por worker; digest estritamente numérico com sufixo @E quando disponível. Nenhum stack, formulário, cookie, conteúdo de storage, corpo de request ou dados de clientes acrescentado. Mensagem/filename preexistentes continuam iguais.

Captura de erro de recurso limitada a scripts e stylesheets de `/_next/static/` da mesma origem, somente caminho sem query/hash. Imagens, fontes, URLs externas e APIs não são coletadas por esse novo caminho. Não se altera fetch, promise, roteador, handlers de negócio ou retorno/default do erro. Nenhum preventDefault, suppressHydrationWarning, reload automático, retry de gravação ou resolução de alertas. Dedupe/endpoint/permissões existentes mantidos. Eventos anteriores à montagem do probe podem continuar fora da captura.

## Verificação local

- Cinco testes de ciclo/privacidade: contexto/digest, script, stylesheet/dedupe, exclusões e rejeição/disabled; cleanup remove listeners. Antes da alteração, testes mostraram campos ausentes e ausência de capture. Testes de layout/zoom do PR #59 continuam obrigatórios.
- Chromium isolado em `../doctor-review/error-events.cjs` + `error-events.py`: falhas reais 404 de script e CSS fictícios, imagem excluída, eventos sintéticos React 418 e TypeError Load failed. Quatro client_error capturados no fetch simulado, sem query privada; evento não suprimido; nenhum novo sinal depois do cleanup. Sem tráfego ou sinais de teste enviados ao ERP.
- Hidratação e fluxos de negócio não foram reescritos. Causa original de 418/Load failed permanece em investigação. Nova instrumentação prepara a próxima ocorrência, não declara os erros resolvidos.

## Próximo passo

Responsável pode seguir testando normalmente no iPhone. Se reaparecer, registrar rota, horário aproximado e se estava abrindo, atualizando ou voltando; não repetir pagamento para gerar teste. Comparar com o contexto novo antes de corrigir. Mapa mantém Doing. Gate de publicação continua: suíte Node, lint direcionado, TypeScript/build remotos no commit final e deployment READY no domínio oficial. Não disputar build local com outros trabalhos.
