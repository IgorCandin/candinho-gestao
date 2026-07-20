begin;

create or replace function public.customer_company_360_snapshot(
  p_customer_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_customer public.customers%rowtype;
  v_phone text;
  v_can_fitness boolean:=
    public.can_access_operation(
      'fitness'
    );
  v_fit_ids uuid[]:=
    array[]::uuid[];
  v_summary jsonb;
  v_timeline jsonb;
  v_fitness_matches jsonb;
begin
  if not public.can_access_operation(
    'supplements'
  ) then
    raise exception
      'Acesso negado'
      using errcode='42501';
  end if;

  select *
  into v_customer
  from public.customers
  where id=p_customer_id;

  if not found then
    return null;
  end if;

  v_phone:=
    regexp_replace(
      coalesce(
        v_customer.phone,
        ''
      ),
      '\D',
      '',
      'g'
    );

  if
    v_can_fitness
    and length(v_phone)>=8
  then
    select coalesce(
      array_agg(
        fc.id
        order by fc.created_at
      ),
      array[]::uuid[]
    )
    into v_fit_ids
    from public.fitness_customers fc
    where
      regexp_replace(
        coalesce(
          fc.phone,
          ''
        ),
        '\D',
        '',
        'g'
      )=v_phone;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',fc.id,
        'name',fc.name,
        'phone',fc.phone,
        'city',fc.city
      )
      order by fc.created_at
    ),
    '[]'::jsonb
  )
  into v_fitness_matches
  from public.fitness_customers fc
  where
    v_can_fitness
    and fc.id=any(
      v_fit_ids
    );

  select jsonb_build_object(
    'supplements_sales_count',
      (
        select count(*)
        from public.sales s
        where
          s.customer_id=
            p_customer_id
          and s.record_type=
            'sale'
          and s.general_status
            <>'cancelled'
      ),
    'supplements_spent',
      coalesce(
        (
          select sum(
            s.total_amount
          )
          from public.sales s
          where
            s.customer_id=
              p_customer_id
            and s.record_type=
              'sale'
            and s.general_status
              <>'cancelled'
        ),
        0
      ),
    'fitness_sales_count',
      case
        when v_can_fitness
        then (
          select count(*)
          from public.fitness_sales fs
          where
            fs.general_status
              <>'cancelled'
            and (
              fs.customer_id=
                any(v_fit_ids)
              or (
                length(v_phone)>=8
                and regexp_replace(
                  coalesce(
                    fs.customer_phone,
                    ''
                  ),
                  '\D',
                  '',
                  'g'
                )=v_phone
              )
            )
        )
        else 0
      end,
    'fitness_spent',
      case
        when v_can_fitness
        then coalesce(
          (
            select sum(
              fs.total_amount
            )
            from public.fitness_sales fs
            where
              fs.general_status
                <>'cancelled'
              and (
                fs.customer_id=
                  any(v_fit_ids)
                or (
                  length(v_phone)>=8
                  and regexp_replace(
                    coalesce(
                      fs.customer_phone,
                      ''
                    ),
                    '\D',
                    '',
                    'g'
                  )=v_phone
                )
              )
          ),
          0
        )
        else 0
      end,
    'lead_count',
      (
        select count(*)
        from public.sales s
        where
          s.customer_id=
            p_customer_id
          and s.record_type=
            'lead'
          and s.general_status
            <>'cancelled'
      ),
    'interaction_count',
      (
        select count(*)
        from public.customer_interactions ci
        where
          ci.customer_id=
            p_customer_id
      ),
    'post_sale_open_count',
      (
        select count(*)
        from public.post_sale_batches pb
        where
          pb.customer_id=
            p_customer_id
          and pb.status=
            'planned'
      ),
    'post_sale_total_count',
      (
        select count(*)
        from public.post_sale_batches pb
        where
          pb.customer_id=
            p_customer_id
      ),
    'return_cases_count',
      (
        select count(*)
        from public.return_cases rc
        where
          (
            rc.operation=
              'supplements'
            and rc.customer_id=
              p_customer_id
          )
          or (
            length(v_phone)>=8
            and regexp_replace(
              coalesce(
                rc.customer_phone,
                ''
              ),
              '\D',
              '',
              'g'
            )=v_phone
            and (
              rc.operation=
                'supplements'
              or v_can_fitness
            )
          )
      ),
    'open_return_cases_count',
      (
        select count(*)
        from public.return_cases rc
        where
          rc.status not in (
            'resolved',
            'rejected',
            'cancelled'
          )
          and (
            (
              rc.operation=
                'supplements'
              and rc.customer_id=
                p_customer_id
            )
            or (
              length(v_phone)>=8
              and regexp_replace(
                coalesce(
                  rc.customer_phone,
                  ''
                ),
                '\D',
                '',
                'g'
              )=v_phone
              and (
                rc.operation=
                  'supplements'
                or v_can_fitness
              )
            )
          )
      ),
    'consignments_count',
      case
        when v_can_fitness
        then (
          select count(*)
          from public.fitness_consignments fc
          where
            fc.customer_id=
              any(v_fit_ids)
        )
        else 0
      end,
    'open_consignments_count',
      case
        when v_can_fitness
        then (
          select count(*)
          from public.fitness_consignments fc
          where
            fc.customer_id=
              any(v_fit_ids)
            and fc.status in (
              'open',
              'partial'
            )
        )
        else 0
      end,
    'total_company_spent',
      coalesce(
        (
          select sum(
            s.total_amount
          )
          from public.sales s
          where
            s.customer_id=
              p_customer_id
            and s.record_type=
              'sale'
            and s.general_status
              <>'cancelled'
        ),
        0
      )
      +
      case
        when v_can_fitness
        then coalesce(
          (
            select sum(
              fs.total_amount
            )
            from public.fitness_sales fs
            where
              fs.general_status
                <>'cancelled'
              and (
                fs.customer_id=
                  any(v_fit_ids)
                or (
                  length(v_phone)>=8
                  and regexp_replace(
                    coalesce(
                      fs.customer_phone,
                      ''
                    ),
                    '\D',
                    '',
                    'g'
                  )=v_phone
                )
              )
          ),
          0
        )
        else 0
      end,
    'last_company_purchase_at',
      (
        select max(
          x.event_at
        )
        from (
          select coalesce(
            s.delivered_at,
            s.quoted_at
          ) as event_at
          from public.sales s
          where
            s.customer_id=
              p_customer_id
            and s.record_type=
              'sale'
            and s.general_status
              <>'cancelled'

          union all

          select (
            coalesce(
              fs.delivered_on,
              fs.quoted_on
            )::timestamp
            at time zone
              'America/Sao_Paulo'
          )
          from public.fitness_sales fs
          where
            v_can_fitness
            and fs.general_status
              <>'cancelled'
            and (
              fs.customer_id=
                any(v_fit_ids)
              or (
                length(v_phone)>=8
                and regexp_replace(
                  coalesce(
                    fs.customer_phone,
                    ''
                  ),
                  '\D',
                  '',
                  'g'
                )=v_phone
              )
            )
        ) x
      ),
    'has_fitness_identity',
      cardinality(
        v_fit_ids
      )>0,
    'fitness_identity_count',
      cardinality(
        v_fit_ids
      )
  )
  into v_summary;

  with events as (
    select
      coalesce(
        s.delivered_at,
        s.quoted_at
      ) as event_at,
      'supplements_sale'::text
        as event_type,
      'supplements'::text
        as operation,
      'Compra em Suplementos'::text
        as title,
      coalesce(
        (
          select string_agg(
            p.name
            ||case
              when si.quantity>1
                then
                  ' ×'
                  ||si.quantity::text
              else ''
            end,
            ', '
            order by p.name
          )
          from public.sale_items si
          join public.products p
            on p.id=si.product_id
          where si.sale_id=s.id
        ),
        'Venda registrada'
      ) as subtitle,
      s.total_amount::numeric
        as amount,
      s.general_status::text
        as status,
      '/vendas/'
        ||s.id::text
        as href
    from public.sales s
    where
      s.customer_id=
        p_customer_id
      and s.record_type=
        'sale'
      and s.general_status
        <>'cancelled'

    union all

    select
      s.quoted_at,
      'lead',
      'supplements',
      'Lead / interesse em Suplementos',
      coalesce(
        (
          select string_agg(
            p.name
            ||case
              when si.quantity>1
                then
                  ' ×'
                  ||si.quantity::text
              else ''
            end,
            ', '
            order by p.name
          )
          from public.sale_items si
          join public.products p
            on p.id=si.product_id
          where si.sale_id=s.id
        ),
        coalesce(
          s.notes,
          'Interesse registrado'
        )
      ),
      null::numeric,
      coalesce(
        s.lead_status,
        s.general_status::text
      ),
      '/leads/'
        ||s.id::text
    from public.sales s
    where
      s.customer_id=
        p_customer_id
      and s.record_type=
        'lead'
      and s.general_status
        <>'cancelled'

    union all

    select
      coalesce(
        ci.occurred_at,
        ci.completed_at,
        ci.due_at::timestamp
          at time zone
            'America/Sao_Paulo',
        ci.created_at
      ),
      'interaction',
      'supplements',
      'Interação no CRM',
      coalesce(
        ci.outcome,
        ci.notes,
        ci.interaction_type
      ),
      null::numeric,
      ci.status,
      '/clientes/'
        ||p_customer_id::text
    from public.customer_interactions ci
    where
      ci.customer_id=
        p_customer_id

    union all

    select
      coalesce(
        pb.completed_at,
        pb.due_on::timestamp
          at time zone
            'America/Sao_Paulo',
        pb.created_at
      ),
      'post_sale',
      'supplements',
      'Pós-venda',
      case
        when pb.status=
          'completed'
          then
            'Acompanhamento concluído'
        when pb.status=
          'cancelled'
          then
            'Acompanhamento cancelado'
        else
          'Contato previsto para '
          ||to_char(
            pb.due_on,
            'DD/MM/YYYY'
          )
      end,
      null::numeric,
      pb.status,
      '/pos-venda/'
        ||pb.id::text
    from public.post_sale_batches pb
    where
      pb.customer_id=
        p_customer_id

    union all

    select
      (
        coalesce(
          fs.delivered_on,
          fs.quoted_on
        )::timestamp
        at time zone
          'America/Sao_Paulo'
      ),
      'fitness_sale',
      'fitness',
      'Compra na Fitness',
      coalesce(
        (
          select string_agg(
            fp.name
            ||' · '
            ||fv.color
            ||' · '
            ||fv.size
            ||case
              when fsi.quantity>1
                then
                  ' ×'
                  ||fsi.quantity::text
              else ''
            end,
            ', '
            order by
              fp.name,
              fv.color,
              fv.size
          )
          from public.fitness_sale_items fsi
          join public.fitness_variants fv
            on fv.id=
              fsi.variant_id
          join public.fitness_products fp
            on fp.id=
              fv.product_id
          where
            fsi.sale_id=
              fs.id
        ),
        'Venda Fitness registrada'
      ),
      fs.total_amount::numeric,
      fs.general_status,
      '/fitness/vendas/'
        ||fs.id::text
    from public.fitness_sales fs
    where
      v_can_fitness
      and fs.general_status
        <>'cancelled'
      and (
        fs.customer_id=
          any(v_fit_ids)
        or (
          length(v_phone)>=8
          and regexp_replace(
            coalesce(
              fs.customer_phone,
              ''
            ),
            '\D',
            '',
            'g'
          )=v_phone
        )
      )

    union all

    select
      fc.started_on::timestamp
        at time zone
          'America/Sao_Paulo',
      'consignment',
      'fitness',
      'Peças em prova / consignação',
      coalesce(
        (
          select string_agg(
            fp.name
            ||' · '
            ||fv.color
            ||' · '
            ||fv.size
            ||' ×'
            ||fci.quantity_sent::text,
            ', '
            order by
              fp.name,
              fv.color,
              fv.size
          )
          from public.fitness_consignment_items fci
          join public.fitness_variants fv
            on fv.id=
              fci.variant_id
          join public.fitness_products fp
            on fp.id=
              fv.product_id
          where
            fci.consignment_id=
              fc.id
        ),
        coalesce(
          fc.notes,
          'Consignação registrada'
        )
      ),
      null::numeric,
      fc.status,
      '/fitness/consignacoes/'
        ||fc.id::text
    from public.fitness_consignments fc
    where
      v_can_fitness
      and fc.customer_id=
        any(v_fit_ids)

    union all

    select
      rc.requested_on::timestamp
        at time zone
          'America/Sao_Paulo',
      'return_case',
      rc.operation,
      case
        when rc.case_type=
          'exchange'
          then 'Troca'
        when rc.case_type=
          'return'
          then 'Devolução'
        when rc.case_type=
          'warranty'
          then
            'Garantia / defeito'
        else
          'Ocorrência pós-venda'
      end,
      rc.reason,
      case
        when rc.refund_amount>0
          then rc.refund_amount
        else null
      end,
      rc.status,
      '/trocas/'
        ||rc.id::text
    from public.return_cases rc
    where
      (
        rc.operation=
          'supplements'
        and rc.customer_id=
          p_customer_id
      )
      or (
        length(v_phone)>=8
        and regexp_replace(
          coalesce(
            rc.customer_phone,
            ''
          ),
          '\D',
          '',
          'g'
        )=v_phone
        and (
          rc.operation=
            'supplements'
          or v_can_fitness
        )
      )
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'event_at',
          event_at,
        'event_type',
          event_type,
        'operation',
          operation,
        'title',
          title,
        'subtitle',
          subtitle,
        'amount',
          amount,
        'status',
          status,
        'href',
          href
      )
      order by
        event_at desc
    ),
    '[]'::jsonb
  )
  into v_timeline
  from (
    select *
    from events
    order by
      event_at desc
    limit 100
  ) x;

  return jsonb_build_object(
    'customer',
      jsonb_build_object(
        'id',
          v_customer.id,
        'name',
          v_customer.name,
        'phone',
          v_customer.phone,
        'city',
          v_customer.city
      ),
    'summary',
      coalesce(
        v_summary,
        '{}'::jsonb
      ),
    'fitness_matches',
      coalesce(
        v_fitness_matches,
        '[]'::jsonb
      ),
    'timeline',
      coalesce(
        v_timeline,
        '[]'::jsonb
      )
  );
end;
$$;

revoke all
on function public.customer_company_360_snapshot(uuid)
from public,anon;

grant execute
on function public.customer_company_360_snapshot(uuid)
to authenticated,service_role;

commit;
