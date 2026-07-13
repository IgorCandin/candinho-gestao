# Candinho Gestão

Primeira base do sistema próprio que substituirá o AppSheet da Candinho Suplementos.

## O que já existe nesta versão

- interface responsiva para celular e computador;
- login com Supabase Auth;
- dashboard operacional;
- produtos;
- estoque por local;
- vendas e leads;
- clientes;
- movimentações imutáveis de estoque;
- modo demonstração quando o banco ainda não foi conectado;
- banco com RLS, auditoria, transferências e estorno idempotente.

## Stack

- Next.js 16 + TypeScript;
- Supabase PostgreSQL, Auth e Storage;
- Vercel para o aplicativo;
- GitHub para versionamento e deploy automático;
- Render reservado para automações pesadas na fase seguinte.

## Rodar no computador

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

Sem preencher o `.env.local`, o sistema abre em modo demonstração.

## Criar o banco

1. Crie um projeto no Supabase.
2. Abra **SQL Editor**.
3. Execute `supabase/migrations/202607130001_initial_schema.sql`.
4. Execute `supabase/seed.sql`.
5. Em **Authentication > Users**, crie seu usuário.
6. No SQL Editor, torne-o administrador:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'SEU_EMAIL');
```

7. Copie a Project URL e a Publishable Key para `.env.local`.

## Publicar

1. Coloque esta pasta em um repositório privado do GitHub.
2. Importe o repositório na Vercel.
3. Cadastre as duas variáveis públicas do Supabase na Vercel.
4. Cada atualização enviada ao ramo principal publicará uma nova versão.

## Regras preservadas do AppSheet

- lead não baixa estoque;
- venda pode baixar estoque uma única vez;
- cancelamento estorna uma única vez;
- transferência registra saída e entrada;
- ajuste nunca apaga o histórico;
- origem e destino ficam explícitos;
- saldo negativo é bloqueado;
- operações críticas usam chave de idempotência.

Consulte `MIGRACAO_APPSHEET.md` para a sequência segura de importação.
