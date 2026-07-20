begin;

create or replace function public.post_sale_nexus_context(
  p_batch_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_batch public.post_sale_batch_overview%rowtype;
  v_customer jsonb;
  v_current_sales jsonb;
  v_history jsonb;
  v_leads jsonb;
  v_interactions jsonb;
begin
  select *
  into v_batch
  from public.post_sale_batch_overview
  where id=p_batch_id;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'id',c.id,
    'name',c.name,
    'phone',c.phone,
    'city',c.city,
    'reference',c.reference,
    'notes',c.notes,
    'sensitive_to_caffeine',c.sensitive_to_caffeine,
    'anxiety_or_insomnia',c.anxiety_or_insomnia,
    'prohibited_products',c.prohibited_products,
    'approach_preferences',c.approach_preferences,
    'tags',c.tags,
    'crm_status',c.crm_status,
    'last_contact_at',c.last_contact_at,
    'last_contact_outcome',c.last_contact_outcome
  )
  into v_customer
  from public.customers c
  where c.id=v_batch.customer_id;

  select coalesce(
    jsonb_agg(
      row_json
      order by sort_date desc
    ),
    '[]'::jsonb
  )
  into v_current_sales
  from (
    select
      coalesce(
        s.delivered_at,
        s.quoted_at
      ) as sort_date,
      jsonb_build_object(
        'id',s.id,
        'quoted_at',s.quoted_at,
        'delivered_at',s.delivered_at,
        'total_amount',s.total_amount,
        'notes',s.notes,
        'sale_items',
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'quantity',si.quantity,
                  'unit_price',si.unit_price,
                  'product',
                    jsonb_build_object(
                      'name',p.name,
                      'category',p.category,
                      'objective',p.objective,
                      'quick_message',p.quick_message,
                      'information',p.information
                    )
                )
                order by p.name
              )
              from public.sale_items si
              join public.products p
                on p.id=si.product_id
              where si.sale_id=s.id
            ),
            '[]'::jsonb
          )
      ) as row_json
    from public.sales s
    join public.post_sale_batch_sales pbs
      on pbs.sale_id=s.id
    where pbs.batch_id=p_batch_id
  ) q;

  select coalesce(
    jsonb_agg(
      row_json
      order by sort_date desc
    ),
    '[]'::jsonb
  )
  into v_history
  from (
    select
      coalesce(
        s.delivered_at,
        s.quoted_at
      ) as sort_date,
      jsonb_build_object(
        'id',s.id,
        'quoted_at',s.quoted_at,
        'delivered_at',s.delivered_at,
        'total_amount',s.total_amount,
        'notes',s.notes,
        'sale_items',
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'quantity',si.quantity,
                  'unit_price',si.unit_price,
                  'product',
                    jsonb_build_object(
                      'name',p.name,
                      'category',p.category,
                      'objective',p.objective,
                      'quick_message',p.quick_message
                    )
                )
                order by p.name
              )
              from public.sale_items si
              join public.products p
                on p.id=si.product_id
              where si.sale_id=s.id
            ),
            '[]'::jsonb
          )
      ) as row_json
    from public.sales s
    where s.customer_id=v_batch.customer_id
      and s.record_type='sale'
      and s.general_status<>'cancelled'
    order by coalesce(
      s.delivered_at,
      s.quoted_at
    ) desc
    limit 12
  ) q;

  select coalesce(
    jsonb_agg(
      row_json
      order by sort_date desc
    ),
    '[]'::jsonb
  )
  into v_leads
  from (
    select
      s.quoted_at as sort_date,
      jsonb_build_object(
        'id',s.id,
        'quoted_at',s.quoted_at,
        'general_status',s.general_status,
        'notes',s.notes,
        'items',
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'quantity',si.quantity,
                  'product',
                    jsonb_build_object(
                      'name',p.name,
                      'category',p.category
                    )
                )
                order by p.name
              )
              from public.sale_items si
              join public.products p
                on p.id=si.product_id
              where si.sale_id=s.id
            ),
            '[]'::jsonb
          )
      ) as row_json
    from public.sales s
    where s.customer_id=v_batch.customer_id
      and s.record_type='lead'
    order by s.quoted_at desc
    limit 8
  ) q;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'interaction_type',ci.interaction_type,
        'occurred_at',ci.occurred_at,
        'due_at',ci.due_at,
        'completed_at',ci.completed_at,
        'channel',ci.channel,
        'outcome',ci.outcome,
        'notes',ci.notes,
        'status',ci.status
      )
      order by coalesce(
        ci.occurred_at,
        ci.created_at
      ) desc
    ),
    '[]'::jsonb
  )
  into v_interactions
  from (
    select *
    from public.customer_interactions
    where customer_id=v_batch.customer_id
    order by coalesce(
      occurred_at,
      created_at
    ) desc
    limit 12
  ) ci;

  return jsonb_build_object(
    'acompanhamento',
      jsonb_build_object(
        'id',v_batch.id,
        'data_prevista',v_batch.due_on,
        'quantidade_compras',v_batch.sale_count,
        'produtos_resumidos',v_batch.product_summary,
        'valor_total',v_batch.total_amount,
        'observacoes',v_batch.notes
      ),
    'cliente',
      coalesce(
        v_customer,
        '{}'::jsonb
      ),
    'compras_deste_acompanhamento',
      v_current_sales,
    'historico_recente_de_compras',
      v_history,
    'leads_recentes',
      v_leads,
    'interacoes_recentes',
      v_interactions
  );
end;
$$;

revoke all
on function public.post_sale_nexus_context(uuid)
from public,anon,authenticated;

grant execute
on function public.post_sale_nexus_context(uuid)
to service_role;

create or replace function public.post_sale_nexus_save_result(
  p_batch_id uuid,
  p_message text,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if nullif(btrim(p_message),'') is null then
    raise exception 'Mensagem vazia';
  end if;

  update public.post_sale_batches
  set ai_last_message=btrim(p_message),
      ai_last_generated_at=now(),
      ai_metadata=coalesce(
        p_metadata,
        '{}'::jsonb
      ),
      updated_at=now()
  where id=p_batch_id;

  if not found then
    raise exception
      'Acompanhamento de pós-venda não encontrado';
  end if;
end;
$$;

revoke all
on function public.post_sale_nexus_save_result(
  uuid,text,jsonb
)
from public,anon,authenticated;

grant execute
on function public.post_sale_nexus_save_result(
  uuid,text,jsonb
)
to service_role;

create or replace function public.central_customer_directory_snapshot(
  p_query text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_can_supplements boolean:=
    public.can_access_operation(
      'supplements'
    );
  v_can_fitness boolean:=
    public.can_access_operation(
      'fitness'
    );
  v_rows jsonb;
  v_total integer;
  v_both integer;
  v_supp integer;
  v_fit integer;
begin
  if not (
    v_can_supplements
    or v_can_fitness
  ) then
    raise exception
      'Acesso negado'
      using errcode='42501';
  end if;

  with raw as (
    select
      case
        when length(
          regexp_replace(
            coalesce(
              c.phone,
              s.phone,
              ''
            ),
            '\D',
            '',
            'g'
          )
        )>=8
          then
            'phone:'
            ||regexp_replace(
              coalesce(
                c.phone,
                s.phone,
                ''
              ),
              '\D',
              '',
              'g'
            )
        else
          'supplements:'
          ||c.id::text
      end as identity_key,
      'supplements'::text
        as operation,
      c.id
        as supplements_customer_id,
      null::uuid
        as fitness_customer_id,
      coalesce(
        c.name,
        s.reference,
        'Cliente'
      ) as customer_name,
      coalesce(
        c.phone,
        s.phone
      ) as phone,
      coalesce(
        c.city,
        s.city
      ) as city,
      count(*)::integer
        as purchase_count,
      coalesce(
        sum(s.total_amount),
        0
      )::numeric(14,2)
        as total_spent,
      max(
        coalesce(
          s.delivered_at,
          s.quoted_at
        )
      ) as last_purchase_at
    from public.sales s
    join public.customers c
      on c.id=s.customer_id
    where v_can_supplements
      and s.record_type='sale'
      and s.general_status<>'cancelled'
    group by
      c.id,
      c.name,
      c.phone,
      c.city,
      s.phone,
      s.city,
      s.reference

    union all

    select
      case
        when length(
          regexp_replace(
            coalesce(
              fc.phone,
              fs.customer_phone,
              ''
            ),
            '\D',
            '',
            'g'
          )
        )>=8
          then
            'phone:'
            ||regexp_replace(
              coalesce(
                fc.phone,
                fs.customer_phone,
                ''
              ),
              '\D',
              '',
              'g'
            )
        else
          'fitness:'
          ||coalesce(
            fc.id::text,
            fs.id::text
          )
      end,
      'fitness'::text,
      null::uuid,
      fc.id,
      coalesce(
        fc.name,
        fs.customer_name,
        'Cliente'
      ),
      coalesce(
        fc.phone,
        fs.customer_phone
      ),
      coalesce(
        fc.city,
        fs.customer_city
      ),
      count(*)::integer,
      coalesce(
        sum(fs.total_amount),
        0
      )::numeric(14,2),
      max(
        fs.quoted_on::timestamp
        with time zone
      )
    from public.fitness_sales fs
    left join public.fitness_customers fc
      on fc.id=fs.customer_id
    where v_can_fitness
      and fs.general_status<>'cancelled'
    group by
      fc.id,
      fc.name,
      fc.phone,
      fc.city,
      fs.customer_phone,
      fs.customer_city,
      fs.customer_name,
      fs.id
  ),
  grouped as (
    select
      identity_key,
      (
        array_agg(
          customer_name
          order by
            last_purchase_at desc
            nulls last
        )
      )[1] as display_name,
      (
        array_agg(
          phone
          order by
            last_purchase_at desc
            nulls last
        )
        filter (
          where phone is not null
        )
      )[1] as phone,
      (
        array_agg(
          city
          order by
            last_purchase_at desc
            nulls last
        )
        filter (
          where city is not null
        )
      )[1] as city,
      array_agg(
        distinct operation
        order by operation
      ) as operations,
      max(
        supplements_customer_id
      ) as supplements_customer_id,
      max(
        fitness_customer_id
      ) as fitness_customer_id,
      sum(
        purchase_count
      )::integer
        as purchase_count,
      sum(
        total_spent
      )::numeric(14,2)
        as total_spent,
      max(
        last_purchase_at
      ) as last_purchase_at
    from raw
    group by identity_key
  ),
  filtered as (
    select *
    from grouped
    where
      nullif(
        btrim(p_query),
        ''
      ) is null
      or lower(
        coalesce(
          display_name,
          ''
        )
        ||' '
        ||coalesce(
          phone,
          ''
        )
        ||' '
        ||coalesce(
          city,
          ''
        )
      )
      like
        '%'
        ||lower(
          btrim(p_query)
        )
        ||'%'
  )
  select
    coalesce(
      jsonb_agg(
        to_jsonb(f)
        order by
          f.last_purchase_at desc
          nulls last,
          f.display_name
      ),
      '[]'::jsonb
    ),
    count(*)::integer,
    count(*) filter(
      where array_length(
        f.operations,
        1
      )=2
    )::integer,
    count(*) filter(
      where
        'supplements'
        =any(f.operations)
    )::integer,
    count(*) filter(
      where
        'fitness'
        =any(f.operations)
    )::integer
  into
    v_rows,
    v_total,
    v_both,
    v_supp,
    v_fit
  from filtered f;

  return jsonb_build_object(
    'summary',
      jsonb_build_object(
        'total',
          coalesce(v_total,0),
        'both_operations',
          coalesce(v_both,0),
        'supplements',
          coalesce(v_supp,0),
        'fitness',
          coalesce(v_fit,0)
      ),
    'customers',
      coalesce(
        v_rows,
        '[]'::jsonb
      )
  );
end;
$$;

revoke all
on function public.central_customer_directory_snapshot(text)
from public,anon;

grant execute
on function public.central_customer_directory_snapshot(text)
to authenticated,service_role;

commit;
