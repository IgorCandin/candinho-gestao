begin;

update public.fitness_nexus_purchase_feedback
set suggested_quantity = least(greatest(coalesce(suggested_quantity, 1), 1), 2)
where suggested_quantity is distinct from least(greatest(coalesce(suggested_quantity, 1), 1), 2);

alter table public.fitness_nexus_purchase_feedback
  alter column suggested_quantity set default 1;

alter table public.fitness_nexus_purchase_feedback
  drop constraint if exists fitness_nexus_purchase_feedback_suggested_quantity_check;

alter table public.fitness_nexus_purchase_feedback
  add constraint fitness_nexus_purchase_feedback_suggested_quantity_check
  check (suggested_quantity between 1 and 2);

create or replace function public.fitness_nexus_purchase_suggestions_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_allowed boolean := false;
  v_suggestions jsonb := '[]'::jsonb;
  v_basket_quantity integer := 0;
  v_basket_items integer := 0;
begin
  select p.active and (p.can_access_fitness or p.role::text='admin')
  into v_allowed
  from public.profiles p
  where p.id=auth.uid();

  if not coalesce(v_allowed,false) then
    raise exception 'Sem acesso à operação Fitness';
  end if;

  with sales_by_variant as (
    select
      i.variant_id,
      coalesce(sum(i.quantity) filter (
        where s.general_status<>'cancelled'
          and s.quoted_on>=((now() at time zone 'America/Sao_Paulo')::date-30)
      ),0)::integer as sold_30d,
      coalesce(sum(i.quantity) filter (
        where s.general_status<>'cancelled'
          and s.quoted_on>=((now() at time zone 'America/Sao_Paulo')::date-90)
      ),0)::integer as sold_90d,
      max(s.quoted_on) filter (where s.general_status<>'cancelled') as last_sale_on
    from public.fitness_sale_items i
    join public.fitness_sales s on s.id=i.sale_id
    group by i.variant_id
  ),
  named_variants as (
    select
      v.id as variant_id,
      p.id as product_id,
      p.name as product_name,
      case
        when public.catalog_slugify_v1(p.name) like '%legging%' then 'Calça Legging'
        when public.catalog_slugify_v1(p.name) like '%macacao%' then 'Macacão'
        when public.catalog_slugify_v1(p.name) like '%short%' then 'Short'
        when public.catalog_slugify_v1(p.name) like '%top%' then 'Top'
        when public.catalog_slugify_v1(p.name) like '%meia%' then 'Meia'
        when public.catalog_slugify_v1(p.name) like '%jaqueta%'
          or public.catalog_slugify_v1(p.name) like '%corta-vento%' then 'Jaqueta'
        when public.catalog_slugify_v1(p.name) like '%blusa%'
          or public.catalog_slugify_v1(p.name) like '%camiseta%' then 'Blusa / Camiseta'
        when public.catalog_slugify_v1(p.name) like '%conj%'
          or public.catalog_slugify_v1(p.category)='conjunto' then 'Conjunto'
        else coalesce(nullif(btrim(p.category),''),p.name)
      end as family_name,
      upper(btrim(v.size)) as size,
      case
        when lower(btrim(v.color)) in ('black','preta') then 'Preto'
        when lower(btrim(v.color))='branca' then 'Branco'
        else btrim(v.color)
      end as color,
      coalesce(st.available_quantity,0)::integer as available_quantity,
      coalesce(st.incoming_quantity,0)::integer as incoming_quantity,
      coalesce(sv.sold_30d,0)::integer as sold_30d,
      coalesce(sv.sold_90d,0)::integer as sold_90d,
      sv.last_sale_on
    from public.fitness_variants v
    join public.fitness_products p on p.id=v.product_id
    left join public.fitness_stock_operational st on st.variant_id=v.id
    left join sales_by_variant sv on sv.variant_id=v.id
    where v.active and p.active
  ),
  family_variants as (
    select
      public.catalog_slugify_v1(n.family_name) as family_key,
      n.family_name,
      n.size,
      n.color,
      sum(n.available_quantity)::integer as available_quantity,
      sum(n.incoming_quantity)::integer as incoming_quantity,
      sum(n.sold_30d)::integer as sold_30d,
      sum(n.sold_90d)::integer as sold_90d,
      max(n.last_sale_on) as last_sale_on,
      array_agg(distinct n.product_name order by n.product_name) as matched_products
    from named_variants n
    group by public.catalog_slugify_v1(n.family_name),n.family_name,n.size,n.color
  ),
  candidates as (
    select
      concat_ws('|',f.family_key,lower(f.size),public.catalog_slugify_v1(f.color)) as suggestion_key,
      f.*,
      case
        when f.sold_30d>=2 or f.sold_90d>=4 then 2
        else 1
      end::integer as base_suggested_quantity,
      (f.sold_90d*12 + f.sold_30d*8)::integer as base_score
    from family_variants f
    where f.available_quantity=0
      and f.incoming_quantity=0
      and f.sold_90d>0
  ),
  learned as (
    select
      c.*,
      coalesce(feedback.decision,'pending') as decision,
      case
        when feedback.decision='accepted'
          then least(greatest(coalesce(feedback.suggested_quantity,c.base_suggested_quantity),1),2)
        else c.base_suggested_quantity
      end::integer as suggested_quantity,
      coalesce(feedback.dismissal_count,0)::integer as dismissal_count,
      feedback.snoozed_until,
      coalesce((
        select sum(ff.dismissal_count)
        from public.fitness_nexus_purchase_feedback ff
        where ff.family_key=c.family_key
          and ff.updated_at>=now()-interval '90 days'
      ),0)::integer as family_dismissals,
      coalesce((
        select count(*)
        from public.fitness_nexus_purchase_feedback ff
        where ff.family_key=c.family_key
          and ff.decision='accepted'
          and ff.updated_at>=now()-interval '180 days'
      ),0)::integer as family_acceptances,
      coalesce((
        select count(*)
        from public.fitness_nexus_purchase_feedback ff
        where upper(ff.size)=upper(c.size)
          and ff.decision='accepted'
          and ff.updated_at>=now()-interval '180 days'
      ),0)::integer as size_acceptances,
      coalesce((
        select count(*)
        from public.fitness_nexus_purchase_feedback ff
        where public.catalog_slugify_v1(ff.color)=public.catalog_slugify_v1(c.color)
          and ff.decision='accepted'
          and ff.updated_at>=now()-interval '180 days'
      ),0)::integer as color_acceptances
    from candidates c
    left join public.fitness_nexus_purchase_feedback feedback
      on feedback.suggestion_key=c.suggestion_key
    where feedback.decision='accepted'
       or feedback.snoozed_until is null
       or feedback.snoozed_until<=now()
  ),
  scored as (
    select
      l.*,
      greatest(
        0,
        l.base_score
          + (l.family_acceptances*10)
          + (l.size_acceptances*4)
          + (l.color_acceptances*4)
          - (l.family_dismissals*6)
      )::integer as score
    from learned l
  ),
  ordered as (
    select
      s.*,
      sum(s.suggested_quantity) over (
        order by
          case s.decision when 'accepted' then 0 else 1 end,
          s.score desc,
          s.family_name,
          s.size,
          s.color
        rows between unbounded preceding and current row
      )::integer as running_quantity
    from scored s
  ),
  basket as (
    select *
    from ordered o
    where o.decision='accepted'
       or (o.running_quantity-o.suggested_quantity)<10
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'suggestion_key',b.suggestion_key,
      'family_key',b.family_key,
      'family_name',b.family_name,
      'size',b.size,
      'color',b.color,
      'available_quantity',b.available_quantity,
      'incoming_quantity',b.incoming_quantity,
      'sold_30d',b.sold_30d,
      'sold_90d',b.sold_90d,
      'last_sale_on',b.last_sale_on,
      'matched_products',to_jsonb(b.matched_products),
      'suggested_quantity',b.suggested_quantity,
      'decision',b.decision,
      'dismissal_count',b.dismissal_count,
      'family_dismissals',b.family_dismissals,
      'family_acceptances',b.family_acceptances,
      'size_acceptances',b.size_acceptances,
      'color_acceptances',b.color_acceptances,
      'score',b.score
    ) order by
      case b.decision when 'accepted' then 0 else 1 end,
      b.score desc,
      b.family_name,b.size,b.color),'[]'::jsonb),
    coalesce(sum(b.suggested_quantity),0)::integer,
    count(*)::integer
  into v_suggestions,v_basket_quantity,v_basket_items
  from basket b;

  return jsonb_build_object(
    'suggestions',coalesce(v_suggestions,'[]'::jsonb),
    'target_quantity',10,
    'basket_quantity',coalesce(v_basket_quantity,0),
    'basket_item_count',coalesce(v_basket_items,0),
    'basket_complete',coalesce(v_basket_quantity,0)>=10,
    'default_quantity',1,
    'generated_at',now()
  );
end;
$$;

create or replace function public.set_fitness_nexus_purchase_decision_v1(
  p_suggestion_key text,
  p_family_key text,
  p_family_name text,
  p_size text,
  p_color text,
  p_decision text,
  p_suggested_quantity integer default 1
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_decision text := lower(nullif(btrim(p_decision),''));
  v_quantity integer := least(greatest(coalesce(p_suggested_quantity,1),1),2);
begin
  if not public.can_write_fitness() then
    raise exception 'Usuário sem permissão para alterar sugestões Fitness';
  end if;

  if v_decision not in ('pending','accepted','dismissed') then
    raise exception 'Decisão inválida';
  end if;

  if nullif(btrim(p_suggestion_key),'') is null
     or nullif(btrim(p_family_key),'') is null
     or nullif(btrim(p_family_name),'') is null
     or nullif(btrim(p_size),'') is null
     or nullif(btrim(p_color),'') is null then
    raise exception 'Sugestão incompleta';
  end if;

  insert into public.fitness_nexus_purchase_feedback(
    suggestion_key,family_key,family_name,size,color,suggested_quantity,
    decision,dismissal_count,snoozed_until,accepted_at,dismissed_at,updated_by
  ) values (
    left(btrim(p_suggestion_key),240),left(btrim(p_family_key),120),
    left(btrim(p_family_name),160),left(btrim(p_size),40),left(btrim(p_color),80),
    v_quantity,v_decision,
    case when v_decision='dismissed' then 1 else 0 end,
    case when v_decision='dismissed' then now()+interval '14 days' else null end,
    case when v_decision='accepted' then now() else null end,
    case when v_decision='dismissed' then now() else null end,
    auth.uid()
  )
  on conflict (suggestion_key) do update set
    family_key=excluded.family_key,
    family_name=excluded.family_name,
    size=excluded.size,
    color=excluded.color,
    suggested_quantity=v_quantity,
    decision=v_decision,
    dismissal_count=case
      when v_decision='dismissed'
        then public.fitness_nexus_purchase_feedback.dismissal_count+1
      else public.fitness_nexus_purchase_feedback.dismissal_count
    end,
    snoozed_until=case
      when v_decision='dismissed' then now()+make_interval(days=>least(
        14*(public.fitness_nexus_purchase_feedback.dismissal_count+1),84
      ))
      else null
    end,
    accepted_at=case when v_decision='accepted' then now() else null end,
    dismissed_at=case when v_decision='dismissed' then now() else null end,
    updated_by=auth.uid(),
    updated_at=now();
end;
$$;

revoke all on function public.fitness_nexus_purchase_suggestions_v1() from public,anon;
revoke all on function public.set_fitness_nexus_purchase_decision_v1(text,text,text,text,text,text,integer) from public,anon;
grant execute on function public.fitness_nexus_purchase_suggestions_v1() to authenticated,service_role;
grant execute on function public.set_fitness_nexus_purchase_decision_v1(text,text,text,text,text,text,integer) to authenticated,service_role;

commit;
