-- Link legacy partnership markers to the real Pâmella partner record.
with pamella as (
  select id from public.partners where lower(name)=lower('C.T.S. Pâmella Nunes') limit 1
)
update public.sales s
set partner_id=(select id from pamella),
    partnership='C.T.S. Pâmella Nunes',
    updated_at=now()
where s.record_type='sale'
  and lower(coalesce(s.partnership,'')) in ('true','c.t.s. pâmella nunes')
  and exists(select 1 from pamella);

with pamella as (
  select id from public.partners where lower(name)=lower('C.T.S. Pâmella Nunes') limit 1
), first_sale as (
  select min((s.quoted_at at time zone 'America/Sao_Paulo')::date) as first_date
  from public.sales s
  where s.partner_id=(select id from pamella)
    and s.record_type='sale'
)
update public.partners p
set counts_only_delivered=false,
    start_date=coalesce((select first_date from first_sale),p.start_date),
    updated_at=now()
where p.id=(select id from pamella);
