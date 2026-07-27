# Hotfix — política de estoque “Sob encomenda”

## O que este pacote faz

- Categoria **Restrito** passa a usar `sales_category = Z`.
- Produtos específicos definidos como sob encomenda passam a `sales_category = C`.
- Produtos C e Z já ficam fora do alerta automático de reposição nas regras de estoque existentes.
- Na tela **Produtos**, quando zerados e sem pedido a caminho:
  - C → `Sob encomenda` em amarelo/dourado.
  - Z/Restrito → `Sob encomenda` em cinza.
  - A/B → continuam `Sem estoque` em vermelho.
- Produto C/Z com estoque continua aparecendo normalmente como disponível.
- Produto C/Z com mercadoria a caminho continua aparecendo como `A caminho`.

## Produtos marcados C pelo pacote

- Colágeno
- Ashwagandha isolada
- Moringa
- Kit Whey Protein
- Pholia Magra
- Cafeína Pure Energy
- Feno-Grego
- Creatina CreaGummy
- Creatina Health Labs
- Uxi
- Testo Dilated Red
- Testo Dilated Blue (a regra fica pronta mesmo que o cadastro ainda não exista)

## Aplicação

A migration já foi aplicada no Supabase de produção em 27/07/2026.  
O arquivo SQL está incluído somente para manter o repositório sincronizado.

Depois de extrair este ZIP na raiz de `candinho-gestao`, rode:

```bash
node scripts/apply-order-stock-policy-hotfix.mjs
```

Depois:

```bash
npm run build
```

Se estiver tudo certo, faça o commit.

Commit sugerido:

```text
feat: trata produtos sob encomenda sem alerta de reposição
```

## Teste rápido

1. Abra Produtos.
2. Confira um Restrito zerado: cinza + `Sob encomenda`.
3. Confira CreaGummy zerada: amarelo/dourado + `Sob encomenda`.
4. Confira Testo Dilated Red zerada: amarelo/dourado + `Sob encomenda`.
5. Confira produto A/B zerado: vermelho + `Sem estoque`.
6. Confira que C/Z zerados não aparecem como produtos que exigem reposição.
