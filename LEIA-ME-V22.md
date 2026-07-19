# Candinho Company · V22 — Supplements Write Hardening

## Já aplicado em produção

- Removido INSERT/UPDATE/DELETE direto de authenticated em 14 tabelas críticas
  de Suplementos.
- SELECT direto mantido.
- RPCs de negócio continuam disponíveis.
- dashboard_priority_preferences preservada porque o frontend ainda usa UPSERT.
- Bank auditado, sem alteração de grants nesta versão.

## Próxima versão

V23 — Bank RPC Migration

Objetivo:

1. criar RPCs para as gravações diretas atuais;
2. trocar os Server Actions para usar as RPCs;
3. publicar e validar;
4. fechar os grants diretos do Bank somente depois.

## Commit sugerido

`V22 · Restringe escrita direta em Suplementos e audita Bank`
