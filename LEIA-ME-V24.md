# Candinho Company · V24 — Bank Write Closure

## Já aplicado em produção

- V23 confirmado READY na Vercel.
- Quatro RPCs Bank antigas convertidas para SECURITY DEFINER.
- `bank_mark_charge_paid` corrigida para exigir permissão de escrita.
- INSERT / UPDATE / DELETE direto revogado em 12 tabelas Bank.
- SELECT preservado.
- 0 funções `bank_*` mutadoras restantes como SECURITY INVOKER.

## Alteração de frontend

Nenhuma.

A V23 já havia migrado o frontend para as RPCs seguras.

Este pacote sincroniza no GitHub a migration V24 e o relatório da auditoria.

## Commit sugerido

`V24 · Fecha escrita direta do Bank e endurece RPCs antigas`
