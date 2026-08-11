# Hotfix global — espaçamento dos cards / stats-grid

## Causa

A classe base `.stats-grid` tinha `grid-template-columns`, mas não tinha:

- `display: grid`
- `gap`

Por isso, páginas que usam `<section className="stats-grid">` podiam exibir os cards como blocos empilhados e quase colados.

## Onde a correção se aplica

A correção é global e cobre todas as telas que usam `.stats-grid`, inclusive os modificadores já existentes no sistema, como:

- painel geral da Candinho Fitness
- CRM (`crm-stats-grid`)
- clientes (`customer-stats-grid`)
- fornecedores/pedidos (`supplier-stats-grid`)
- produtos (`product-stats-grid`)
- pedidos pendentes (`pending-stats-grid`)
- Painel CS (`panel-cs-stats`)

Não foi necessário alterar página por página.

## Comportamento

Desktop:
- 4 colunas quando a tela comportar
- 18 px de espaço entre os cards

Responsividade já existente continua valendo:
- até 1080 px: 2 colunas
- até 560 px: 1 coluna
- no mobile, gap reduzido para 12 px

Na Fitness, também foi colocado espaço entre o bloco principal de indicadores e os atalhos abaixo.

## Aplicação

Extrair na raiz de `candinho-gestao`, substituir o arquivo e fazer:

GitHub Desktop → Commit → Push origin

Commit sugerido:

`fix: restaura grid e espaçamento dos cards de resumo`

Sem migration e sem alteração no banco.
