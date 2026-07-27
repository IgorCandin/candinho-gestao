# Hotfix global — textos e números colados nos cards

## Causa identificada

Algumas páginas usam `.stat-card` diretamente desta forma:

- `<span>Rótulo</span>`
- `<strong>Valor</strong>`
- `<small>Observação</small>`

`span`, `strong` e `small` são elementos inline por padrão. Por isso apareciam casos como:

`Disponível30 reservado(s)`
`A caminho0Reposições pendentes`
`Variações3 3 pedindo atenção`

O componente padrão `StatCard` já usa blocos próprios e não tinha esse problema.

## Correção

Foi criada uma correção CSS global para qualquer `.stat-card` manual do sistema:

Rótulo
VALOR
Observação

Também foi reforçado o mesmo comportamento nos `fitness-summary-card`.

Assim não precisamos corrigir página por página: qualquer tela atual ou futura que use esse padrão herda o espaçamento automaticamente.

## Aplicação

Extraia o ZIP na raiz de `candinho-gestao`, substitua os arquivos e faça apenas:

GitHub Desktop → Commit → Push origin

Commit sugerido:

`fix: corrige textos e valores colados nos cards`

Não há migration nem alteração no banco.
