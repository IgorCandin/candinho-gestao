begin;

-- Juliana: preserva o cadastro com histórico comercial e move o vínculo
-- de parceria criado junto do cadastro repetido.
update public.customer_partner_affiliations
set customer_id = '2ca807c8-2d82-4883-afed-2aae1d9c71a4'::uuid
where customer_id = 'cddcee96-96fe-4bdd-a01e-53c81bd9394f'::uuid;

-- Remove apenas cópias exatas sem vendas/orçamentos próprios.
delete from public.customers
where id in (
  '32b396a0-a257-459c-a364-c6f056886c57'::uuid,
  'cddcee96-96fe-4bdd-a01e-53c81bd9394f'::uuid
);

-- Evita nova duplicação exata, sem impedir familiares que compartilham telefone.
create unique index if not exists customers_normalized_phone_name_unique
on public.customers (
  regexp_replace(coalesce(phone, ''), '\D', '', 'g'),
  lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
)
where nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') is not null;

commit;
