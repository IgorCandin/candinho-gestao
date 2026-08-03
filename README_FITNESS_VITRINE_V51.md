# Hotfix · Fitness Vitrine V5.1

Corrige a composição estranha criada pelo primeiro card de "Tamanhos e cores".

## Causa

A versão V5 colocou uma caixa cinza completa dentro de outro card de produto.
Na vitrine pública ela ainda é adicionada depois do React montar o produto,
então produtos com nomes, promoções, observações e quantidades diferentes
podiam ficar visualmente desbalanceados.

## Ajuste

Em vez de outro card, agora existe uma faixa compacta:

`DISPONÍVEL EM`
`G · Preto` `M · Marrom` `+2`

- sem borda externa grande;
- sem fundo pesado;
- até 4 combinações na vitrine;
- `+N` para o restante;
- combinações duplicadas são removidas;
- preço e promoção permanecem agrupados;
- observação fica abaixo sem invadir os chips;
- cards Fitness passam a usar uma estrutura previsível de imagem + conteúdo;
- mobile recebe chips maiores, mas com altura controlada.

O catálogo interno recebe o mesmo padrão visual.

Sem SQL.
Sem migration.

Commit sugerido:

`fix: corrige composição de tamanhos e cores na vitrine Fitness`
