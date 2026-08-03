# Candinho · Vitrine Company UX V7

Pacote de refinamento da vitrine pública `/catalogo`.

## O que corrige

### 1. A página passa a ter identidade Candinho Company

A estrutura geral deixa de parecer a área de Suplementos:

- fundo neutro/Company;
- bordas e estados ativos em cinza Company;
- preços e informações principais neutros;
- o dourado deixa de dominar a interface;
- rosa e dourado aparecem somente nos botões das operações correspondentes.

### 2. Filtro de operação com dois botões

O select antigo de operação continua existindo por baixo para reaproveitar a
lógica já estável do ERP, mas fica oculto.

Na tela aparecem:

`Suplementos | Fitness`

Por padrão os dois vêm ativos.

Comportamento:
- ambos ativos = todas as operações;
- tocar em Suplementos quando ambos estão ativos deixa somente Fitness;
- tocar em Fitness quando ambos estão ativos deixa somente Suplementos;
- tocar na operação que está desativada volta a mostrar as duas;
- o sistema evita ficar com zero operações ativas.

Cores:
- Suplementos = dourado;
- Fitness = rosa;
- restante da página = Company.

### 3. Promoções deixam de aparecer "picadas"

A fonte pública entrega promoções por variação.

Exemplo antigo:
- Blusa de Tule · M · Azul Marinho
- Blusa de Tule · M · Branco
- Blusa de Tule · M · Preto

A V7 agrupa essas linhas visualmente por:

`campanha + produto`

Resultado:
- um card `Blusa de Tule`;
- preço promocional único ou faixa;
- opções em promoção dentro do card;
- soma das unidades disponíveis;
- contador do cabeçalho passa a representar produtos, não linhas/variações.

Não altera o banco nem a fonte de verdade. É somente apresentação.

### 4. Fotos também abrem em Promoções

O mesmo visualizador usado em Produtos passa a funcionar em cards agrupados de
Promoções.

A galeria usa a ficha real do produto.

### 5. Ícones/controles da foto refeitos

Foram removidas as bolinhas verticais que estavam herdando estilos globais e
ficavam estranhas no desktop/mobile.

Agora o card usa apenas:
- seta esquerda pequena;
- seta direita pequena;
- contador `1/3`;
- cor no topo;
- botão `Ver`.

Sem sobreposição com o selo de Promoção.

## Banco

Nenhuma alteração.

Não rodar SQL.

## Commit sugerido

`fix: refaz UX Company da vitrine e agrupa promoções`
