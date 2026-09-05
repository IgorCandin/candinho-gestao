create table if not exists public.storefront_coupon_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent <= 100),
  quota integer not null check (quota > 0),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.storefront_coupon_signups (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.storefront_coupon_campaigns(id),
  customer_name text not null,
  email text,
  phone text,
  coupon_code text not null unique,
  consent_email boolean not null default false,
  consent_whatsapp boolean not null default false,
  consent_sms boolean not null default false,
  terms_version text not null,
  consented_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','used','cancelled','expired')),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists storefront_coupon_email_once
  on public.storefront_coupon_signups(campaign_id, lower(email)) where email is not null;
create unique index if not exists storefront_coupon_phone_once
  on public.storefront_coupon_signups(campaign_id, regexp_replace(phone, '\D', '', 'g')) where phone is not null;

create table if not exists public.storefront_testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  comment text not null,
  profession text,
  photo_url text,
  active boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.storefront_coupon_campaigns enable row level security;
alter table public.storefront_coupon_signups enable row level security;
alter table public.storefront_testimonials enable row level security;

create policy "Public reads active storefront campaigns" on public.storefront_coupon_campaigns
  for select to anon, authenticated using (active and starts_at <= now() and (ends_at is null or ends_at > now()));
create policy "Public reads active testimonials" on public.storefront_testimonials
  for select to anon, authenticated using (active);

create policy "Managers manage storefront campaigns" on public.storefront_coupon_campaigns
  for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.can_manage_users))
  with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.can_manage_users));
create policy "Managers manage coupon signups" on public.storefront_coupon_signups
  for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.can_manage_users))
  with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.can_manage_users));
create policy "Managers manage testimonials" on public.storefront_testimonials
  for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.can_manage_users))
  with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.can_manage_users));

insert into public.storefront_coupon_campaigns(name, discount_percent, quota)
select '25% na primeira compra', 25, 10
where not exists(select 1 from public.storefront_coupon_campaigns);

create or replace function public.claim_storefront_coupon_v1(
  p_name text, p_email text, p_phone text,
  p_consent_email boolean, p_consent_whatsapp boolean, p_consent_sms boolean,
  p_terms_accepted boolean
) returns table(coupon_code text, remaining integer, discount_percent numeric)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_campaign public.storefront_coupon_campaigns%rowtype; v_count integer; v_code text;
begin
  if not p_terms_accepted then raise exception 'Aceite o termo da campanha para continuar.'; end if;
  if not (coalesce(p_consent_email,false) or coalesce(p_consent_whatsapp,false) or coalesce(p_consent_sms,false)) then
    raise exception 'Escolha ao menos um canal para receber as promoções.';
  end if;
  if length(btrim(coalesce(p_name,''))) < 2 then raise exception 'Informe seu nome.'; end if;
  if nullif(btrim(coalesce(p_email,'')),'') is null and nullif(regexp_replace(coalesce(p_phone,''),'\D','','g'),'') is null then
    raise exception 'Informe e-mail ou telefone.';
  end if;
  select * into v_campaign from public.storefront_coupon_campaigns
   where active and starts_at <= now() and (ends_at is null or ends_at > now()) order by starts_at desc limit 1 for update;
  if not found then raise exception 'Campanha indisponível no momento.'; end if;
  select count(*) into v_count from public.storefront_coupon_signups where campaign_id=v_campaign.id and status in ('active','used');
  if v_count >= v_campaign.quota then raise exception 'As vagas desta campanha terminaram.'; end if;
  v_code := 'BEMVINDO-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.storefront_coupon_signups(campaign_id,customer_name,email,phone,coupon_code,consent_email,consent_whatsapp,consent_sms,terms_version)
  values(v_campaign.id,btrim(p_name),nullif(lower(btrim(coalesce(p_email,''))),''),nullif(regexp_replace(coalesce(p_phone,''),'\D','','g'),''),v_code,coalesce(p_consent_email,false),coalesce(p_consent_whatsapp,false),coalesce(p_consent_sms,false),'v1-2026-09-05');
  return query select v_code, greatest(v_campaign.quota-v_count-1,0), v_campaign.discount_percent;
exception when unique_violation then raise exception 'Este contato já recebeu um cupom desta campanha.';
end; $$;

revoke all on function public.claim_storefront_coupon_v1(text,text,text,boolean,boolean,boolean,boolean) from public;
grant execute on function public.claim_storefront_coupon_v1(text,text,text,boolean,boolean,boolean,boolean) to anon, authenticated;
grant select on public.storefront_coupon_campaigns, public.storefront_testimonials to anon, authenticated;
grant select, insert, update, delete on public.storefront_coupon_campaigns, public.storefront_coupon_signups, public.storefront_testimonials to authenticated;

create or replace function public.get_storefront_campaign_summary_v1()
returns table(campaign_id uuid, discount_percent numeric, remaining integer)
language sql security definer set search_path = public, pg_temp stable as $$
  select c.id, c.discount_percent,
    greatest(c.quota - count(s.id)::integer, 0)
  from public.storefront_coupon_campaigns c
  left join public.storefront_coupon_signups s on s.campaign_id=c.id and s.status in ('active','used')
  where c.active and c.starts_at <= now() and (c.ends_at is null or c.ends_at > now())
  group by c.id order by c.starts_at desc limit 1;
$$;
revoke all on function public.get_storefront_campaign_summary_v1() from public;
grant execute on function public.get_storefront_campaign_summary_v1() to anon, authenticated;
