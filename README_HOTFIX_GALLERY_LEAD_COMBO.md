# Hotfix — Galeria mobile + Combo em Novo Lead

## 1. Galeria de produtos no telefone

Corrigido:
- miniatura/imagem de produto cortada;
- cards em promoção estourando a largura;
- preço normal e preço promocional colados;
- texto da promoção escapando do card;
- nome do produto cortado;
- zoom 1/5, 2/5 e 3/5 com praticamente o mesmo tamanho.

### Zoom no telefone

Em telefones de aproximadamente 400 px:
- 1/5 = 2 cards por linha;
- 2/5 = card pequeno individual;
- 3/5 = card médio;
- 4/5 = card grande;
- 5/5 = largura total.

Assim cada posição do controle gera mudança visual real.

A imagem usa `object-fit: contain`, então a embalagem deve aparecer inteira.

## 2. Novo Lead aceita Combo

A tela **Novo Lead** agora possui:

Tipo de interesse:
- Produto individual
- Combo

Ao selecionar Combo:
- carrega combos ativos;
- mostra o preço;
- mostra os produtos do combo;
- permite escolher sabor por produto quando existir;
- permite deixar sabor em aberto.

O lead é criado já com `lead_combo_id`, e os componentes são registrados em `sale_items`.
Depois, o fluxo já existente de **Converter em venda** preserva o combo no orçamento.

## Banco

A função `create_lead_interest_v3` deste pacote já foi aplicada no Supabase de produção.

Não execute SQL manualmente.

## Aplicação

Extrair na raiz -> substituir -> GitHub Desktop -> Commit -> Push origin

Commit sugerido:

`fix: corrige galeria mobile e adiciona combo no novo lead`
