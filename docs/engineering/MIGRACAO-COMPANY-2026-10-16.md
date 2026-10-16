# Company: pendências de migração e validação

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

### Próximo bloco efetivo

1. Homologar consignação real desejada (envio → acerto/devolução → venda), mantendo consulta antiga para comparação.
2. Conferir filtros/paginação de movimentações, inteligência, PDF e Nexus na sessão do ERP; gerar materiais somente quando desejado pelo responsável.
3. Auditar conversões Fitness, todos os retornos da ficha de estoque Suplementos, ações profundas dos parceiros e Central. Não aposentar as telas antigas antes disso.
