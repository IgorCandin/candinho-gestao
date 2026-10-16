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
| Fitness: consignações | `/fitness/consignacoes`, nova e detalhe não possuem equivalentes Company. Migrar telas e retornos das ações de venda, devolução e cancelamento juntos; não retirar a operação antiga. |
| Fitness: inteligência, custos, movimentações, PDFs e Nexus | Comparar `/fitness/estoque/inteligencia`, `/fitness/estoque/custos`, `/fitness/movimentacoes`, `/fitness/pdfs` e `/fitness/nexus` com funções Company. Ausência de rota homônima não prova ausência de toda funcionalidade. |
| Suplementos: Nexus/hábitos e filas especializadas | Comparar `/suplementos/nexus`, hábitos e ferramentas comerciais com os equivalentes Company/Central antes de desativar qualquer tela. |
| Estoque: reconciliação e ações profundas | Há reaproveitamento por rewrite sob Company; conferir botões, retornos e permissões de cada ação. URL Company por si só não comprova migração integral. |
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
