update public.commercial_contact_attempts
set next_eligible_on=((now() at time zone 'America/Sao_Paulo')::date+1)
where action='skipped'
  and (occurred_at at time zone 'America/Sao_Paulo')::date=(now() at time zone 'America/Sao_Paulo')::date
  and coalesce(next_eligible_on,(now() at time zone 'America/Sao_Paulo')::date)<=(now() at time zone 'America/Sao_Paulo')::date;
