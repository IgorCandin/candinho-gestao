# V20 · Auditoria SECURITY DEFINER

## Resultado

A auditoria percorreu as funções `SECURITY DEFINER` do schema `public`.

A única função mutadora executável diretamente por `authenticated` sem
checagem própria de autorização encontrada foi:

`allocate_available_stock(uuid, uuid, text)`

Ela é um helper interno chamado por fluxos de estoque protegidos:

- `register_inventory_adjustment(...)`
- `register_inventory_count(...)`
- `transfer_inventory(...)`

O `EXECUTE` direto foi removido de `authenticated` e `anon`.

Todas as funções `SECURITY DEFINER` auditadas possuem `search_path`
explicitamente configurado.

A única função `SECURITY DEFINER` que permanece executável por `anon` é
`resolve_login_email(text)`, necessária temporariamente para o login por
username.

Não foi feito revoke em massa das RPCs de negócio, porque elas são a API
legítima do aplicativo e possuem controles internos de autorização.
