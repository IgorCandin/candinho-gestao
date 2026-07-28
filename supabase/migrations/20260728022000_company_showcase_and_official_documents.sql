begin;

create table if not exists public.central_company_profile_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  eyebrow text,
  title text not null,
  body text not null,
  bullets jsonb not null default '[]'::jsonb,
  source_label text,
  sort_order integer not null default 0,
  active boolean not null default true,
  public_safe boolean not null default true,
  verification_status text not null default 'seeded'
    check (verification_status in ('seeded','verified','nexus_review')),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(bullets) = 'array')
);

comment on table public.central_company_profile_sections is
'Conteúdo institucional público e seguro usado na apresentação da Candinho Suplementos.';

alter table public.central_company_profile_sections enable row level security;

drop policy if exists "company_profile_public_read" on public.central_company_profile_sections;
create policy "company_profile_public_read"
on public.central_company_profile_sections
for select
to anon, authenticated
using (active = true and public_safe = true);

drop policy if exists "company_profile_admin_read" on public.central_company_profile_sections;
create policy "company_profile_admin_read"
on public.central_company_profile_sections
for select
to authenticated
using (
  public.can_manage_users()
  or public.current_user_role() = 'admin'
);

drop policy if exists "company_profile_admin_write" on public.central_company_profile_sections;
create policy "company_profile_admin_write"
on public.central_company_profile_sections
for all
to authenticated
using (
  public.can_manage_users()
  or public.current_user_role() = 'admin'
)
with check (
  public.can_manage_users()
  or public.current_user_role() = 'admin'
);

create table if not exists public.central_company_profile_updates (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  original_filename text not null,
  mime_type text,
  status text not null default 'processing'
    check (status in ('processing','applied','error')),
  extracted_payload jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  applied_sections integer not null default 0
    check (applied_sections >= 0),
  ignored_sensitive jsonb not null default '[]'::jsonb,
  error_message text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  check (jsonb_typeof(ignored_sensitive) = 'array')
);

comment on table public.central_company_profile_updates is
'Histórico privado de arquivos analisados pelo Nexus para atualizar a apresentação institucional.';

alter table public.central_company_profile_updates enable row level security;

drop policy if exists "company_profile_updates_admin" on public.central_company_profile_updates;
create policy "company_profile_updates_admin"
on public.central_company_profile_updates
for all
to authenticated
using (
  public.can_manage_users()
  or public.current_user_role() = 'admin'
)
with check (
  public.can_manage_users()
  or public.current_user_role() = 'admin'
);

create table if not exists public.central_official_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  category text not null default 'other'
    check (category in (
      'route',
      'company',
      'tax',
      'sanitary',
      'vehicle',
      'personal',
      'supplier',
      'other'
    )),
  original_filename text not null,
  mime_type text,
  storage_path text not null unique,
  document_date date,
  expires_on date,
  route_required boolean not null default false,
  notes text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.central_official_documents is
'Cofre privado de documentos oficiais em PDF. route_required prepara integração futura com Rotas.';

create index if not exists central_official_documents_route_idx
  on public.central_official_documents(route_required, active);

create index if not exists central_official_documents_expiry_idx
  on public.central_official_documents(expires_on)
  where active = true;

alter table public.central_official_documents enable row level security;

drop policy if exists "official_documents_admin" on public.central_official_documents;
create policy "official_documents_admin"
on public.central_official_documents
for all
to authenticated
using (
  public.can_manage_users()
  or public.current_user_role() = 'admin'
)
with check (
  public.can_manage_users()
  or public.current_user_role() = 'admin'
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'central-company-files',
  'central-company-files',
  false,
  20971520,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "central_company_files_read" on storage.objects;
create policy "central_company_files_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'central-company-files'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and (
        p.role = 'admin'
        or p.can_manage_users = true
      )
  )
);

drop policy if exists "central_company_files_insert" on storage.objects;
create policy "central_company_files_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'central-company-files'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and (
        p.role = 'admin'
        or p.can_manage_users = true
      )
  )
);

drop policy if exists "central_company_files_update" on storage.objects;
create policy "central_company_files_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'central-company-files'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and (
        p.role = 'admin'
        or p.can_manage_users = true
      )
  )
)
with check (
  bucket_id = 'central-company-files'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and (
        p.role = 'admin'
        or p.can_manage_users = true
      )
  )
);

drop policy if exists "central_company_files_delete" on storage.objects;
create policy "central_company_files_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'central-company-files'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and (
        p.role = 'admin'
        or p.can_manage_users = true
      )
  )
);

insert into public.central_company_profile_sections (
  section_key,
  eyebrow,
  title,
  body,
  bullets,
  source_label,
  sort_order,
  verification_status
)
values
(
  'identidade',
  'Candinho Suplementos',
  'Suplementação próxima, simples e bem explicada.',
  'A Candinho Suplementos é uma operação com origem em Caparaó, Minas Gerais, estruturada em 2026 para aproximar atendimento, informação e organização da compra de suplementos.',
  '["Origem local", "Atendimento próximo", "Informação clara"]'::jsonb,
  'Pesquisa pública inicial · revisar com documentos oficiais',
  10,
  'seeded'
),
(
  'proposito',
  'Por que existe',
  'Ajudar a pessoa a comprar entendendo o que está levando.',
  'A proposta é tornar a compra mais simples e humana: ouvir a necessidade, explicar as opções com clareza e manter o relacionamento depois da venda.',
  '["Explicação antes da venda", "Escolha prática", "Relacionamento depois da compra"]'::jsonb,
  'Base institucional inicial',
  20,
  'seeded'
),
(
  'como_trabalhamos',
  'Como funciona',
  'Atendimento e operação no mesmo sistema.',
  'A rotina reúne consulta de produtos, organização de estoque, pedidos, retirada ou entrega e acompanhamento pós-venda, com tecnologia própria apoiando o trabalho do dia a dia.',
  '["Catálogo organizado", "Controle operacional", "Acompanhamento pós-venda", "Tecnologia própria"]'::jsonb,
  'Estrutura operacional do sistema',
  30,
  'seeded'
),
(
  'presenca',
  'Presença',
  'Raiz regional com atendimento presencial e digital.',
  'A marca nasceu no Caparaó e cresce a partir de relacionamento local, atendimento direto e canais digitais, sem perder a proximidade com quem compra.',
  '["Caparaó · MG", "Relacionamento local", "Atendimento digital"]'::jsonb,
  'Pesquisa pública inicial',
  40,
  'seeded'
),
(
  'diferenciais',
  'O que buscamos fazer diferente',
  'Clareza, organização e continuidade.',
  'Mais do que exibir produtos, a operação busca facilitar a decisão, manter o histórico do relacionamento e evoluir os processos conforme a empresa cresce.',
  '["Atendimento humano", "Organização", "Processos em evolução", "Visão de longo prazo"]'::jsonb,
  'Base institucional inicial',
  50,
  'seeded'
),
(
  'historia',
  'Em construção',
  'Uma empresa jovem construída na prática.',
  'A Candinho Suplementos começou em 2026 e está em fase de estruturação e crescimento, transformando aprendizados reais da operação em processos cada vez mais profissionais.',
  '["Início em 2026", "Crescimento gradual", "Aprendizado aplicado à operação"]'::jsonb,
  'Pesquisa pública inicial + histórico operacional',
  60,
  'seeded'
)
on conflict (section_key) do nothing;

commit;
