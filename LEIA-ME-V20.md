# Candinho Company · V20 — SECURITY DEFINER Hardening

## Já executado em produção

- Auditoria de todas as funções SECURITY DEFINER executáveis pelo aplicativo.
- Auditoria específica das funções que alteram dados.
- Restrição da função interna `allocate_available_stock`.
- Confirmação de que os três fluxos legítimos que usam o alocador continuam
  SECURITY DEFINER, owner postgres e executáveis pelo app.
- Confirmação de 0 funções SECURITY DEFINER sem search_path fixado.
- Confirmação de que somente `resolve_login_email` permanece executável por
  `anon`, por necessidade temporária do login por username.
- Decisão documentada de não revogar RPCs legítimas apenas para zerar falsos
  positivos do Advisor.

## Não há alteração de frontend nesta versão

Este pacote serve para sincronizar no GitHub as migrations já aplicadas no
Supabase e manter o histórico técnico da auditoria.

## Commit sugerido

`V20 · Endurece SECURITY DEFINER e restringe helper interno de estoque`
