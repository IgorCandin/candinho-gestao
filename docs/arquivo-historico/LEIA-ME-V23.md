# Candinho Company · V23 — Bank RPC Migration

## Já aplicado no Supabase de produção

- 13 novas RPCs de escrita do Bank.
- Todas SECURITY DEFINER e com search_path fixo.
- Nenhuma executável por anon.
- Grants diretos das tabelas Bank ainda preservados nesta fase.

## Este pacote

Substitui as gravações diretas das 8 Server Actions do Bank por chamadas RPC.

O comportamento visual e os redirects permanecem iguais.

Também corrige a incompatibilidade:
- frontend: `annual`
- banco: `yearly`

## Depois do commit

Quando o deployment V23 estiver READY e os logs estiverem limpos, a próxima
etapa revoga INSERT / UPDATE / DELETE direto das tabelas Bank.

## Commit sugerido

`V23 · Migra escritas do Bank para RPCs seguras`
