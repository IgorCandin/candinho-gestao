# Hotfix · Fitness V4 · Deploy

O deploy do commit `90697331c9b1ba07b5bfac4deec13dba4938fe07`
compilou o Next.js normalmente e falhou apenas na checagem TypeScript.

Erro da Vercel:

`src/components/public-storefront-visual-enhancer.tsx:124`
`Type error: 'image' is possibly 'null'.`

Causa:
o elemento `<img>` já era validado antes, mas a referência era usada dentro
de callbacks internos. O TypeScript não preservou o narrowing de null dentro
dessas closures.

Correção:
após a validação, a referência é fixada em `const productImage = image` e os
callbacks usam essa referência não nula.

Banco:
nenhuma alteração.
Não rode SQL.

Commit sugerido:
`fix: corrige tipagem da galeria da vitrine`
