begin;

create table if not exists public.fitness_post_sale_state (
  customer_id uuid primary key references public.fitness_customers(id) on delete cascade,
  completed_through_on date,
  rescheduled_due_on date,
  ai_last_message text,
  ai_metadata jsonb not null default '{}'::jsonb,
  last_generated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.fitness_post_sale_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.fitness_customers(id) on delete cascade,
  cycle_started_on date not null,
  cycle_last_sale_on date not null,
  sale_count integer not null default 0,
  product_summary text,
  total_amount numeric not null default 0,
  outcome text,
  notes text,
  ai_message text,
  ai_metadata jsonb not null default '{}'::jsonb,
  completed_by uuid default auth.uid(),
  completed_at timestamptz not null default now()
);

create index if not exists fitness_post_sale_history_customer_idx
  on public.fitness_post_sale_history(customer_id, completed_at desc);

alter table public.fitness_post_sale_state enable row level security;
alter table public.fitness_post_sale_history enable row level security;

drop policy if exists fitness_post_sale_state_manage on public.fitness_post_sale_state;
create policy fitness_post_sale_state_manage on public.fitness_post_sale_state
  for all to authenticated using (public.can_write_fitness()) with check (public.can_write_fitness());

drop policy if exists fitness_post_sale_history_manage on public.fitness_post_sale_history;
create policy fitness_post_sale_history_manage on public.fitness_post_sale_history
  for all to authenticated using (public.can_write_fitness()) with check (public.can_write_fitness());

grant select, insert, update, delete on public.fitness_post_sale_state to authenticated;
grant select, insert, update, delete on public.fitness_post_sale_history to authenticated;

create or replace view public.fitness_post_sale_overview
with (security_invoker = true)
as
with eligible_sales as (
  select s.*
  from public.fitness_sales s
  left join public.fitness_post_sale_state st on st.customer_id = s.customer_id
  where s.customer_id is not null
    and coalesce(s.general_status, '') <> 'cancelled'
    and s.quoted_on > coalesce(st.completed_through_on, date '1900-01-01')
),
sales_agg as (
  select
    customer_id,
    min(quoted_on) as cycle_started_on,
    max(quoted_on) as last_sale_on,
    count(*)::integer as sale_count,
    sum(coalesce(total_amount,0))::numeric as total_amount,
    (array_agg(customer_name order by quoted_on desc, created_at desc))[1] as customer_name,
    (array_agg(customer_phone order by quoted_on desc, created_at desc))[1] as customer_phone,
    (array_agg(city order by quoted_on desc, created_at desc))[1] as city
  from eligible_sales
  group by customer_id
),
items_agg as (
  select es.customer_id,
    string_agg(distinct fp.name, ', ') as product_summary
  from eligible_sales es
  join public.fitness_sale_items si on si.sale_id = es.id
  join public.fitness_variants fv on fv.id = si.variant_id
  join public.fitness_products fp on fp.id = fv.product_id
  group by es.customer_id
)
select
  sa.customer_id as id,
  sa.customer_id,
  coalesce(fc.name, sa.customer_name, 'Cliente') as customer_name,
  coalesce(fc.phone, sa.customer_phone) as customer_phone,
  fc.instagram,
  coalesce(fc.city, sa.city) as city,
  sa.cycle_started_on,
  sa.last_sale_on,
  sa.sale_count,
  coalesce(ia.product_summary, 'Produtos da Fitness') as product_summary,
  sa.total_amount,
  coalesce(st.rescheduled_due_on, sa.last_sale_on + 30) as due_on,
  case
    when coalesce(st.rescheduled_due_on, sa.last_sale_on + 30) < current_date then 'overdue'
    when coalesce(st.rescheduled_due_on, sa.last_sale_on + 30) = current_date then 'today'
    else 'upcoming'
  end as status,
  st.ai_last_message,
  st.ai_metadata,
  st.last_generated_at
from sales_agg sa
left join items_agg ia on ia.customer_id = sa.customer_id
left join public.fitness_customers fc on fc.id = sa.customer_id
left join public.fitness_post_sale_state st on st.customer_id = sa.customer_id;

grant select on public.fitness_post_sale_overview to authenticated;

create or replace view public.fitness_post_sale_summary
with (security_invoker = true)
as
select
  count(*)::integer as open_count,
  count(*) filter (where status = 'overdue')::integer as overdue_count,
  count(*) filter (where status = 'today')::integer as today_count,
  count(*) filter (where status = 'upcoming' and due_on <= current_date + 7)::integer as next_seven_days_count
from public.fitness_post_sale_overview;

grant select on public.fitness_post_sale_summary to authenticated;

create or replace function public.reschedule_fitness_post_sale(p_customer_id uuid, p_due_on date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_write_fitness() then
    raise exception 'Sem permissão para operar o pós-venda Fitness';
  end if;

  insert into public.fitness_post_sale_state(customer_id, rescheduled_due_on, updated_at)
  values (p_customer_id, p_due_on, now())
  on conflict (customer_id) do update set
    rescheduled_due_on = excluded.rescheduled_due_on,
    updated_at = now();
end;
$$;

grant execute on function public.reschedule_fitness_post_sale(uuid,date) to authenticated;

create or replace function public.complete_fitness_post_sale(
  p_customer_id uuid,
  p_outcome text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.fitness_post_sale_overview%rowtype;
  v_state public.fitness_post_sale_state%rowtype;
begin
  if not public.can_write_fitness() then
    raise exception 'Sem permissão para operar o pós-venda Fitness';
  end if;

  select * into v_row
  from public.fitness_post_sale_overview
  where customer_id = p_customer_id;

  if not found then
    raise exception 'Não existe ciclo de pós-venda aberto para este cliente';
  end if;

  select * into v_state
  from public.fitness_post_sale_state
  where customer_id = p_customer_id;

  insert into public.fitness_post_sale_history(
    customer_id, cycle_started_on, cycle_last_sale_on, sale_count,
    product_summary, total_amount, outcome, notes, ai_message, ai_metadata
  ) values (
    p_customer_id, v_row.cycle_started_on, v_row.last_sale_on, v_row.sale_count,
    v_row.product_summary, v_row.total_amount, nullif(trim(p_outcome),''),
    nullif(trim(p_notes),''), v_state.ai_last_message, coalesce(v_state.ai_metadata,'{}'::jsonb)
  );

  insert into public.fitness_post_sale_state(
    customer_id, completed_through_on, rescheduled_due_on,
    ai_last_message, ai_metadata, last_generated_at, updated_at
  ) values (
    p_customer_id, v_row.last_sale_on, null, null, '{}'::jsonb, null, now()
  )
  on conflict (customer_id) do update set
    completed_through_on = excluded.completed_through_on,
    rescheduled_due_on = null,
    ai_last_message = null,
    ai_metadata = '{}'::jsonb,
    last_generated_at = null,
    updated_at = now();
end;
$$;

grant execute on function public.complete_fitness_post_sale(uuid,text,text) to authenticated;

create or replace function public.fitness_post_sale_nexus_save_result(
  p_customer_id uuid,
  p_message text,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.fitness_post_sale_state(
    customer_id, ai_last_message, ai_metadata, last_generated_at, updated_at
  )
  values (p_customer_id, p_message, coalesce(p_metadata,'{}'::jsonb), now(), now())
  on conflict (customer_id) do update set
    ai_last_message = excluded.ai_last_message,
    ai_metadata = excluded.ai_metadata,
    last_generated_at = excluded.last_generated_at,
    updated_at = now();
end;
$$;

revoke all on function public.fitness_post_sale_nexus_save_result(uuid,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.fitness_post_sale_nexus_save_result(uuid,text,jsonb)
  to service_role;

create or replace function public.fitness_post_sale_nexus_context(p_customer_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'business', 'Candinho Fitness',
    'customer', jsonb_build_object(
      'id', o.customer_id,
      'name', o.customer_name,
      'phone', o.customer_phone,
      'instagram', o.instagram,
      'city', o.city
    ),
    'cycle', jsonb_build_object(
      'started_on', o.cycle_started_on,
      'last_sale_on', o.last_sale_on,
      'due_on', o.due_on,
      'sale_count', o.sale_count,
      'product_summary', o.product_summary,
      'total_amount', o.total_amount
    ),
    'sales', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sale_id', s.id,
        'sale_on', s.quoted_on,
        'total_amount', s.total_amount,
        'products', coalesce((
          select jsonb_agg(jsonb_build_object(
            'product', fp.name,
            'size', fv.size,
            'color', fv.color,
            'quantity', si.quantity,
            'unit_price', si.unit_price
          ) order by si.created_at)
          from public.fitness_sale_items si
          join public.fitness_variants fv on fv.id = si.variant_id
          join public.fitness_products fp on fp.id = fv.product_id
          where si.sale_id = s.id
        ), '[]'::jsonb)
      ) order by s.quoted_on desc)
      from public.fitness_sales s
      left join public.fitness_post_sale_state st on st.customer_id = s.customer_id
      where s.customer_id = p_customer_id
        and coalesce(s.general_status,'') <> 'cancelled'
        and s.quoted_on > coalesce(st.completed_through_on, date '1900-01-01')
    ), '[]'::jsonb),
    'previous_followups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'completed_at', h.completed_at,
        'products', h.product_summary,
        'outcome', h.outcome,
        'notes', h.notes,
        'message', h.ai_message
      ) order by h.completed_at desc)
      from (
        select *
        from public.fitness_post_sale_history
        where customer_id = p_customer_id
        order by completed_at desc
        limit 5
      ) h
    ), '[]'::jsonb),
    'previous_generated_message', o.ai_last_message
  )
  from public.fitness_post_sale_overview o
  where o.customer_id = p_customer_id;
$$;

revoke all on function public.fitness_post_sale_nexus_context(uuid)
  from public, anon, authenticated;
grant execute on function public.fitness_post_sale_nexus_context(uuid)
  to service_role;

commit;
