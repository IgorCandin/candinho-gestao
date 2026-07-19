# Candinho Company · V18 — Faxina técnica e hardening de privilégios

## Já executado em produção

### 1. RPCs V1 mortas removidas

Foram removidas do banco:

- `get_my_access()`
- `list_user_permissions()`
- as duas versões antigas de `update_user_permissions(...)`
- `central_media_search(text,text,integer)`
- `save_fitness_product(...)`

Antes da remoção foi confirmado que:

- o frontend atual usa `get_my_access_v2`;
- o frontend atual usa `list_user_permissions_v2`;
- o frontend atual usa `update_user_permissions_v2`;
- a biblioteca de mídia usa `central_media_search_v2`;
- a Fitness usa `save_fitness_product_v2`.

### Funções antigas preservadas de propósito

- `create_fitness_sale(...)`
- `create_fitness_purchase_order(...)`

Elas parecem V1, mas as funções V2 ainda chamam essas duas internamente.
Removê-las quebraria vendas e pedidos da Fitness.

## 2. Privilégios perigosos antigos removidos

Foi identificado que `anon` e `authenticated` ainda tinham, em dezenas de
relações do schema `public`, privilégios de:

- `TRUNCATE`
- `TRIGGER`
- `REFERENCES`

Esses privilégios não são necessários para o runtime normal da aplicação.

A V18 revoga esses três privilégios para `anon` e `authenticated`, mantendo
intactos os privilégios de negócio necessários e o `service_role`.

Após a aplicação, a auditoria confirmou:

- 0 relações `public` com `TRUNCATE` concedido a anon/authenticated;
- 0 relações `public` com `TRIGGER` concedido a anon/authenticated;
- 0 relações `public` com `REFERENCES` concedido a anon/authenticated.

## 3. Test Lab foi mantido

O Test Lab não foi tratado como lixo.

Foi confirmado que:

- a rota é restrita a `canManageUsers`;
- as RPCs chamam internamente `can_use_test_lab()`;
- `can_use_test_lab()` exige perfil ativo com `can_manage_users`;
- as tabelas possuem RLS usando essa mesma checagem;
- os dados são isolados da operação real.

Portanto, ele continua sendo um ambiente legítimo de teste.

## 4. AppSheet / Fitness Archive

Os schemas históricos foram mantidos nesta etapa.

Motivo:

- `appsheet_import` está isolado e acessível ao `service_role`;
- o endpoint antigo de importação já foi encerrado;
- `fitness_archive` é uma cópia histórica pequena;
- remover agora traria pouco ganho e destruiria rastreabilidade da migração.

O bloco antigo do AppSheet ocupa aproximadamente 9–10 MB, principalmente dados
de preparação e preimages. Ele pode ser exportado e removido no futuro como
uma operação separada de arquivamento.

## Próxima rodada sugerida

V19:
- corrigir políticas RLS duplicadas (`read` + `write` permissivas para SELECT);
- adicionar índices de foreign keys realmente úteis em rotas de alto tráfego;
- revisar `resolve_login_email`, mantendo o login por usuário sem abrir
  enumeração desnecessária;
- avaliar a proteção de senhas vazadas no painel do Supabase Auth.

## Commit sugerido

`V18 · Remove RPCs legadas e endurece privilégios do banco`
