# Candinho Company · V19 — Performance + RLS

## Já aplicado no Supabase de produção

### 1. Policies duplicadas corrigidas

A origem do aviso "Multiple Permissive Policies" era estrutural:

- policy `*_read` = SELECT
- policy `*_write` = ALL

Como `ALL` também participa de SELECT, o Postgres avaliava duas policies em
cada leitura.

A V19 separa `*_write` em:

- `*_insert`
- `*_update`
- `*_delete`

As funções de permissão continuam as mesmas.

Foi confirmado após a alteração:

`0 tabelas com múltiplas policies aplicáveis a SELECT`

### 2. Checagens RLS otimizadas

Funções constantes por requisição, como:

- `can_access_operation(...)`
- `can_write()`
- `can_write_fitness()`
- `can_manage_users()`

passaram a ser usadas por subselect nas policies, permitindo avaliação como
initPlan em vez de repetição potencial por linha.

### 3. Índices adicionados com critério

Foram adicionados apenas índices de foreign keys ligados a fluxos ativos:

- recebimento Fitness por item de pedido
- fornecedor padrão de variante Fitness
- tarefa operacional vinculada a pedido
- destino de pedido de fornecedor
- vínculo de recebimento com movimento de estoque
- produto-brinde de venda
- produto de item de orçamento
- brinde/local/parceiro de orçamento
- local de reserva de estoque

Não foram criados índices em massa para todas as colunas `created_by`, pois
isso aumentaria escrita e armazenamento sem evidência de ganho real.

### 4. Login por username revisado

Existem duas implementações de `LoginForm` no repositório, mas a rota oficial
`/login` usa `@/components/login-form`.

A cópia em `src/app/login/login-form.tsx` foi reduzida a um re-export, evitando
manter duas lógicas de login diferentes.

A RPC `resolve_login_email` continua executável por `anon` porque o login atual
precisa resolver o username antes de existir uma sessão.

O acesso por `authenticated` foi revogado, pois depois do login essa resolução
não é necessária.

Remover também o acesso `anon` exige migrar o login por username para um
endpoint seguro no servidor. Isso foi propositalmente deixado para uma etapa
separada para não correr risco de bloquear o acesso ao sistema.

### 5. Validação

Após as alterações diretas de banco:

- Vercel: nenhum erro de runtime detectado nos últimos 30 minutos.
- Regras de leitura continuam separadas das regras de escrita.
- `can_write()` exige acesso a Suplementos.
- `can_write_fitness()` exige acesso a Fitness.

## Pendente manual

Ativar no Supabase Auth:

`Leaked Password Protection`

Documentação:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Commit sugerido

`V19 · Otimiza RLS, índices e consolida login`
