# Hotfix V37.1 · Typecheck Parceiros

Corrige o build da V37 em:

`src/lib/partner-legacy-history.ts`

Erro da Vercel:

`Parameter 'row' implicitly has an 'any' type.`

Correção:

o item retornado pela RPC `partner_legacy_history_snapshot` agora recebe tipagem explícita `Record<string, unknown>` antes da normalização dos campos.

Nenhuma migration, dado, Edge Function, Meta ou Marketing é alterado.

Commit sugerido:

`V37.1 · Corrige typecheck do histórico de parceiros`
