-- Legacy queue actions already create customer_interactions in the same transaction.
-- Reuse that readable, RLS-protected history rather than exposing the private attempts table.
create or replace view public.customer_commercial_contact_state_v1 with (security_invoker=true) as
with touches as (
  select customer_id,created_at as contacted_at from public.customer_sales_opportunity_feedback where feedback_status='contacted'
  union all
  select customer_id,coalesce(occurred_at,completed_at) from public.customer_interactions
  where status='completed' and coalesce(occurred_at,completed_at) is not null
    and interaction_type in ('follow_up','post_sale','contact')
), last_touch as (
  select customer_id,max(contacted_at) as last_contact_at from touches group by customer_id
), feedback as (
  select distinct on (customer_id) customer_id,feedback_status,next_action_on,created_at
  from public.customer_sales_opportunity_feedback order by customer_id,created_at desc,id desc
), interactions as (
  select distinct on (customer_id) customer_id,
    (coalesce(occurred_at,completed_at) at time zone 'America/Sao_Paulo')::date+
      case outcome when 'no_response' then 7 when 'responded' then 3 else 2 end as next_eligible_on
  from public.customer_interactions where status='completed' and coalesce(occurred_at,completed_at) is not null
    and interaction_type in ('follow_up','post_sale','contact')
  order by customer_id,coalesce(occurred_at,completed_at) desc,id desc
)
select c.id as customer_id,t.last_contact_at,
  greatest(
    (t.last_contact_at at time zone 'America/Sao_Paulo')::date+2,
    case when f.feedback_status in ('contacted','later','still_using') then
      coalesce(f.next_action_on,(f.created_at at time zone 'America/Sao_Paulo')::date+
        case when f.feedback_status='still_using' then 14 when f.feedback_status='later' then 7 else 2 end) end,
    i.next_eligible_on
  ) as pause_until
from public.customers c left join last_touch t on t.customer_id=c.id
left join feedback f on f.customer_id=c.id left join interactions i on i.customer_id=c.id;

create or replace view public.commercial_contact_days_v1 with (security_invoker=true) as
select distinct customer_id,(contacted_at at time zone 'America/Sao_Paulo')::date as contacted_on
from (
  select customer_id,created_at as contacted_at from public.customer_sales_opportunity_feedback where feedback_status='contacted'
  union all select customer_id,coalesce(occurred_at,completed_at) from public.customer_interactions
    where status='completed' and interaction_type in ('follow_up','post_sale','contact')
) t where customer_id is not null and contacted_at is not null;
