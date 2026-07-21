# V38 · Fechamento da homologação do dia

## Escopo final
- UX definitivo da sidebar desktop.
- Rodapé da sidebar sempre visível.
- Conteúdo principal sem sobreposição.
- Reposição por curva comercial A/B/C/Z.
- Cards de estoque movidos de Produtos para Painel Gerencial.

## Regra de estoque
| Curva | Regra |
|---|---|
| A | Top de vendas. Alerta no mínimo e na ruptura. |
| B | Manter estoque. Alerta somente quando zerar. |
| C | Sob encomenda. Zero não é problema operacional. |
| Z | Alternativo/descontinuado/restrito. Zero não gera reposição. |

## Banco
Migration aplicada em produção:
`v38_fechamento_homologacao_curva_estoque_abcz`

Validação:
- C com `needs_replenishment=true`: 0
- Z com `needs_replenishment=true`: 0
- Foguete Não Tem Ré: alterado para Z
- Thermo One: já estava Z

## UX
A causa final da sobreposição era a combinação de:
- sidebar em grid;
- `.main` forçado a `width: 100%`;
- tentativa anterior de fazer a sidebar inteira rolar.

O fechamento:
- força `.main` na segunda coluna do grid;
- usa `width:auto`;
- devolve o scroll somente ao `.nav`;
- mantém `.sidebar-footer` fora da área rolável.
