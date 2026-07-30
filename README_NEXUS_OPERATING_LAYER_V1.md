# Nexus Operating Layer V1

Este pacote transforma o Nexus de um assistente pontual em uma camada de inteligência acima dos módulos do ERP.

## Objetivo

A operação não deve depender de uma pessoa decorar onde olhar e em qual ordem abrir cada módulo.

O ERP continua sendo a fonte de verdade. O Nexus passa a:

- observar sinais reais do banco;
- organizar o que merece atenção;
- ligar comercial, CRM, agenda, pós-venda, estoque, compras e parceiros;
- aprender frequência de navegação e caminhos recorrentes;
- permitir conversar com a operação inteira;
- manter ações críticas sob confirmação humana.

## O que entra neste pacote

### 1. Nexus Inbox / Command Center

Em `/suplementos/nexus` existe uma Central do Nexus com:

- sinais urgentes;
- oportunidades;
- rotina guiada;
- frequência das páginas mais utilizadas;
- conversa operacional com o ERP inteiro;
- filtros Comercial / Operação / Relacionamentos.

Sinais iniciais:

- lead sem contato recente;
- orçamento sem avanço;
- pagamento vencido;
- entrega vencida/para hoje;
- pós-venda planejado;
- produto zerado sem reposição;
- produto disponível com lead aguardando;
- histórico de parceria que merece virar vínculo cadastrado.

### 2. "Comece por aqui" na tela Hoje

A tela da operação passa a abrir com uma leitura do Nexus antes das ferramentas tradicionais.

Isso é intencional para onboarding: uma nova pessoa consegue seguir uma sequência sem decorar todos os módulos.

### 3. Fila inteligente em Leads

A lista histórica de Leads continua existindo.

Acima dela aparece:

**Nexus · quem vale retomar**

A fila considera contato recente registrado e mostra no máximo as prioridades principais.

`Já tratei` tira o sinal da fila por 3 dias sem apagar o Lead.

Para registrar de forma permanente que houve contato, o CRM continua sendo a fonte correta.

### 4. Relacionamentos de clientes

Uma pessoa pode ter vários vínculos simultâneos.

Além da seção **Rede do cliente** em cada ficha, existe a visão consolidada:

`/clientes/relacionamentos`

Ela mostra relações entre pessoas e as redes de cada parceiro, inclusive quem está em atribuição automática.

Exemplos:

- cônjuge;
- mãe/pai;
- filho(a);
- irmão/irmã;
- amigo(a);
- colega;
- professor/aluno;
- indicação;
- familiar;
- outro.

O Nexus nunca inventa um parentesco. O vínculo só é fato depois de cadastrado.

A ficha do cliente recebe a seção **Rede do cliente** sem reescrever a página inteira.

### 5. Cliente → Parceiro

Existe um segundo tipo de vínculo para parceria, por exemplo:

**Cliente X → Aluno(a) → Pâmela**

Opções:

- Aluno(a)
- Cliente da parceria
- Indicado(a)
- Equipe / funcionário(a)
- Familiar
- Outro

O vínculo pode:

- contabilizar para a parceria;
- atribuir futuras vendas automaticamente;
- ser definido como principal quando houver mais de um.

### 6. Parceria automática na venda

Quando o cliente possui uma afiliação configurada para atribuição automática:

- `sales_quotes.partner_id` é preenchido no banco quando o orçamento é salvo sem parceiro manual;
- `sales.partner_id` também possui proteção para atribuição automática;
- a lógica atual de parceiros continua usando o `partner_id` da venda;
- uma escolha manual explícita continua vencendo a automática.

Na nova venda, o bloco manual de Parceria é escondido e substituído por um aviso compacto do vínculo automático.

Ao editar um orçamento já existente, o bloco manual é preservado para não alterar uma proposta antiga sem intenção.

### 7. Relacionamentos durante Novo Cliente

A tela `Novo cliente` agora permite cadastrar, antes de salvar:

- vários vínculos com pessoas já cadastradas;
- vínculo com parceiro;
- atribuição automática de parceria.

### 8. Telemetria de navegação do Nexus

O sistema registra:

- rota aberta;
- rota anterior;
- destino de link interno;
- sessão;
- classe de viewport (mobile/tablet/desktop).

Não registra:

- texto digitado;
- conteúdo de formulário;
- nomes extraídos da tela;
- preço digitado;
- senha/token;
- conteúdo das mensagens.

O Nexus usa a telemetria como frequência de navegação e transição, não como prova de intenção pessoal.

### 9. Nexus flutuante

Nas telas protegidas da operação existe um botão do Nexus.

Ao abrir:

- mostra contagem de sinais;
- quatro prioridades;
- permite pergunta rápida;
- leva à Central completa.

### 10. Grafo de relacionamento no contexto do Nexus

O Nexus recebe também a rede explicitamente cadastrada da operação.

Isso permite perguntas como:

- quem são os alunos vinculados a um parceiro;
- quem indicou quem;
- quais clientes têm vínculo automático de parceria;
- quais relações já foram registradas entre clientes.

A ausência de um vínculo é tratada como desconhecida; o Nexus não inventa parentesco.

### 11. Perguntar ao Nexus

A nova API `/api/nexus/ask` cruza:

- Nexus Signals;
- resumo comercial;
- agenda;
- pós-venda;
- vendas recentes;
- Leads;
- estoque consolidado;
- produtos a caminho;
- pedidos de fornecedor;
- rotina de navegação;
- grafo de relacionamentos e redes de parceria cadastradas;
- cliente selecionado, CRM, contatos e rede de relações, quando informado.

O Nexus pode sugerir telas e próximos passos, mas não executa automaticamente:

- recebimentos;
- baixas manuais;
- vendas;
- exclusões;
- mensagens externas;
- alterações financeiras.

## Banco

Migrations incluídas:

- `20260730134207_nexus_relationships_telemetry_v1.sql`
- `20260730134552_nexus_signal_engine_v1.sql`
- `20260730140534_nexus_rls_hardening_v1.sql`
- `20260730140945_nexus_signal_tuning_v1.sql`
- `20260730141238_nexus_table_grants_v1.sql`
- `20260730141613_nexus_activity_retention_v1.sql`
- `20260730142356_nexus_relationship_graph_v1.sql`
- `20260730142526_nexus_refresh_pipeline_v2.sql`

As oito migrations foram aplicadas no Supabase de produção durante a preparação do pacote.

Não execute SQL manualmente no projeto atual.

## Dados novos

Tabelas:

- `customer_relationships`
- `customer_partner_affiliations`
- `nexus_activity_events`
- `nexus_signals`

Funções principais:

- `resolve_customer_auto_partner_v1`
- `get_customer_network_v1`
- `get_nexus_usage_summary_v1`
- `get_nexus_route_transitions_v1`
- `refresh_nexus_signals_v1`
- `update_nexus_signal_status_v1`
- `tune_nexus_signals_v1`
- `prune_nexus_activity_v1`
- `get_nexus_relationship_graph_v1`
- `refresh_nexus_operating_layer_v2`


## Estado inicial e segurança dos dados

- O motor de sinais já foi executado e validado em produção.
- O tuning remove da fila diária Leads históricos com mais de 30 dias sem contato, mas o histórico original continua no CRM.
- Nenhuma relação pessoal ou vínculo com parceiro foi criado automaticamente a partir de exemplos das conversas.
- Os exemplos como cônjuge ou aluno(a) só viram fato quando alguém cadastra explicitamente no ERP.
- A telemetria começa a aprender depois do deploy; histórico antigo de cliques não é reconstruído.
- Eventos de navegação têm retenção padrão de 180 dias.

## Aplicação do ZIP

1. Extrair na raiz do repositório.
2. Substituir os arquivos quando solicitado.
3. Abrir GitHub Desktop.
4. Revisar arquivos.
5. Commit.
6. Push origin.
7. Aguardar o deploy da Vercel.

Commit sugerido:

`feat: transforma Nexus em camada operacional inteligente`

## Observação de build

O pacote foi construído a partir do `main` atual consultado pelo conector GitHub e o banco foi validado no Supabase.

O ambiente local de geração não consegue resolver `github.com`, então não foi possível clonar o repositório completo e executar `npm run build` antes do ZIP. O deploy da Vercel será a validação final de TypeScript/build.
