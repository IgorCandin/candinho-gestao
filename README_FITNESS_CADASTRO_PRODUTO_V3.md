# Fitness · Cadastro de Produto V3

Refino do cadastro antes de abastecer a Candinho Fitness.

## O que mudou

- Sai o campo manual `URL da foto`.
- Upload real de JPG/PNG/WEBP.
- Foto principal do produto.
- Foto específica por cor.
- Uma foto de cor é aplicada automaticamente a todos os tamanhos daquela cor.
- Se não houver capa manual, a primeira foto de cor vira a capa.
- Categoria vira autocomplete: escolhe existente ou digita uma nova.
- Tamanho e cor também sugerem valores já usados sem bloquear valores novos.
- Fornecedor aparece uma única vez no produto.
- Ao salvar, todas as variações usam esse fornecedor.
- Adicionar/duplicar variação reaproveita custo, venda, mínimo e ideal.
- SKU continua individual.

## Banco

Migration já aplicada em produção:

`fitness_product_form_media_v3`

Ela:
- criou o bucket público `fitness-product-images`;
- liberou upload apenas para usuários com escrita na Fitness;
- atualizou `save_fitness_product_v2` para persistir a imagem da variação;
- transformou o fornecedor do topo na fonte única para todas as variações.

Não rode SQL manualmente.

## Commit sugerido

`feat: refaz cadastro da Fitness para fotos e variações`
