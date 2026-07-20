begin;

create or replace function public.partner_legacy_history_snapshot(
  p_partner_id uuid
)
returns table(
  id text,
  occurred_at timestamptz,
  movement_type text,
  quantity numeric,
  product text,
  origin_code text,
  destination_code text,
  notes text
)
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_original_id text;
  v_source_sheet text;
  v_marker text;
begin
  if not public.can_access_operation(
    'supplements'
  ) then
    raise exception
      'Acesso negado'
      using errcode='42501';
  end if;

  select
    p.original_id,
    p.source_sheet
  into
    v_original_id,
    v_source_sheet
  from public.partners p
  where p.id=p_partner_id;

  if
    not found
    or v_original_id is null
    or v_source_sheet<>'PARCEIROS'
  then
    return;
  end if;

  v_marker:=
    'parceiro original: '
    ||v_original_id;

  return query
  with source_rows as (
    select
      coalesce(
        nullif(
          ih.partner_movement_original_id,
          ''
        ),
        ih.occurred_at::text
        ||':'
        ||coalesce(
          pr.name,
          'Produto'
        )
        ||':'
        ||coalesce(
          ih.movement_type,
          'Movimentação'
        )
      ) as dedupe_key,
      ih.occurred_at,
      coalesce(
        ih.movement_type,
        'Movimentação'
      ) as movement_type,
      ih.quantity,
      coalesce(
        pr.name,
        'Produto'
      ) as product,
      ih.origin_code,
      ih.destination_code,
      ih.notes,
      row_number() over (
        partition by coalesce(
          nullif(
            ih.partner_movement_original_id,
            ''
          ),
          ih.occurred_at::text
          ||':'
          ||coalesce(
            pr.name,
            'Produto'
          )
          ||':'
          ||coalesce(
            ih.movement_type,
            'Movimentação'
          )
        )
        order by
          case
            when ih.destination_code
              is not null
              then 0
            else 1
          end,
          ih.occurred_at desc,
          ih.id
      ) as rn
    from public.inventory_history ih
    left join public.products pr
      on pr.id=ih.product_id
    where
      ih.notes ilike
        '%'||v_marker||'%'
      and coalesce(
        ih.notes,
        ''
      ) not ilike
        '%marco zero teste%'
  )
  select
    s.dedupe_key,
    s.occurred_at,
    s.movement_type,
    s.quantity,
    s.product,
    s.origin_code,
    s.destination_code,
    s.notes
  from source_rows s
  where s.rn=1
  order by
    s.occurred_at desc;
end;
$$;

revoke all
on function public.partner_legacy_history_snapshot(uuid)
from public,anon;

grant execute
on function public.partner_legacy_history_snapshot(uuid)
to authenticated,service_role;

commit;
