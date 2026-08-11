# Fitness · Tamanhos e cores disponíveis V5

Adiciona um card cinza Company nos cards de produto da Fitness.

Exemplos:
- `G · Preto`
- `M · Marrom`
- `M · Azul Marinho`

## Operação interna

`/fitness/produtos`

Cada produto com estoque disponível mostra:
- título `Tamanhos e cores`;
- combinações tamanho + cor;
- somente variações com `available_quantity > 0`;
- até 6 chips no card, com `+N` quando houver mais;
- a busca agora também encontra por tamanho e cor.

No modo Lista o mesmo dado aparece em versão compacta.

## Vitrine pública

`/catalogo`

Nos produtos Fitness:
- o mesmo card cinza Company aparece;
- somente combinações realmente disponíveis são expostas;
- produtos de Suplementos não recebem esse card;
- cards da aba Promoções não misturam todas as variações, evitando sugerir
  que uma promoção específica vale para tamanhos/cores que não fazem parte dela.

## Banco

Migration `fitness_public_available_options_v1` já aplicada em produção.

Ela expõe somente tamanho, cor e quantidade disponível de variações Fitness
que já estão aptas à venda pública.

NÃO rode SQL manualmente.

## Commit sugerido

`feat: mostra tamanhos e cores disponíveis na Fitness`
