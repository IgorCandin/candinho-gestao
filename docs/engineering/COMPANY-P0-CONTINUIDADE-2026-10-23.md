# P0 — publicação #65 e próximo lote

Cartão: https://trello.com/c/Fftoz6V9 . Não desativar o ERP antigo.

## Publicado, não repetir

PR #65 integrado com autorização expressa, head cef9011f9bda53e940eac31268ac7cd3277c288e. Merge/main 1546f82712a111db7b85f95451cfe3a5e0712cf3; nenhuma diferença de árvore contra o head revisado. Vercel produção READY `dpl_CGME2VeAPXMTxgT28Z12CCNvQWSZ`, alias `candinho.duckdns.org`, sem aliasError. Conferência autenticada oficial: pedido com vendas aguardando → mesma venda Company; produtos/cliente Company, PDF preservado e pagamentos carregados; busca geral → resultado Fitness → ficha e histórico Company. Console sem erros/avisos nesses trajetos. Nenhuma ação financeira, recebimento, cancelamento ou cadastro acionada. Responsável informou teste inicial positivo em Safari/iPhone. Isso não é certificação de todas as telas ou papéis.

12 testes focados repetidos antes do merge. Comparação anterior de lint dos 13 arquivos JS/TS entre base1148780 e headcef9011: zero diagnósticos introduzidos; alerta do teclado Nexus já existia. Lint global não está limpo.

## Próximo lote separado, não publicado em produção

- NewLeadForm: link Cadastrar cliente usa a rota Company quando companyMode; legado intacto. Mesmo formulário, RPCs, payload, campos, status, agenda e destino pós-salvamento. Não houve reconstrução do cadastro nem equivalência completa declarada.
- Copilot: sinais e atalhos aprendidos usam o mapeador existente somente no contexto Company. Query/hash, identidade do atalho, validação anterior de rota, consultas, contagens e POST de pergunta preservados. Destinos desconhecidos continuam disponíveis. Cadastro de lead não é substituído por venda pelo mapeador histórico. Fila e rotinas sem equivalente comprovado não são remapeadas.
- Mapa informa a publicação e distingue preparação de pendências reais; aprovações/histórico não alterados.
- Dois testes falharam antes das correções; 14 focados e suíte 164/164 passaram depois. Lint direcionado sem diagnósticos. Revisão React: sem novos efeitos, estado ou dependências; mesma condição de habilitação e ações existentes. Build e validação hidratada deste lote ainda pendentes; não confundir com #65 publicado.

## Inventário restante por risco

1. **Leads/clientes:** Company já possui `/company/leads/novo` e `/company/clientes/novo`, mas `companyDestination` ainda confunde `/leads/novo` com venda. Nexus preserva esse caminho até validação. Cadastro Company usa resolvedores existentes e gates de escrita; cadastro legado oferece revisão de relacionamentos após salvar. Conferir equivalência dos campos, retorno e identidade única antes de trocar rotas globalmente. O link de cadastro continua no mesmo separador, como antes: preservação de rascunho ao sair NÃO está implementada neste lote.
2. **Copilot dinâmico:** `/nexus/fila` já usa componente compartilhado, porém ainda exige wrapper/retornos Company e conferência das ações profundas. Não criar segunda fila. Há destinos aprendidos sem correspondência segura; não ocultar funções para aparentar migração completa. `/nexus/foco` já redireciona a `/central/meu-dia`, integrado à Company pelos redirects/rewrites existentes.
3. **Rotinas:** `nexus-routine-dock.tsx` compara a rota e envia advance/arrive automaticamente; `/api/nexus/routines` chama `nexus_advance_routine_v1`. A migration `20260806225408_nexus_guided_routines_v1.sql` compara o caminho com o passo persistido, sob proprietário autenticado e lock. Trocar apenas href pode quebrar avanço. Próximo lote precisa testar chegada, divergência, repetição, skip/cancel e permissão isoladamente, preservando passos antigos. Não abrir uma rotina real como teste de leitura: a navegação pode gravar avanço. Nenhuma migration/RPC foi alterada.

Sem criar ou alterar registros reais para validar esta migração. Permissões de outros papéis exigem fixtures/ambiente isolado: sessão administrativa não comprova RLS efetiva de todos os usuários. Google Reviews #58 continua dependente de OAuth, sem bloquear este P0.
