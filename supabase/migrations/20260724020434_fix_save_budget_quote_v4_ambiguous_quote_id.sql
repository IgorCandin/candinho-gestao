do $$
declare
  v_definition text;
begin
  select pg_get_functiondef(p.oid)
  into v_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'save_budget_quote_v4'
  order by p.oid desc
  limit 1;

  if v_definition is null then
    raise exception 'Função save_budget_quote_v4 não encontrada';
  end if;

  v_definition := replace(
    v_definition,
    'delete from public.sales_quote_payment_installments
  where quote_id=v_quote_id;',
    'delete from public.sales_quote_payment_installments spi
  where spi.quote_id=v_quote_id;'
  );

  execute v_definition;
end
$$;
