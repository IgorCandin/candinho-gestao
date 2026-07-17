# Sincronização de produção — 17/07/2026

O Supabase de produção possui migrações do Candinho Central, Portal Parceiro, Estoque V2, contratos de UI e governança aplicadas após a série histórica originalmente presente neste repositório.

Neste pacote foram adicionados ao código-fonte os artefatos novos diretamente relacionados à etapa atual:

- `supabase/functions/central-integration-readiness/index.ts`
- `supabase/migrations/20260717171801_auto_configure_generic_partner_logins.sql`

A função `central-integration-readiness` já está publicada no projeto de produção e exige JWT de administrador/gestor.

Os demais objetos do Candinho Central já estão ativos no Supabase de produção. Não reaplique migrações antigas manualmente sobre produção sem conferir o histórico de `supabase_migrations.schema_migrations`, para evitar duplicação de objetos já existentes.
