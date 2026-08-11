# Gallery — 3 níveis corretos

Este pacote substitui a lógica anterior de 5 níveis.

## No telefone

- 1/3 = 1 produto por linha, card grande
- 2/3 = 2 produtos por linha
- 3/3 = 4 produtos por linha, em modo miniatura

## O que foi corrigido

- texto não fica mais sobre a imagem;
- nome não é cortado nos níveis 1 e 2;
- imagem usa `object-fit: contain`;
- promoção não estoura o card;
- preço normal e promocional não ficam colados;
- nível 3 é propositalmente compacto: imagem + nome + preço;
- badge de promoção vira apenas ícone no nível 3;
- o botão "Completo" vira "Miniaturas" e fica desabilitado no 3/3,
  porque não é possível mostrar todos os dados com qualidade em quatro cards por linha;
- o controle agora é realmente 1/3, 2/3 e 3/3.

## Aplicação

Extrair na raiz do projeto -> substituir -> GitHub Desktop -> Commit -> Push origin

Commit sugerido:

`fix: refaz gallery mobile com 3 niveis reais de zoom`

Não há SQL nem alteração no Supabase.
