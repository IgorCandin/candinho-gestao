# Nexus Fitness + Vitrine Inteligente V2

Este pacote continua o `Nexus Operating Layer V1`.

Ele expande a mesma lógica em duas direções:

1. **Nexus Fitness**: um copiloto mais simples para a operação da Candinho Fitness.
2. **Vitrine Inteligente**: a experiência pública do catálogo passa a ter página individual de suplemento e Nexus Guia.

Também amplia a busca lateral para encontrar produtos reais.

---

## 1. Nexus Fitness

Nova rota:

`/fitness/nexus`

A Home da Fitness também recebe um bloco compacto:

**Nexus Fitness · O que vale olhar hoje**

### O motor cruza

- estoque disponível;
- estoque a caminho;
- vendas dos últimos 30 dias;
- vendas dos últimos 90 dias;
- última venda;
- preço atual;
- custo cadastrado;
- pendências gerais da operação.

### Sinais

**Reposição**
Produto zerado, sem entrada a caminho e com histórico de venda.

**Promover agora**
Quantidade alta e pouco movimento recente.

**Estoque parado**
Quantidade relevante sem giro em 90 dias.

**Não promover agora**
Produto com movimento recente e pouco estoque disponível.

**Em alta**
Produto com giro recente e estoque suficiente para aproveitar o momento.

### Promoção

O Nexus NÃO inventa o desconto.

Primeiro o banco calcula uma sugestão operacional usando:

- preço;
- custo;
- estoque;
- giro;
- piso de margem bruta aproximado.

Depois a IA recebe o preço/sugestão já calculado e escreve:

- estratégia;
- Story;
- legenda;
- CTA.

Se o custo estiver incompleto, a interface avisa para revisar antes de publicar.

Nada é publicado automaticamente.

---

## 2. Catálogo público

A rota principal continua:

`/catalogo`

Agora ela recebe:

- abertura mais comercial;
- `Me ajude a escolher`;
- objetivos rápidos;
- Nexus Guia;
- cards de suplementos clicáveis.

### Página individual

Cada suplemento ganha slug próprio:

`/catalogo/<slug>`

Exemplos gerados:

- `/catalogo/creatina-300g-candinho-suplementos`
- `/catalogo/colageno-hidrolisado-120-capsulas-dark-lab`

O slug é editável na ficha interna, então pode ser encurtado para algo como:

`/catalogo/creatina-candinho`

### A página usa em tempo real

- imagem;
- preço;
- promoção ativa;
- estoque;
- sabores;
- produtos relacionados disponíveis.

Ela continua existindo se o item zerar, desde que a página esteja publicada.

Quando estiver zerado, o CTA muda para pedido de atendimento/aviso.

---

## 3. Conteúdo público separado da ficha interna

Nova rota interna:

`/produtos/[id]/pagina-publica`

A ficha do produto recebe atalho **Página pública**.

Campos:

- slug;
- título;
- descrição curta;
- descrição completa;
- destaques;
- modo de uso/referência revisada;
- advertências;
- FAQ;
- título SEO/Open Graph;
- descrição SEO/Open Graph;
- modelo de mensagem de interesse;
- publicado/despublicado.

### Proteção importante

A migration NÃO publica automaticamente textos internos antigos como copy pública.

As páginas começam com:

- nome;
- preço;
- foto;
- disponibilidade;
- categoria/marca;
- objetivo comercial quando cadastrado.

O conteúdo textual enriquecido é revisado na aba pública.

Existe **Gerar rascunho com Nexus**:

- usa dados cadastrados;
- não inventa pureza, dose, fabricante, laudo, ingredientes ou benefícios;
- não gera `uso` ou `advertências`;
- precisa ser revisado e salvo por uma pessoa.

---

## 4. Nexus Guia público

O cliente pode conversar com o Nexus:

- no catálogo geral;
- dentro da página de um produto.

Exemplo:

`/catalogo/creatina-candinho`

O Nexus já sabe qual produto está sendo visto.

### Prioridade de recomendação

1. compatibilidade com o objetivo informado;
2. produto disponível;
3. entre opções equivalentes, histórico de giro da própria operação.

O giro é usado apenas para ORDENAR o contexto.

O público NÃO recebe:

- quantidade vendida;
- custo;
- lucro;
- dados de clientes;
- regras internas de ranking.

### Limites

O Nexus não diz que algo é “o melhor” ou “o mais indicado” de forma absoluta.

Situações como:

- gestação;
- amamentação;
- menor de idade;
- medicamentos;
- doenças;
- sintomas;
- reação;
- questões clínicas;

fazem o Nexus interromper a indicação automática e oferecer atendimento humano.

Existe ainda limite leve de perguntas por sessão/hora.

---

## 5. Handoff humano

Na vitrine, o cliente pode preencher:

- nome;
- telefone.

O interesse entra em `catalog_public_leads`.

O sistema também cria um sinal:

**Novo interesse do catálogo**

na operação do Nexus.

A conversa não é salva integralmente na telemetria; o contexto enviado pelo cliente no handoff é salvo para permitir atendimento.

---

## 6. Telemetria da vitrine

Eventos públicos:

- página de produto aberta;
- intenção de compra;
- Nexus aberto;
- pergunta feita;
- handoff humano.

A tabela de eventos NÃO guarda o texto da pergunta.

Metadados são restritos no banco a:

- origem;
- posição da interface.

---

## 7. Busca lateral com produtos

O campo passa de:

`Buscar ferramenta...`

para:

`Buscar ferramenta ou produto...`

Exemplos:

`Candinho`

pode mostrar:

**Creatina 300g | Candinho Suplementos**

`Colágeno`

pode mostrar:

**Colágeno Hidrolisado...**

O resultado leva direto para:

`/produtos/[id]`

Também busca produtos Fitness para usuários com acesso à Fitness.

Produtos com estoque aparecem com destaque verde.

---

## 8. Banco

Migrations incluídas:

- `20260730182000_nexus_fitness_public_catalog_v1.sql`
- `20260730182100_public_product_recommendations_safe_v1.sql`
- `20260730182200_public_catalog_copy_review_v1.sql`

As migrations foram aplicadas ao Supabase de produção durante a criação deste pacote.

**Não execute SQL manualmente.**

Tabelas novas:

- `public_product_pages`
- `catalog_public_events`
- `catalog_public_leads`

Funções principais:

- `public_storefront_slug_map_v1`
- `public_storefront_product_page_v1`
- `public_catalog_advisor_snapshot_v1`
- `public_catalog_track_event_v1`
- `public_create_catalog_lead_v1`
- `public_catalog_question_count_v1`
- `search_internal_products_v1`
- `fitness_nexus_snapshot_v1`

---

## 9. Aplicação

Extrair na raiz do repositório.

Depois:

GitHub Desktop → revisar → Commit → Push origin

Commit sugerido:

`feat: expande Nexus para Fitness e cria vitrine inteligente`

A Vercel continua sendo a validação final de integração do projeto completo.
