# V45.14.1 · Hotfix Fitness Desktop

## Problema
No V45.14, o card de Fitness no desktop ficou usando o fallback com a arte
vertical porque ainda não havia sido enviada a versão horizontal.

## Correção
- adiciona o banner horizontal correto do Fitness:
  `public/operation-banners/fitness-desktop.webp`
- atualiza `/dashboard` para usar essa arte no desktop;
- o banner mobile continua apontando para:
  `public/operation-banners/fitness-mobile.webp`

## Efeito
- PC: Fitness passa a exibir o banner horizontal correto;
- Mobile: continua com o banner vertical correto;
- nenhuma outra operação foi alterada.

## Commit sugerido
`V45.14.1 - corrige banner desktop do fitness na home de operacoes`
