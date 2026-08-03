# Hotfix · Vitrine Lightbox V6

Corrige o visualizador de imagens do `/catalogo`.

## Bug encontrado

O viewer sempre usava uma grade de três colunas:

`seta | imagem | seta`

Mesmo quando o produto tinha somente uma imagem.

Nesse caso não existiam as setas, mas a grade continuava com três colunas.
A imagem acabava ocupando a primeira coluna e sobrava uma enorme área branca
à direita — exatamente o comportamento visto no desktop e reproduzido no mobile.

## Correção

- uma imagem: grade de uma coluna, foto centralizada;
- várias imagens: `seta | imagem | seta`;
- fundo do viewer agora é escuro/neutro;
- somente a própria imagem mantém fundo branco;
- foto não é mais esticada para preencher largura;
- modal desktop menor e centralizado;
- footer mais discreto;
- chips de cores ficam em scroll horizontal quando necessário;
- mobile vira viewer fullscreen;
- `safe-area` para iPhone;
- imagem respeita altura/largura da tela sem deformar;
- botão fechar e setas maiores e mais previsíveis.

Sem banco.
Sem SQL.
Sem migration.

Commit sugerido:

`fix: refaz UX do visualizador de imagens da vitrine`
