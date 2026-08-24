# V45.51 · Nutrição IA Premium

Pacote cumulativo: substitui o V45.50.

## Corrige a mensagem "A ferramenta Nutrição IA foi desativada"

A rota `POST /api/produtos/nutricao/pesquisar` tinha sido substituída
por um HTTP 410. A V45.51 restaura a pesquisa automática com:

- OpenAI Responses API;
- `gpt-5.6-terra` por padrão;
- pesquisa web;
- fonte oficial como prioridade;
- saída estruturada;
- validação da URL efetivamente retornada pela pesquisa;
- gravação através da RPC já existente `save_product_nutrition_ai_research`;
- revisão humana antes de salvar a Foto 03.

A geração da arte continua no navegador, como o workbench atual já faz.
Não foi reativada a rota antiga de geração server-side porque ela não é
necessária no fluxo atual.

## UX Premium

- hero compacto da Nutrição IA;
- número real de pendentes;
- abas Para fazer / Já possuem / Todos;
- busca própria;
- cards premium escuros com detalhes dourados;
- formulário e resultado da pesquisa organizados;
- 2 colunas em telas largas, 1 coluna em telas menores;
- 8 produtos por lote;
- sem MutationObserver contínuo;
- nomenclatura visível passa a Foto 03.

## Acessórios

Acessórios e itens sem aplicação nutricional deixam de entrar na fila:

- categoria/status `not_applicable`;
- acessórios;
- coqueteleiras/shakers/squeezes;
- straps/luvas;
- roupas/vestuário.

Eles não entram nem no contador de pendentes.

## Banco

Nenhuma migration nova nesta V45.51.
Nenhuma alteração foi aplicada diretamente em produção.

## Variável necessária

`OPENAI_API_KEY` deve existir na Vercel.
Opcional: `OPENAI_NUTRITION_MODEL`.
