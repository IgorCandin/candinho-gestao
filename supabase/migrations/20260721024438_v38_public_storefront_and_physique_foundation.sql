begin;

insert into public.ui_feature_flags(key,enabled,description)
values(
  'physique_enabled',
  false,
  'Candinho Physique Athletes: operação em preparação; fundação implantada, ainda não inicializada.'
)
on conflict(key) do update
set description=excluded.description;

create or replace function public.can_manage_physique()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and (p.can_manage_users = true or p.role::text = 'admin')
  );
$function$;

revoke all on function public.can_manage_physique() from anon,public;
grant execute on function public.can_manage_physique() to authenticated,service_role;

create table if not exists public.physique_athletes (
  id uuid primary key default gen_random_uuid(),
  central_contact_id uuid references public.central_contacts(id) on delete set null,
  supplements_customer_id uuid references public.customers(id) on delete set null,
  fitness_customer_id uuid references public.fitness_customers(id) on delete set null,
  display_name text not null,
  phone text,
  email text,
  instagram_username text,
  status text not null default 'prospect'
    check (status in ('prospect','active','paused','inactive')),
  primary_goal text,
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists physique_athletes_central_contact_unique
  on public.physique_athletes(central_contact_id)
  where central_contact_id is not null;
create index if not exists physique_athletes_supplements_customer_idx
  on public.physique_athletes(supplements_customer_id);
create index if not exists physique_athletes_fitness_customer_idx
  on public.physique_athletes(fitness_customer_id);
create index if not exists physique_athletes_status_idx
  on public.physique_athletes(status,display_name);

create table if not exists public.physique_training_plans (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.physique_athletes(id) on delete cascade,
  title text not null,
  goal text,
  status text not null default 'draft'
    check (status in ('draft','active','archived')),
  source_type text not null default 'manual'
    check (source_type in ('manual','attachment','mixed')),
  starts_on date,
  ends_on date,
  coach_name text,
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists physique_training_plans_athlete_idx
  on public.physique_training_plans(athlete_id,status,created_at desc);

create table if not exists public.physique_training_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.physique_training_plans(id) on delete cascade,
  day_order integer not null default 1 check(day_order > 0),
  day_label text not null,
  focus text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id,day_order)
);

create table if not exists public.physique_training_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.physique_training_days(id) on delete cascade,
  exercise_order integer not null default 1 check(exercise_order > 0),
  exercise_name text not null,
  sets_text text,
  reps_text text,
  rest_seconds integer check(rest_seconds is null or rest_seconds >= 0),
  technique text,
  load_guidance text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(day_id,exercise_order)
);

create table if not exists public.physique_training_attachments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.physique_training_plans(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  mime_type text,
  file_size_bytes bigint check(file_size_bytes is null or file_size_bytes >= 0),
  uploaded_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists physique_training_attachments_plan_idx
  on public.physique_training_attachments(plan_id,created_at desc);

alter table public.physique_athletes enable row level security;
alter table public.physique_training_plans enable row level security;
alter table public.physique_training_days enable row level security;
alter table public.physique_training_exercises enable row level security;
alter table public.physique_training_attachments enable row level security;

drop policy if exists physique_athletes_manage on public.physique_athletes;
create policy physique_athletes_manage on public.physique_athletes
for all to authenticated
using(public.can_manage_physique())
with check(public.can_manage_physique());

drop policy if exists physique_training_plans_manage on public.physique_training_plans;
create policy physique_training_plans_manage on public.physique_training_plans
for all to authenticated
using(public.can_manage_physique())
with check(public.can_manage_physique());

drop policy if exists physique_training_days_manage on public.physique_training_days;
create policy physique_training_days_manage on public.physique_training_days
for all to authenticated
using(public.can_manage_physique())
with check(public.can_manage_physique());

drop policy if exists physique_training_exercises_manage on public.physique_training_exercises;
create policy physique_training_exercises_manage on public.physique_training_exercises
for all to authenticated
using(public.can_manage_physique())
with check(public.can_manage_physique());

drop policy if exists physique_training_attachments_manage on public.physique_training_attachments;
create policy physique_training_attachments_manage on public.physique_training_attachments
for all to authenticated
using(public.can_manage_physique())
with check(public.can_manage_physique());

grant select,insert,update,delete on
  public.physique_athletes,
  public.physique_training_plans,
  public.physique_training_days,
  public.physique_training_exercises,
  public.physique_training_attachments
to authenticated;

create or replace view public.physique_athlete_overview as
select
  a.id,
  a.display_name,
  a.phone,
  a.email,
  a.instagram_username,
  a.status,
  a.primary_goal,
  a.notes,
  a.central_contact_id,
  c.display_name as central_contact_name,
  c.operation_scope as central_contact_scope,
  a.supplements_customer_id,
  sc.name as supplements_customer_name,
  a.fitness_customer_id,
  fc.name as fitness_customer_name,
  count(distinct tp.id)::integer as training_plan_count,
  count(distinct tp.id) filter(where tp.status='active')::integer as active_training_plan_count,
  max(tp.updated_at) as last_plan_update_at,
  a.created_at,
  a.updated_at
from public.physique_athletes a
left join public.central_contacts c on c.id=a.central_contact_id
left join public.customers sc on sc.id=a.supplements_customer_id
left join public.fitness_customers fc on fc.id=a.fitness_customer_id
left join public.physique_training_plans tp on tp.athlete_id=a.id
group by a.id,c.display_name,c.operation_scope,sc.name,fc.name;

revoke all on public.physique_athlete_overview from anon,public;
grant select on public.physique_athlete_overview to authenticated,service_role;

insert into storage.buckets(id,name,public)
values('physique-training-files','physique-training-files',false)
on conflict(id) do update set public=false;

drop policy if exists physique_training_files_select on storage.objects;
create policy physique_training_files_select on storage.objects
for select to authenticated
using(bucket_id='physique-training-files' and public.can_manage_physique());

drop policy if exists physique_training_files_insert on storage.objects;
create policy physique_training_files_insert on storage.objects
for insert to authenticated
with check(bucket_id='physique-training-files' and public.can_manage_physique());

drop policy if exists physique_training_files_update on storage.objects;
create policy physique_training_files_update on storage.objects
for update to authenticated
using(bucket_id='physique-training-files' and public.can_manage_physique())
with check(bucket_id='physique-training-files' and public.can_manage_physique());

drop policy if exists physique_training_files_delete on storage.objects;
create policy physique_training_files_delete on storage.objects
for delete to authenticated
using(bucket_id='physique-training-files' and public.can_manage_physique());

create or replace function public.public_storefront_snapshot(p_limit integer default 300)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit,300),1),500);
  v_supplements jsonb;
  v_fitness jsonb;
  v_promotions_supplements jsonb;
  v_promotions_fitness jsonb;
  v_supplement_categories jsonb;
  v_fitness_categories jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.name),'[]'::jsonb)
  into v_supplements
  from (
    select
      pc.id::text id,
      'supplements'::text operation,
      pc.name,
      pc.category,
      coalesce(pc.thumbnail_url,pc.image_url) image_url,
      pc.sale_price::numeric price_from,
      pc.sale_price::numeric price_to,
      true available
    from public.product_catalog_commercial_sort pc
    join public.products p on p.id=pc.id
    where pc.active=true
      and p.restricted=false
      and coalesce(upper(p.sales_category),'') <> 'Z'
      and pc.available_quantity > 0
      and upper(pc.name) not like '%COMBO%'
    order by pc.flagship_rank,pc.availability_rank,pc.category_rank,pc.total_sold desc,pc.name
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.name),'[]'::jsonb)
  into v_fitness
  from (
    select
      fp.id::text id,
      'fitness'::text operation,
      fp.name,
      fp.category,
      fp.image_url,
      fp.min_sale_price::numeric price_from,
      fp.max_sale_price::numeric price_to,
      true available
    from public.fitness_product_catalog_v2 fp
    where fp.active=true and fp.available_quantity > 0
    order by fp.category,fp.name
    limit v_limit
  ) x;

  with promo as (
    select
      i.id::text id,
      i.supplement_product_id::text product_id,
      'supplements'::text operation,
      i.item_label name,
      i.category,
      i.image_url,
      i.current_price::numeric current_price,
      coalesce(
        i.promotional_price,
        case when coalesce(i.discount_pct,0)>0
          then i.current_price*(1-i.discount_pct/100.0)
          else i.current_price end
      )::numeric promotional_price,
      coalesce(i.discount_pct,0)::numeric discount_pct,
      p.name promotion_name,
      p.effective_status promotion_status,
      p.starts_on,
      p.ends_on
    from public.central_promotion_items_overview i
    join public.central_promotions_overview p on p.id=i.promotion_id
    join public.product_catalog_commercial_sort pc on pc.id=i.supplement_product_id
    join public.products prod on prod.id=pc.id
    where i.operation_scope='supplements'
      and p.effective_status in ('active','scheduled')
      and pc.active=true
      and prod.restricted=false
      and coalesce(upper(prod.sales_category),'') <> 'Z'
      and pc.available_quantity > 0
  )
  select coalesce(jsonb_agg(to_jsonb(promo) order by promotion_status,starts_on nulls last,name),'[]'::jsonb)
  into v_promotions_supplements
  from promo;

  with promo as (
    select distinct on(i.id)
      i.id::text id,
      fs.product_id::text product_id,
      'fitness'::text operation,
      i.item_label name,
      i.category,
      i.image_url,
      i.current_price::numeric current_price,
      coalesce(
        i.promotional_price,
        case when coalesce(i.discount_pct,0)>0
          then i.current_price*(1-i.discount_pct/100.0)
          else i.current_price end
      )::numeric promotional_price,
      coalesce(i.discount_pct,0)::numeric discount_pct,
      p.name promotion_name,
      p.effective_status promotion_status,
      p.starts_on,
      p.ends_on
    from public.central_promotion_items_overview i
    join public.central_promotions_overview p on p.id=i.promotion_id
    join public.fitness_stock_overview fs on fs.variant_id=i.fitness_variant_id
    where i.operation_scope='fitness'
      and p.effective_status in ('active','scheduled')
      and fs.product_active=true
      and fs.variant_active=true
      and fs.available_quantity > 0
    order by i.id,fs.product_name
  )
  select coalesce(jsonb_agg(to_jsonb(promo) order by promotion_status,starts_on nulls last,name),'[]'::jsonb)
  into v_promotions_fitness
  from promo;

  select coalesce(jsonb_agg(category order by category),'[]'::jsonb)
  into v_supplement_categories
  from (
    select distinct pc.category
    from public.product_catalog_commercial_sort pc
    join public.products p on p.id=pc.id
    where pc.active=true
      and p.restricted=false
      and coalesce(upper(p.sales_category),'') <> 'Z'
      and pc.available_quantity > 0
      and pc.category is not null
      and btrim(pc.category)<>''
  ) c;

  select coalesce(jsonb_agg(category order by category),'[]'::jsonb)
  into v_fitness_categories
  from (
    select distinct fp.category
    from public.fitness_product_catalog_v2 fp
    where fp.active=true
      and fp.available_quantity > 0
      and fp.category is not null
      and btrim(fp.category)<>''
  ) c;

  return jsonb_build_object(
    'products',jsonb_build_object(
      'supplements',v_supplements,
      'fitness',v_fitness
    ),
    'promotions',jsonb_build_object(
      'supplements',v_promotions_supplements,
      'fitness',v_promotions_fitness
    ),
    'categories',jsonb_build_object(
      'supplements',v_supplement_categories,
      'fitness',v_fitness_categories
    ),
    'generated_at',now()
  );
end;
$function$;

revoke all on function public.public_storefront_snapshot(integer) from public;
grant execute on function public.public_storefront_snapshot(integer) to anon,authenticated,service_role;

commit;
