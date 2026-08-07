create table if not exists public.sale_replenishment_reminders (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  customer_id uuid not null references public.customers(id),
  due_on date not null,
  task_id uuid references public.operational_tasks(id) on delete set null,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_replenishment_reminders_status_check
    check (status in ('planned','completed','cancelled')),
  unique(sale_id, product_id)
);

create index if not exists sale_replenishment_reminders_customer_due_idx
  on public.sale_replenishment_reminders(customer_id, due_on, status);

alter table public.sale_replenishment_reminders enable row level security;

create or replace function public.sync_sale_smart_followups_v1(p_sale_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sale public.sales%rowtype;
  v_customer_name text;
  v_base_on date;
  v_post_days integer;
  v_post_due date;
  v_item record;
  v_reminder_id uuid;
  v_task_id uuid;
  v_title text;
  v_notes text;
  v_cancel record;
  v_result jsonb := '[]'::jsonb;
begin
  select * into v_sale
  from public.sales
  where id=p_sale_id
    and record_type='sale';

  if not found or v_sale.general_status='cancelled' then
    return jsonb_build_object('sale_id',p_sale_id,'skipped',true);
  end if;

  select name into v_customer_name
  from public.customers
  where id=v_sale.customer_id;

  v_base_on :=
    (coalesce(v_sale.created_at,now()) at time zone 'America/Sao_Paulo')::date;

  select min(
    least(
      30,
      greatest(
        1,
        coalesce(nullif(p.duration_days,0),30) * greatest(si.quantity,1)
      )
    )
  )::integer
  into v_post_days
  from public.sale_items si
  join public.products p on p.id=si.product_id
  where si.sale_id=p_sale_id;

  if v_post_days is null then
    return jsonb_build_object(
      'sale_id',p_sale_id,
      'skipped',true,
      'reason','no_items'
    );
  end if;

  v_post_due := v_base_on + v_post_days;

  update public.sales
  set post_sale_due_at=v_post_due,
      post_sale_status=case
        when lower(btrim(coalesce(post_sale_status,'')))
          in ('completed','concluído')
          then post_sale_status
        else 'planned'
      end,
      updated_at=now()
  where id=p_sale_id;

  for v_item in
    select
      si.product_id,
      p.name as product_name,
      sum(si.quantity)::integer as total_quantity,
      coalesce(nullif(p.duration_days,0),30)::integer as unit_duration_days,
      (
        coalesce(nullif(p.duration_days,0),30) * sum(si.quantity)
      )::integer as estimated_days
    from public.sale_items si
    join public.products p on p.id=si.product_id
    where si.sale_id=p_sale_id
    group by si.product_id,p.name,p.duration_days
    order by p.name
  loop
    if v_item.estimated_days > 30 then
      insert into public.sale_replenishment_reminders(
        sale_id,product_id,customer_id,due_on,status,updated_at
      )
      values(
        p_sale_id,
        v_item.product_id,
        v_sale.customer_id,
        v_base_on + v_item.estimated_days,
        'planned',
        now()
      )
      on conflict(sale_id,product_id) do update
        set customer_id=excluded.customer_id,
            due_on=excluded.due_on,
            status='planned',
            updated_at=now()
      returning id,task_id
      into v_reminder_id,v_task_id;

      v_title := left(
        'Reposição · '||
        v_item.product_name||
        ' · '||
        coalesce(v_customer_name,'Cliente'),
        160
      );

      v_notes :=
        '[Reposição automática] Venda '||p_sale_id::text||
        ' · Produto: '||v_item.product_name||
        ' · Quantidade: '||v_item.total_quantity::text||
        ' · Duração estimada por unidade: '||
        v_item.unit_duration_days::text||
        ' dias · Reposição estimada: '||
        to_char(v_base_on + v_item.estimated_days,'DD/MM/YYYY');

      if v_task_id is not null and exists(
        select 1 from public.operational_tasks where id=v_task_id
      ) then
        update public.operational_tasks
        set title=v_title,
            due_at=(
              (v_base_on + v_item.estimated_days)::timestamp
              + interval '10 hours'
            ) at time zone 'America/Sao_Paulo',
            status='planned',
            priority='normal',
            operation_scope='supplements',
            customer_id=v_sale.customer_id,
            sale_id=p_sale_id,
            notes=v_notes,
            completed_at=null,
            cancelled_at=null,
            updated_at=now()
        where id=v_task_id;
      else
        insert into public.operational_tasks(
          title,category,due_at,status,priority,operation_scope,
          customer_id,sale_id,assigned_to,notes,created_by
        )
        values(
          v_title,
          'follow_up',
          (
            (v_base_on + v_item.estimated_days)::timestamp
            + interval '10 hours'
          ) at time zone 'America/Sao_Paulo',
          'planned',
          'normal',
          'supplements',
          v_sale.customer_id,
          p_sale_id,
          coalesce(v_sale.created_by,auth.uid()),
          v_notes,
          coalesce(v_sale.created_by,auth.uid())
        )
        returning id into v_task_id;

        update public.sale_replenishment_reminders
        set task_id=v_task_id,updated_at=now()
        where id=v_reminder_id;
      end if;

      v_result :=
        v_result ||
        jsonb_build_array(
          jsonb_build_object(
            'product_id',v_item.product_id,
            'product_name',v_item.product_name,
            'quantity',v_item.total_quantity,
            'estimated_days',v_item.estimated_days,
            'due_on',v_base_on + v_item.estimated_days,
            'task_id',v_task_id
          )
        );
    end if;
  end loop;

  for v_cancel in
    select r.id,r.task_id
    from public.sale_replenishment_reminders r
    where r.sale_id=p_sale_id
      and r.status='planned'
      and not exists(
        select 1
        from public.sale_items si
        join public.products p on p.id=si.product_id
        where si.sale_id=p_sale_id
          and si.product_id=r.product_id
        group by si.product_id,p.duration_days
        having
          (
            coalesce(nullif(p.duration_days,0),30)
            * sum(si.quantity)
          ) > 30
      )
  loop
    update public.sale_replenishment_reminders
    set status='cancelled',updated_at=now()
    where id=v_cancel.id;

    if v_cancel.task_id is not null then
      update public.operational_tasks
      set status='cancelled',
          cancelled_at=now(),
          updated_at=now()
      where id=v_cancel.task_id
        and status='planned';
    end if;
  end loop;

  insert into public.audit_events(
    entity_type,entity_id,action,details
  )
  values(
    'sale',
    p_sale_id,
    'smart_followups_scheduled',
    jsonb_build_object(
      'base_on',v_base_on,
      'post_sale_due_on',v_post_due,
      'post_sale_days',v_post_days,
      'replenishments',v_result
    )
  );

  return jsonb_build_object(
    'sale_id',p_sale_id,
    'base_on',v_base_on,
    'post_sale_due_on',v_post_due,
    'post_sale_days',v_post_days,
    'replenishments',v_result
  );
end;
$function$;

revoke all on function public.sync_sale_smart_followups_v1(uuid)
from public;

grant execute on function public.sync_sale_smart_followups_v1(uuid)
to authenticated;

create or replace function public.sync_smart_followups_after_quote_confirm_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.status='confirmed'
     and new.sale_id is not null
     and (
       tg_op='INSERT'
       or old.status is distinct from new.status
       or old.sale_id is distinct from new.sale_id
     ) then
    perform public.sync_sale_smart_followups_v1(new.sale_id);
  end if;

  return new;
end;
$function$;

drop trigger if exists sales_quotes_smart_followups_after_confirm
  on public.sales_quotes;

create trigger sales_quotes_smart_followups_after_confirm
after insert or update of status,sale_id
on public.sales_quotes
for each row
execute function public.sync_smart_followups_after_quote_confirm_v1();
