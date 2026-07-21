# V38 · Pacotão Escala · Promoções e Rupturas

## Promoções
Erro real de produção encontrado:
`each UNION query must have the same number of columns`.

Causa:
- fonte Suplementos retornava 17 colunas;
- fonte Fitness retornava 16 colunas;
- faltava a posição `sales_category` no CTE Fitness.

Correção:
- Fitness recebe `null::text as sales_category`;
- função validada depois da migration;
- `central_promotion_suggestions(null,30)` retornou 29 linhas no teste autenticado.

## Showcase de Promoções
Nova rota:
`/promocoes`

Características:
- standalone, sem sidebar;
- acesso pela tela de operações;
- botão ao lado de Sala do Dono;
- galeria separada em Suplementos e Fitness;
- mostra campanhas ativas e agendadas;
- clique abre detalhe do produto promocional.

A gestão continua em:
`/central/promocoes`

## Rupturas
Nova rota:
`/central/rupturas`

Registra:
- produto procurado;
- operação;
- prioridade;
- marca/categoria;
- cliente/telefone;
- cidade;
- data;
- observações;
- imagem selecionada.

Resumo agrupa pelo nome normalizado e mede:
- quantidade de procuras;
- demandas ainda ativas;
- última procura;
- cidades.

## Nexus · busca de imagens
Edge Function:
`rupture-image-search`

Fluxo:
1. usuário digita o nome;
2. Nexus usa OpenAI Web Search;
3. procura páginas confiáveis;
4. tenta extrair og:image/twitter:image;
5. retorna até 3 imagens;
6. usuário escolhe;
7. URL e fonte ficam salvas no registro.

Não foi criada uma API externa nova.
A função reaproveita `OPENAI_API_KEY` já usada pelo Nexus.

## Banco
Migration aplicada em produção:
`20260721010553_v38_promotions_runtime_fix_and_demand_gaps`

Edge Function já publicada:
`rupture-image-search` v1
