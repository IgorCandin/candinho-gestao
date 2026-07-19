-- Candinho Company V18
-- Já aplicada diretamente no Supabase de produção.
--
-- O runtime do app não precisa criar triggers, criar foreign keys ou truncar
-- tabelas/views. Esses privilégios antigos estavam concedidos em massa a
-- anon/authenticated e aumentavam a superfície de risco.
--
-- Não altera SELECT / INSERT / UPDATE / DELETE necessários ao funcionamento.
-- Não altera service_role.
-- Não altera Edge Functions Meta.

do $$
declare
  r record;
begin
  for r in
    select quote_ident(table_schema) || '.' || quote_ident(table_name) as fqtn
    from information_schema.tables
    where table_schema = 'public'
  loop
    begin
      execute
        'revoke truncate, trigger, references on table '
        || r.fqtn
        || ' from anon, authenticated';
    exception
      when others then
        null;
    end;
  end loop;
end $$;
