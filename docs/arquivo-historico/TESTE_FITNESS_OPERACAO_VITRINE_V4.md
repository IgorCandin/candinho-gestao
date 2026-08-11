# Teste · Fitness Operação + Vitrine V4

## 1. Clientes compartilhados

### Venda
1. Abra `/fitness/vendas/nova`.
2. Digite o nome de um cliente conhecido de Suplementos.
3. Ele deve aparecer com badge `Candinho`.
4. Selecione.
5. Nome/telefone/cidade devem preencher.
6. Faça uma venda teste.
7. Volte à Fitness: agora a pessoa deve ter histórico Fitness.

### Anti-duplicação
1. Procure pelo telefone de um cliente já existente.
2. Não crie outro cadastro manualmente.
3. Depois da venda, confirme que existe uma única pessoa na identidade Company.

### Orçamento / prova
Repita a busca em:
- `/fitness/orcamentos/novo`
- `/fitness/consignacoes/nova`

## 2. Editor de produto

1. Abra `/fitness/produtos/[id]/editar`.
2. Confirme categoria com autocomplete.
3. Confirme um único fornecedor.
4. Cadastre:
   - Preto;
   - Azul;
   - Marrom.
5. Envie uma foto diferente em cada cor.
6. Preto deve aparecer primeiro na área de fotos.
7. Salve e reabra.

## 3. Galeria interna

1. Abra `/fitness/produtos/[id]`.
2. Preto deve ser o primeiro slide se tiver foto.
3. Navegue por todas as cores.
4. Uma cor zerada deve CONTINUAR visível internamente.
5. Toque na foto e teste o modo ampliado.

## 4. Vitrine

1. Abra `/catalogo`.
2. Ache um produto Fitness com mais de uma cor.
3. Use as setas.
4. Toque na foto para ampliar.
5. Confira a descrição/observação no card.
6. Zere uma cor em ambiente de teste ou confira uma já zerada.
7. A cor zerada NÃO deve aparecer no slide público.
8. Se Preto estiver disponível, deve ser o primeiro slide.

## 5. Foto com modelo

1. Abra `Editar produto`.
2. Escolha uma foto de uma cor.
3. Escolha `Aleatório`.
4. Gere.
5. A foto deve aparecer na seção `Fotos geradas`.
6. Confira:
   - roupa fiel;
   - cor;
   - mãos;
   - pele;
   - tecido;
   - proporções.
7. Confirme que ela NÃO apareceu automaticamente no `/catalogo`.
8. Clique `Publicar na vitrine`.
9. Reabra `/catalogo`.
10. A foto deve aparecer como slide extra.
11. Clique `Remover da vitrine` e confira que some da vitrine.

Se aparecer erro de chave/cota, revisar `OPENAI_API_KEY` e disponibilidade de
`gpt-image-2` na conta de API.

## 6. Conjunto divisível

Use um conjunto real com estoque.

1. Abra a ficha do Conjunto.
2. Em `Conjunto divisível`, informe por exemplo:
   - Top: R$ 39,90
   - Calça: R$ 49,90
3. Clique `Preparar venda separada`.
4. Confirme que o estoque do conjunto NÃO mudou.
5. Selecione uma variação com 1 unidade disponível.
6. Clique `Separar`.
7. Confira:
   - Conjunto -1;
   - Top +1;
   - Calça +1.
8. Abra `/fitness/estoque`.
9. Top e Calça devem aparecer como peças vendáveis.
10. Faça uma venda avulsa de uma das partes.

## 7. Mobile Giulia

No celular:
- Início;
- Produtos;
- Editar Produto;
- Nova venda;
- Clientes;
- Estoque.

Confirme:
- textos confortáveis;
- sem zoom automático ao tocar em input;
- botões fáceis de tocar;
- busca de cliente boa;
- carrossel de fotos navegável;
- nenhuma largura estourando.
