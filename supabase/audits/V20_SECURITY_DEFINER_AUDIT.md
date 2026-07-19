# V20 · Auditoria SECURITY DEFINER

## Resultado executivo

A auditoria percorreu as funções `SECURITY DEFINER` do schema `public` que são
executáveis por usuários autenticados.

### Funções mutadoras

Foi feita uma segunda varredura procurando funções que:

- executam INSERT / UPDATE / DELETE;
- são SECURITY DEFINER;
- podem ser chamadas por `authenticated`;
- não possuem checagem forte visível de autorização.

A única função encontrada foi:

`allocate_available_stock(uuid, uuid, text)`

Ela não é uma ação de usuário. É um helper interno de reserva automática de
estoque.

Chamadores confirmados:

- `register_inventory_adjustment(...)`
- `register_inventory_count(...)`
- `transfer_inventory(...)`

Os três chamadores:

- são SECURITY DEFINER;
- pertencem ao role `postgres`;
- continuam executáveis por `authenticated`;
- possuem controle de permissão antes da operação.

Por isso, o EXECUTE direto de `allocate_available_stock` foi removido para
`authenticated` e `anon`.

## Search path

Todas as funções SECURITY DEFINER do schema `public` possuem `search_path`
configurado explicitamente.

Resultado:

`0` funções SECURITY DEFINER sem `search_path` fixo.

## Funções públicas sem autenticação

A auditoria confirmou apenas uma função SECURITY DEFINER executável por `anon`:

`resolve_login_email(text)`

Ela é uma exceção consciente porque o fluxo atual de login aceita username.
O navegador precisa descobrir o e-mail da conta antes de chamar o Supabase
Auth.

Na V19 o EXECUTE para `authenticated` já foi removido.

Foi estudada a migração para um endpoint seguro que resolveria o username e
autenticaria sem expor o e-mail. A tentativa de publicar uma Edge Function que
manipulasse credenciais + service_role foi bloqueada pela camada de segurança
da ferramenta disponível nesta sessão. Por isso não foi forçada uma solução
insegura ou incompleta.

Até uma migração de login server-side ser feita, essa é a única exceção anon
SECURITY DEFINER aceita.

## Ownership

Todas as funções SECURITY DEFINER auditadas no schema `public` pertencem ao
role `postgres`.

## Interpretação dos avisos do Supabase Advisor

O Advisor marca funções SECURITY DEFINER executáveis por `authenticated`
mesmo quando a função é propositalmente a API de negócio do aplicativo.

O simples aviso não significa vulnerabilidade.

Para as RPCs operacionais foi verificada a presença de controles como:

- `can_write()`
- `can_write_fitness()`
- `can_write_bank()`
- `can_write_marketing()`
- `can_access_operation(...)`
- `can_manage_users()`
- `can_use_test_lab()`
- `central_can_write_scope(...)`
- `central_can_access_scope(...)`
- `current_partner_id()`
- `auth.uid()`

Não é recomendado revogar EXECUTE em massa dessas RPCs apenas para zerar o
Advisor, pois isso quebraria vendas, estoque, Bank, Fitness, Parceiros e
snapshots do aplicativo.

## Pendência manual conhecida

A proteção de senhas vazadas do Supabase Auth ainda precisa ser habilitada no
painel do Supabase.

## Áreas intencionalmente não alteradas

- `central-meta-webhook`
- `central-meta-send`
- configuração da Meta
- Test Lab
- dados históricos AppSheet / Fitness Archive
