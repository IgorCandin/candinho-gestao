# Ajuste de UX — ações da tela de Orçamentos

## Problema
A coluna de ações usava o mesmo ícone de documento para:
- abrir o PDF;
- entrar no orçamento.

Visualmente não dava para saber qual botão fazia o quê.

## Novo padrão
- Olho (`Eye`) = abrir o orçamento no sistema.
- Sacola (`ShoppingBag`) = abrir a venda quando o orçamento já foi convertido.
- Documento com seta (`FileDown`) = abrir o PDF.

Também foram adicionados `title` e `aria-label` específicos em cada ação.

A linha inteira continua clicável para entrar no orçamento.

## Aplicação
Extraia o ZIP na raiz de `candinho-gestao`, substitua o arquivo e faça:

GitHub Desktop → Commit → Push origin

Commit sugerido:

`fix: diferencia ações de abrir orçamento e PDF`
