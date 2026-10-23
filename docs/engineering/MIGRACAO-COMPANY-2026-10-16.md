# Company: pendências de migração e validação

## Checkpoint de execução — 23/10/2026

Este checkpoint prevalece sobre os registros históricos abaixo; publicado não significa homologado pelo responsável.

### Publicado; aguarda teste humano

- PR #68: Gestão reorganizada, lucro em um clique, agenda preservada. Merge `c21e3ab58f424171e30b09bd707968bf14951372`; produção READY `dpl_EfXeK6639e2ioHVzGbokasmxubmv`. Seis testes focados e lint aprovados. Smoke autenticado confirmou Gestão e destino Resultados. QA existente: https://trello.com/c/Ds7w57lG.
- PR #66: Lead/Copilot e destinos Company. Merge `f41592e8585344470f9b227586b5edd112f263f2`; produção READY `dpl_GE8p4Ao8u4S6pKQDnTxAJFHrFdqr`. Vinte testes focados e lint aprovados; navegação autenticada Lead → Cadastrar cliente sem enviar formulário. QA existente: https://trello.com/c/xqAHYKEL.
- PR #69: formatos monetários consistentes em 12 fluxos Bank; ambiguidade `1.234` rejeitada, sem converter silenciosamente para centavos errados. Merge `6135406606b36e81c032e701c08d8e39d67b6e6e`; produção READY e domínio oficial confirmados em `dpl_EnVLHK4HsVbQpmq1vwMvQK7fRJtN`. Suite 169/169, testes adicionais de rejeição antes do RPC e lint sem erros. Detalhes em `BANK-VALORES-2026-10-23.md`; cartão https://trello.com/c/W0dF6isP.

### Fechamento mobile / acompanhamento

- Busca por telefone normalizado em todas as filas Vender/Acompanhar e Voltar 44px publicados pelo PR #71: merge `d0f99ace761694511ba5cd121803c4d4197afd3e`, produção READY `dpl_9GCFARq125ea96Qk1GDDBh1sR4Sc`. Suíte 174/174; menus/mapa #63 reutilizados; CSS real em 320/390/414px sem colisão/transbordamento. Smoke autenticado oficial confirmou a busca nova. Cartão https://trello.com/c/GawwPeMb.
- Validação manual no iPhone dos menus, zoom, campos, navegação e resultados permanece com o responsável; não registrar aprovação por ausência de relato.

### Próximas melhorias e dependências distintas do mobile

- Sabores em produto provisório implementados no PR #73, com um produto/múltiplos sabores e atomicidade. Teste PostgreSQL isolado reproduz a perda antiga e verifica contrato/rollback; CRUDs delegados usam stubs. Suíte179/179 e preview READY no SHA `2edc569488111dfc76a3b79331142263bbd1602b`; publicação final deve ser conferida no cartão, não presumida pelo preview. Ver `COMPRAS-SABORES-2026-10-23.md`. https://trello.com/c/6AHJkivO.
- Fitness “Já chamei” com data opcional publicado pelo PR #72: merge `a288fb237fb394ecb814789ac26fa213ab09964d`, produção READY `dpl_D3t7WynTrXc4GgyXoxEgzuv55vDA`. Sugestão +6 dias, status/permissões/histórico preservados. Migration só função, contagens/ACL conferidas antes/depois sem registros alterados. Ver `FITNESS-RETORNO-2026-10-23.md`. https://trello.com/c/TDF3ZIuf.
- Compra já encomendada: counterexample confirmado em PostgreSQL isolado (`node scripts/reproduce-purchase-task-sql.cjs`): sincronizador cria tarefa de compra ignorando pedidos. Consulta real encontrou zero tarefas automáticas planejadas no momento; não foi possível vincular ao aviso original. Correção integral ainda precisa conciliar fila/reservas por sabor/local e sincronização após compras/recebimento/cancelamento, com cuidado para tarefas manuais e locks. Não ocultar/apagar avisos indiscriminadamente. https://trello.com/c/ujIqjwSJ.
- Google Reviews: aprovação informada recebida; falta OAuth privado/consentimento/configuração. Reutilizar #58; ver `GOOGLE_REVIEWS.md`. https://trello.com/c/2abs7whk.
- Controlador #67 permanece separado e intocado; nenhuma execução autônoma permanente foi ativada.

Nenhum registro comercial real foi criado ou alterado para teste. Os lotes anteriores não alteravam migrations; os novos lotes Fitness/sabores incluem migrations aditivas de funções, sem backfill ou mudança de RLS/autenticação. Evidências e bloqueios nos cartões existentes. Esta sessão não constitui agente em execução em segundo plano.

Atualização: 16/10/2026. Auditoria de código e rotas; não equivale a homologação completa das operações online.

## Pacote implementado

- Mapa: conferências aprovadas ficam ocultas por padrão e continuam acessíveis no histórico. Etapas estáticas concluídas também ficam recolhidas. Nenhum registro de aprovação foi apagado ou criado automaticamente.
- Calendário da Company: “Abrir registro” converte destinos conhecidos para seus equivalentes existentes na Company, preservando parâmetros. Destinos sem equivalente não são mascarados por redirecionamentos genéricos.
- Parceiros: navegação por swipe recebe o contexto Company.
- Escritório: telefones pendentes abrem `/company/clientes?pendencia=telefone`; Doctor mostra sinais automáticos e relatos pendentes, sem limpar auditoria. Falha de consulta não vira zero.
- Suplementos: alerta passa a usar necessidade de reposição/demanda sem estoque, não toda venda aguardando entrega. Detalhes em `/company/estoque/atencao`.
- Fitness: `/company/fitness/oportunidades` cruza categoria e tamanho observados com disponibilidade, excluindo variantes já compradas e estoque indisponível. Usa amostra das últimas 500 vendas válidas. É hipótese comercial, não medida corporal confirmada; não envia mensagens nem reserva mercadoria.
- Conferência física Fitness ganha destino Company, reutilizando a função existente e as mesmas permissões.
- A permissão de estoque da Drogaria, alterada pelo usuário, foi preservada.

## Ainda não declarar migrado

| Área | Situação / próximo trabalho |
| --- | --- |
| Fitness: consignações | Lista, nova e detalhe agora em `/company/fitness/consignacoes`; retornos de criação, acerto, devolução e cancelamento mantêm Company. Testes de interface com RPC simulada aprovados; homologação das ações reais ainda pendente. |
| Fitness: inteligência, custos, movimentações, PDFs e Nexus | Disponíveis em `/company/ferramentas`, reutilizando as fontes/componentes e RPCs existentes. Custos já estava integrado. Filtros/paginação e links conhecidos mantêm Company. Comparação visual e geração real de PDF/campanha ainda pendentes. |
| Suplementos: Nexus/hábitos e filas especializadas | Nexus e hábitos disponíveis em Company com os mesmos dados e confirmações. Atalhos conhecidos convertidos; destinos dinâmicos sem equivalente não são mascarados. Ainda auditar filas especializadas e ações produzidas pelo chat. |
| Estoque: reconciliação e ações profundas | Reconciliação, contagem e movimentações possuem páginas Company explícitas, com filtros e retornos corrigidos. Subnav preserva contexto. Detalhe legado de estoque e ações profundas ainda precisam de auditoria completa. |
| Central da gestão | Reutiliza telas por rewrite; revisar links internos e fluxos completos. |
| Parceiros | Swipe corrigido; ainda testar acertos, recompensas e retornos de edição em Company. Overlay legado continua restrito ao contexto legado; não remover recursos da página Company. |

Clientes, produtos, vendas, pós-venda, compras, fornecedores, parceiros, rotas e trocas já possuem entradas Company. Isso não é aprovação automática de todos os seus fluxos.

## Teste humano pendente (sem alterar dados só para testar)

1. `/company/mapa`: resolvidos ocultos; abrir histórico e verificar notas preservadas.
2. `/company/escritorio`: telefone abre somente cadastros sem telefone; Doctor abre Qualidade; reposição não confunde entrega pendente com falta de estoque.
3. `/company/fitness/oportunidades`: conferir cliente, compra usada como evidência, categoria, tamanho e disponibilidade; abrir produto e ficha sem sair de Company.
4. Calendário/pós-venda: abrir registro e voltar, mantendo Company.
5. Parceiro: deslizar nos dois sentidos e abrir edição, mantendo Company.
6. `/company/estoque/fitness/conferencia`: abrir em celular e desktop; ajuste real somente quando houver conferência física autorizada.

## Evidência técnica

- Consultas somente leitura confirmaram relações do histórico Fitness e campos da view de reposição. Nenhuma migration nem atualização de dados reais neste pacote.
- Consulta do Doctor via SQL administrativo exige sessão autenticada e não foi contornada; validar indicadores na sessão normal do ERP.
- Testes de regressão cobrem destinos, hipótese de tamanho/disponibilidade, preservação de aprovados e escritório sem ações automáticas. Tipos/lint são registrados no relato da entrega.
- Aprovação visual e teste autenticado das novas telas ainda pendentes; não marcar como homologados no mapa.

## Segundo pacote: ferramentas e navegação

- Entrada única: Gestão → Ferramentas de Suplementos e Fitness. Estoque também oferece movimentações, inteligência e consignações nos contextos correspondentes.
- Páginas novas compõem as implementações existentes, sem duplicar dados ou retirar rotas antigas. Não há nova migration, dependência nem integração de IA.
- Consignações preservam seleção de cliente, peças, preços, datas, observações, formas/prazos de pagamento, devolução, cancelamento e venda gerada. As três RPCs operacionais não foram modificadas nem executadas em produção para teste.
- Cesta Nexus Fitness: removida dependência de portal que procurava título/painel inexistente no DOM atual. Renderização direta conserva conteúdo, quantidades, decisões, recarga e RPCs; removida regra CSS posicional que ocultava painéis. Carregamento inicial ignora resposta depois do desmonte.
- Botão “Novo ajuste” de movimentações agora abre a área oficial de estoque em vez de não executar ação. Ajuste continua pelo fluxo existente.
- Mapa ganhou linhas específicas para o pacote, sem marcar aprovações nem apagar notas; proposta antiga do escritório consolidada na implementação atual, sem duplicação de pauta.
- Supabase: leitura confirmou as sete RPCs já utilizadas. Não foram criadas funções ou ampliadas permissões.

## Terceiro pacote · 17/10/2026

- Conversões: `/company/fitness/conversoes`, usando `FitnessConversionForm` e a RPC `convert_fitness_stock` sem alterar quantidade, regras ou custo; atalho no estoque e histórico filtrado. Botão de remover destino ganhou nome acessível e resultado assíncrono anunciável.
- Estoque: ficha detalhada reutilizada pelo rewrite existente, com produtos, vendas e pedidos a caminho permanecendo na Company. Não criar `[id]` nativo genérico neste nível sem tratar todas as rotas estáticas legadas: ele poderia capturar `sabores`, `lotes` ou `inteligencia` antes do fallback. Saldo, sabores, movimentos, reservas e formulário de ajuste preservados.
- Parceiros: configuração acessível em Company; vínculos antigos e vendas do gerencial abrem o detalhe específico, não só a fila. Portal administrativo em `/company/parceiros/portal`, com guarda de administrador e o mesmo gerenciador de convites/pausa existente. Nenhum convite, alteração de permissão, recompensa ou acerto foi executado para testar.
- Central: links conhecidos de páginas/componentes, cartões de indicadores, pesquisa e paginação preservam o contexto usando um componente compartilhado. Retorno de promoção criada e saída das ações de Inbox/mídia também respeitam Company. Revalidação atualiza as duas URLs; payloads e verificações de autorização existentes preservados.
- Limites da Central: aliases antigos como integrações/início e redirecionamentos de falta de permissão ainda exigem revisão. Destinos dinâmicos desconhecidos não são reescritos. Portal CSS legado de atalhos não foi refeito. Não declarar aposentadoria da Central.
- Verificação online encontrou um redirect anterior ao rewrite que devolvia `/company/gestao/central` à Gestão. Removido esse redirect para abrir a implementação completa da Central dentro da Company; URLs antigas continuam preservadas. Regressão adicionada para não recriar esse desvio.
- Qualidade: `test:company` e `audit:duplicates`, sem dependências adicionais. Testes usam RPCs simuladas; auditoria só gera candidatos, nunca unifica regras ou cadastros.
- Evidências e próximos portões: `QUALIDADE-E-MOBILE-2026-10-17.md`. Mapa atualizado sem gravar aprovações fictícias. Homologação de ações reais e Safari/iPhone continua pendente.

### Conferência online · terceiro pacote

- Produção READY em `3396402`, seguida da correção de entrada `6369dbc`. Conversões, configuração de parceiros, portal administrativo e ficha detalhada de estoque carregaram em sessão autenticada. Venda específica e produto da ficha mantiveram URLs Company. Nenhuma mutação operacional executada.
- A entrada completa da Central foi verificada dentro de `/company/gestao/central`, com links de documentos, prioridades, contatos, mídia, agenda e governança na Company. A busca do cabeçalho também foi ajustada para submissão direta no contexto Company.
- Bateria completa: 38 testes Node aprovados; verificação de tipos aprovada e lint direcionado com zero erros/três avisos preexistentes. Logs recentes da publicação não mostraram erros, mas isso não equivale a homologação integral.
- Complemento de 17/10: lotes, detalhe/rastreabilidade, estoque por sabor e histórico expostos no catálogo Company. Links para lote, venda, pedido e histórico preservam contexto, parâmetros e fragmentos. Histórico Company já existia; reutilizado, sem duplicar classificação. Aliases pausados ativação/Inbox/Nexus e integração/governança agora retornam diretamente à Company. Nenhuma RPC alterada e nenhuma função pausada reativada.
- Permanecem pendentes: redirecionamentos por falta de permissão, demais destinos dinâmicos da Central, ações reais de classificação/quarentena e Safari/iPhone. Testes Node não substituem homologação visual ou transação real. Não tratar estes resultados como aprovação do responsável.

### Próximo bloco efetivo

1. Homologar consignação real desejada (envio → acerto/devolução → venda), mantendo consulta antiga para comparação.
2. Conferir filtros/paginação de movimentações, inteligência, PDF e Nexus na sessão do ERP; gerar materiais somente quando desejado pelo responsável.
3. Auditar conversões Fitness, todos os retornos da ficha de estoque Suplementos, ações profundas dos parceiros e Central. Não aposentar as telas antigas antes disso.

### Verificação da publicação

- Código publicado em produção: `433d595`; acabamento dos atalhos: `af8ce17`. Ambos com build Vercel READY e alias oficial. Sem alterações de dados para teste.
- 14 testes Node aprovados, TypeScript e lint dos arquivos alterados sem erros. Testes de acerto usam RPC simulada, não comprovam uma mutação real no banco.
- Sessão autenticada no domínio oficial: lista vazia de consignações e formulário de nova prova carregaram; inteligência Fitness carregou indicadores reais; histórico Fitness e filtro de conversões mantiveram Company; histórico Suplementos filtrado por ajustes e reconciliação carregaram; hábitos do Nexus carregou dados; cesta Fitness mostrou quatro sugestões reais sem aceitar nenhuma.
- Área de ferramentas inspecionada em desktop e viewport móvel solicitado de 390px (área útil 375px por scrollbar). Largura de conteúdo igual à visível, sem overflow horizontal. Corrigido encaixe do texto nos atalhos após inspeção. Viewport restaurado.
- Ações reais de envio/acerto/cancelamento, geração de PDF/campanha e todos os fluxos profundos continuam pendentes de homologação; não foram marcados como aprovados no mapa.
