# Hotfix · Fitness V4 · Deploy V2

O primeiro hotfix corrigiu o erro:
`'image' is possibly 'null'`.

No build seguinte a Vercel avançou e revelou o próximo erro de narrowing:
`'item' is possibly 'undefined'`.

Este V2 corrige de forma completa o bloco da galeria, estabilizando antes
dos callbacks as referências já validadas:

- `product` para o produto;
- `wrapper` para o contêiner da imagem;
- `productImage` para a tag img;
- `productSlides` para os slides.

Assim evitamos a sequência de erros TypeScript escondidos no mesmo bloco.

Banco: nenhuma alteração.
SQL: não executar.

Commit sugerido:
`fix: estabiliza tipagem completa da galeria da vitrine`
