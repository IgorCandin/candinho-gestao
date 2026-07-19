# Candinho Company · V21 — Grants & Storage Hardening

## Já aplicado em produção

### V20 incluída neste pacote
- restrição do helper interno `allocate_available_stock`;
- documentação das exceções SECURITY DEFINER.

### V21
- auditoria dos grants de `anon` e `authenticated`;
- auditoria dos buckets e policies de Storage;
- confirmação de que `central-media` é privado e protegido por escopo;
- confirmação de que `product-images` é público somente para exibição;
- remoção de INSERT/UPDATE/DELETE direto do role `authenticated` em 11 tabelas Fitness;
- remoção de INSERT/UPDATE/DELETE direto do role `authenticated` em 11 tabelas Test Lab;
- validação de que SELECT continua disponível;
- validação de que as RPCs SECURITY DEFINER continuam executáveis.

## Importante

Este pacote é cumulativo porque a V20 ainda não aparecia no histórico recente
do GitHub no momento da auditoria.

Extraia sobre a raiz do repositório.

## Commit sugerido

`V21 · Restringe escrita direta Fitness/Test Lab e audita Storage`
