-- Add explicit cash and up-to-3-installment pricing to the public backend
-- payload without changing or replacing the existing public RPC.

create or replace function public.public_storefront_snapshot_v2(
  p_limit integer default 300
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb := public.public_storefront_snapshot(p_limit);
  v_supplements jsonb;
begin
  select coalesce(
    jsonb_agg(
      item || jsonb_build_object(
        'cash_price', p.sale_price,
        'installment_price', p.installment_price,
        'installments_max', case
          when coalesce(p.installment_price, 0) > 0 then 3
          else null
        end,
        'installment_value', case
          when coalesce(p.installment_price, 0) > 0
            then round(p.installment_price / 3.0, 2)
          else null
        end
      )
      order by source.ordinality
    ),
    '[]'::jsonb
  )
  into v_supplements
  from jsonb_array_elements(
    coalesce(v_snapshot #> '{products,supplements}', '[]'::jsonb)
  ) with ordinality as source(item, ordinality)
  left join public.products p on p.id::text = source.item ->> 'id';

  return jsonb_set(
    v_snapshot,
    '{products,supplements}',
    v_supplements,
    true
  );
end;
$$;

revoke all on function public.public_storefront_snapshot_v2(integer)
from public, anon, authenticated;
grant execute on function public.public_storefront_snapshot_v2(integer)
to anon, authenticated, service_role;

do $verification$
declare
  v_snapshot jsonb;
begin
  v_snapshot := public.public_storefront_snapshot_v2(1);

  if jsonb_typeof(v_snapshot #> '{products,supplements}') <> 'array' then
    raise exception 'Storefront installment payload verification failed';
  end if;
end
$verification$;
