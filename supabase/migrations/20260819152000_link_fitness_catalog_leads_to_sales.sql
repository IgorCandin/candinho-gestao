begin;

alter table public.catalog_public_leads
  add column if not exists fitness_sale_id uuid references public.fitness_sales(id) on delete set null;

create index if not exists catalog_public_leads_fitness_sale_idx
  on public.catalog_public_leads(fitness_sale_id)
  where fitness_sale_id is not null;

create or replace function public.link_fitness_sale_to_catalog_lead_v1()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_catalog_lead_id uuid; v_sales_lead_id uuid;
begin
  if new.general_status = 'cancelled' or nullif(regexp_replace(coalesce(new.customer_phone,''),'\D','','g'),'') is null then return new; end if;
  select l.id,l.sales_lead_id into v_catalog_lead_id,v_sales_lead_id
  from public.catalog_public_leads l
  where l.fitness_product_id is not null
    and l.fitness_sale_id is null
    and l.status not in ('converted','closed')
    and regexp_replace(coalesce(l.phone,''),'\D','','g') = regexp_replace(new.customer_phone,'\D','','g')
  order by l.created_at desc
  limit 1
  for update skip locked;
  if v_catalog_lead_id is null then return new; end if;
  update public.catalog_public_leads
  set fitness_sale_id=new.id,inbox_status='converted',status='converted',converted_at=coalesce(converted_at,now()),last_action_at=now(),updated_at=now()
  where id=v_catalog_lead_id;
  if v_sales_lead_id is not null then
    update public.sales set general_status='finalized',lead_status='Convertido',notes=concat_ws(E'\n',notes,'Convertido pela venda Fitness '||new.id::text),updated_at=now()
    where id=v_sales_lead_id and record_type='lead';
  end if;
  insert into public.audit_events(entity_type,entity_id,action,details)
  values('catalog_public_lead',v_catalog_lead_id,'linked_to_fitness_sale_v1',jsonb_build_object('fitness_sale_id',new.id,'sales_lead_id',v_sales_lead_id));
  return new;
end;
$$;

drop trigger if exists trg_link_fitness_sale_to_catalog_lead_v1 on public.fitness_sales;
create trigger trg_link_fitness_sale_to_catalog_lead_v1
after insert on public.fitness_sales
for each row execute function public.link_fitness_sale_to_catalog_lead_v1();

revoke all on function public.link_fitness_sale_to_catalog_lead_v1() from public,anon;

commit;
