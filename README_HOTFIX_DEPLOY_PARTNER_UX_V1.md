# Hotfix Deploy Partner UX V1

Corrige o TypeScript do deploy `dpl_qPDLa2CaKw7ggtZbES4MrQtzQLmY`.

Erro da Vercel:

`src/components/partner-ux-overlay.tsx:167:11`
`Type error: 'head' is possibly 'null'.`

## Causa

O botão original era buscado com optional chaining em `head`, mas o TypeScript
não usa a existência de `original` para provar que `head` também é não-nulo.

## Correção

O bloco agora só executa com `if (original && head)` e, dentro dele, `head`
fica corretamente refinado como `HTMLElement`.

Sem SQL.
Sem migration.
Sem alteração de regra da parceria ou da recompensa.

Commit sugerido:

`fix: corrige null check do overlay de parceiros`
