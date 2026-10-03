-- Fecha as duas politicas de escrita "always true" confirmadas pelo Advisor.
-- Mantem os fluxos atuais, mas replica no banco as permissoes ja exigidas pelas
-- rotas HTTP e impede alteracao direta de colunas de autoria/auditoria.

begin;

-- ---------------------------------------------------------------------------
-- Relatos do Nexus UX Doctor
-- ---------------------------------------------------------------------------

drop policy if exists ux_issue_reports_authenticated_select
on public.ux_issue_reports;

create policy ux_issue_reports_authenticated_select
on public.ux_issue_reports for select
to authenticated
using (
  reporter_user_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.active
      and p.role <> 'partner'::public.app_role
  )
);

drop policy if exists ux_issue_reports_authenticated_insert
on public.ux_issue_reports;

create policy ux_issue_reports_authenticated_insert
on public.ux_issue_reports for insert
to authenticated
with check (
  reporter_user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.active
  )
);

drop policy if exists ux_issue_reports_authenticated_update
on public.ux_issue_reports;

create policy ux_issue_reports_authenticated_update
on public.ux_issue_reports for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.active
      and (
        p.role <> 'partner'::public.app_role
        or ux_issue_reports.reporter_user_id = (select auth.uid())
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.active
      and (
        p.role <> 'partner'::public.app_role
        or ux_issue_reports.reporter_user_id = (select auth.uid())
      )
  )
);

revoke insert, update on public.ux_issue_reports from authenticated;

grant insert (
  category,
  severity,
  description,
  route,
  previous_route,
  viewport_class,
  screen_width,
  screen_height,
  device_pixel_ratio,
  user_agent,
  session_id,
  recent_actions,
  client_context,
  error_message,
  fingerprint
) on public.ux_issue_reports to authenticated;

grant update (status, resolution_notes)
on public.ux_issue_reports to authenticated;

-- ---------------------------------------------------------------------------
-- Revisoes de vinculo entre cliente e parceiro
-- ---------------------------------------------------------------------------

drop policy if exists customer_partner_link_reviews_authenticated_select
on public.customer_partner_link_reviews;

create policy customer_partner_link_reviews_authenticated_select
on public.customer_partner_link_reviews for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.active
      and (p.role = 'admin'::public.app_role or p.can_write_supplements)
  )
);

drop policy if exists customer_partner_link_reviews_authenticated_insert
on public.customer_partner_link_reviews;

create policy customer_partner_link_reviews_authenticated_insert
on public.customer_partner_link_reviews for insert
to authenticated
with check (
  reviewed_by = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.active
      and (p.role = 'admin'::public.app_role or p.can_write_supplements)
  )
);

drop policy if exists customer_partner_link_reviews_authenticated_update
on public.customer_partner_link_reviews;

create policy customer_partner_link_reviews_authenticated_update
on public.customer_partner_link_reviews for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.active
      and (p.role = 'admin'::public.app_role or p.can_write_supplements)
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.active
      and (p.role = 'admin'::public.app_role or p.can_write_supplements)
  )
);

revoke insert, update
on public.customer_partner_link_reviews
from authenticated;

grant insert (customer_id, partner_id, review_status, notes, snoozed_until)
on public.customer_partner_link_reviews
to authenticated;

grant update (review_status, notes, snoozed_until)
on public.customer_partner_link_reviews
to authenticated;

-- A role nao deve conservar UPDATE/INSERT irrestrito em nenhuma das tabelas.
do $verification$
begin
  if has_table_privilege(
    'authenticated',
    'public.ux_issue_reports',
    'UPDATE'
  ) or has_table_privilege(
    'authenticated',
    'public.ux_issue_reports',
    'INSERT'
  ) then
    raise exception 'ux_issue_reports ainda possui escrita irrestrita por tabela';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.customer_partner_link_reviews',
    'UPDATE'
  ) or has_table_privilege(
    'authenticated',
    'public.customer_partner_link_reviews',
    'INSERT'
  ) then
    raise exception 'customer_partner_link_reviews ainda possui escrita irrestrita por tabela';
  end if;

  if not has_column_privilege(
    'authenticated',
    'public.ux_issue_reports',
    'status',
    'UPDATE'
  ) or not has_column_privilege(
    'authenticated',
    'public.customer_partner_link_reviews',
    'review_status',
    'UPDATE'
  ) then
    raise exception 'Permissoes minimas dos fluxos foram removidas';
  end if;
end
$verification$;

commit;
