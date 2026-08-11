# Candinho Fitness · Operação + Vitrine V4

Pacote de continuidade da reconstrução da Fitness.

## 1. Clientes sincronizados com Candinho Company

A Fitness deixa de ter uma base isolada para os dados principais de cliente.

### Como funciona

- `customers` continua sendo a identidade central da pessoa.
- `fitness_customers` continua existindo para dados específicos da Fitness:
  Instagram, origem, observações e histórico Fitness.
- `fitness_customers.core_customer_id` liga as duas pontas.
- Nome, telefone e cidade são compartilhados.
- Histórico de Suplementos e histórico Fitness continuam separados.
- Clientes que só compraram Suplementos NÃO inflam a métrica de clientes ativos
  da Fitness.

### Venda / orçamento / prova

Os três fluxos recebem uma busca nova:

- pesquisa nome;
- telefone;
- cidade;
- Instagram;
- mostra se a pessoa já era da Candinho ou já tem histórico Fitness.

Se a Giulia escolher um cliente que só existe em Suplementos, o perfil Fitness
é criado automaticamente no primeiro uso e ligado à mesma pessoa.

### Migração dos clientes antigos

Na aplicação da migration:
- 30 clientes Fitness existentes foram ligados à identidade Company;
- 0 links duplicados;
- o diretório compartilhado ficou com 181 pessoas;
- 151 estavam apenas na Company e passam a ficar pesquisáveis na Fitness sem
  serem contabilizadas como clientes Fitness até realmente participarem da operação.

## 2. Galeria de fotos da Fitness

### Operação interna

A ficha do produto agora mostra um carrossel com TODAS as fotos cadastradas:

- variações com foto;
- cores sem estoque também continuam visíveis internamente;
- fotos geradas pelo Nexus;
- fotos extras.

Ordem:
1. Preto/Preta/Black;
2. demais cores;
3. foto principal;
4. lifestyle / fotos geradas.

A foto pode ser ampliada em tela cheia e navegada por setas/miniaturas.

### Editor

O cadastro V3 está incluído neste pacote:

- upload real em vez de URL manual;
- foto principal;
- foto específica por cor;
- categoria com autocomplete;
- tamanho/cor com sugestões;
- um único fornecedor;
- duplicação rápida de variação.

Também no editor a cor preta aparece primeiro.

## 3. Vitrine pública

O `/catalogo` agora recebe:

- clique/toque na foto para ampliar;
- lightbox no desktop e celular;
- setas e bolinhas quando existem várias fotos;
- nome da cor;
- observação/descrição dentro do card;
- Fitness com galeria por cores.

### Regra pública de disponibilidade

Na Fitness:
- só entram no slide as cores que possuem estoque disponível;
- se Preto estiver disponível, Preto é a primeira foto;
- se Preto estiver zerado, ele não aparece para o cliente;
- a operação interna continua vendo Preto mesmo zerado.

Isso evita apresentar ao cliente uma cor que não pode ser vendida naquele momento.

## 4. Nexus · foto com modelo

Dentro de Editar Produto, depois das fotos reais, existe:

`Nexus · foto com modelo`

A Giulia escolhe:
- foto real de referência;
- modelo aleatório / feminino / masculino;
- cenário;
- observação opcional.

O Nexus envia a peça como referência para edição de imagem.

### Filtros fixos

O prompt já obriga:
- fidelidade ao corte;
- cor fiel;
- costuras e detalhes preservados;
- anatomia natural;
- mãos/dedos corretos;
- pele com textura;
- tecido com dobras físicas;
- iluminação real;
- sem pele plástica;
- sem texto;
- sem marca d'água;
- sem aparência exageradamente perfeita de IA.

### Segurança da publicação

Toda imagem gerada nasce:

`public_visible = false`

Ou seja: fica somente dentro da operação.

A Giulia precisa clicar em:

`Publicar na vitrine`

para a foto entrar no catálogo.

Também pode remover da vitrine depois sem apagar o arquivo.

### OpenAI

O código usa `OPENAI_API_KEY` e normaliza modelos antigos para `gpt-image-2`.

A geração só gera custo quando o botão é acionado.

## 5. Conjuntos divisíveis

Foi criada uma solução de estoque real, e não apenas um desconto visual.

Exemplo:

`Conjunto Run · Top + Calça`

Enquanto está inteiro:
- existe 1 unidade do Conjunto;
- não existem Top e Calça avulsos vindos dele.

Na ficha do produto aparece:

`Conjunto divisível · Vender junto ou separado`

Primeiro a Giulia configura:
- nome da parte de cima;
- preço avulso;
- nome da parte de baixo;
- preço avulso.

O sistema cria as fichas das partes, mas NÃO mexe no estoque.

### Quando realmente abrir o conjunto

A Giulia seleciona:
- cor;
- tamanho;
- quantidade;

e toca:

`Separar`

Então o estoque faz uma conversão auditável:

- Conjunto: -1
- Top: +1
- Calça: +1

As duas partes passam a aparecer como produtos normais e podem ser vendidas
individualmente pelo fluxo atual.

O custo do conjunto é dividido proporcionalmente entre os preços definidos para
as partes.

Movimentos usados:
- `conversion_out`
- `conversion_in`

Portanto não existe estoque duplicado.

## 6. UX da Giulia

Foi adicionada uma camada visual SOMENTE para `/fitness`:

- textos maiores;
- cabeçalhos mais claros;
- cards com mais respiro;
- inputs maiores;
- botões maiores;
- tabelas mais legíveis;
- formulários de venda mais organizados;
- mobile com inputs em 16px para evitar zoom do iPhone;
- seleção de cliente com busca em vez de uma lista enorme;
- melhor hierarquia entre cliente, itens, pagamento e entrega.

Não altera o visual de Suplementos.

## Banco

Migration aplicada em produção:

`fitness_company_catalog_sets_v4`

Ela também incorpora a base necessária do V3:
- bucket `fitness-product-images`;
- políticas de upload;
- `save_fitness_product_v2` com foto por variação.

NÃO rode SQL manualmente.

## Commit sugerido

`feat: integra clientes, galeria e conjuntos da Fitness`
