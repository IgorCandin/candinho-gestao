-- A tabela foi criada após a mudança de exposição automática da Data API.
-- Mantém RLS ativa; somente usuários autenticados passam pelas políticas já definidas.
grant select, insert, update, delete on table public.migration_audit_checks to authenticated;
