begin;
create table public.fitness_opportunity_contact_state (
 customer_id uuid primary key references public.fitness_customers(id) on delete cascade,
 status text not null check(status in ('contacted','responded','later')),
 next_contact_on date,
 notes text check(char_length(notes)<=1000),
 revision bigint not null check(revision>0),
 updated_at timestamptz not null default clock_timestamp(),
 updated_by uuid not null,
 check((status='responded' and next_contact_on is null) or (status in ('contacted','later') and next_contact_on is not null))
);
create table public.fitness_opportunity_contact_history (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.fitness_customers(id) on delete cascade,
 status text not null check(status in ('contacted','responded','later')),
 next_contact_on date, notes text check(char_length(notes)<=1000),
 revision bigint not null, created_at timestamptz not null, created_by uuid not null,
 unique(customer_id,revision)
);
create index fitness_opportunity_contact_due on public.fitness_opportunity_contact_state(next_contact_on,customer_id);
alter table public.fitness_opportunity_contact_state enable row level security;
alter table public.fitness_opportunity_contact_history enable row level security;
revoke all on public.fitness_opportunity_contact_state, public.fitness_opportunity_contact_history from public,anon,authenticated;
grant select on public.fitness_opportunity_contact_state,public.fitness_opportunity_contact_history to authenticated;
grant all on public.fitness_opportunity_contact_state,public.fitness_opportunity_contact_history to service_role;
create policy fitness_opportunity_contact_state_read on public.fitness_opportunity_contact_state for select to authenticated using ((select public.can_access_operation('fitness')));
create policy fitness_opportunity_contact_history_read on public.fitness_opportunity_contact_history for select to authenticated using ((select public.can_access_operation('fitness')));

create function public.record_fitness_opportunity_contact_v1(p_customer_id uuid,p_status text,p_expected_revision bigint,p_next_contact_on date default null,p_notes text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_today date := (now() at time zone 'America/Sao_Paulo')::date; v_current public.fitness_opportunity_contact_state; v_next date; v_revision bigint; v_now timestamptz:=clock_timestamp();
begin
 if auth.uid() is null or not coalesce(public.can_write_fitness(),false) then raise exception 'Sem permissão para registrar contato Fitness.' using errcode='42501'; end if;
 if p_status is null or p_status not in ('contacted','responded','later') then raise exception 'Resultado de contato inválido.' using errcode='22023'; end if;
 if p_expected_revision is null or p_expected_revision<0 then raise exception 'Versão de contato inválida.' using errcode='22023'; end if;
 if char_length(p_notes)>1000 then raise exception 'Observação excede 1000 caracteres.' using errcode='22023'; end if;
 if p_status='later' and (p_next_contact_on is null or p_next_contact_on<=v_today) then raise exception 'Escolha uma data futura para retornar.' using errcode='22023'; end if;
 if p_status<>'later' and p_next_contact_on is not null then raise exception 'Data de retorno incompatível com o resultado.' using errcode='22023'; end if;
 if not exists(select 1 from public.fitness_customers where id=p_customer_id and active) then raise exception 'Cliente Fitness ativa não encontrada.' using errcode='22023'; end if;
 -- Serialize only this contact, including its first record. Never lock sale/stock rows.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fitness-opportunity-contact:'||p_customer_id::text,0));
 select * into v_current from public.fitness_opportunity_contact_state where customer_id=p_customer_id for update;
 if coalesce(v_current.revision,0)<>p_expected_revision then raise exception 'Este contato foi atualizado em outra tela. Atualize para continuar.' using errcode='40001'; end if;
 v_next:=case when p_status='contacted' then v_today+6 when p_status='later' then p_next_contact_on else null end;
 v_revision:=coalesce(v_current.revision,0)+1;
 insert into public.fitness_opportunity_contact_state(customer_id,status,next_contact_on,notes,revision,updated_at,updated_by)
 values(p_customer_id,p_status,v_next,nullif(btrim(p_notes),''),v_revision,v_now,auth.uid())
 on conflict(customer_id) do update set status=excluded.status,next_contact_on=excluded.next_contact_on,notes=excluded.notes,revision=excluded.revision,updated_at=excluded.updated_at,updated_by=excluded.updated_by returning * into v_current;
 insert into public.fitness_opportunity_contact_history(customer_id,status,next_contact_on,notes,revision,created_at,created_by)
 values(p_customer_id,p_status,v_next,v_current.notes,v_revision,v_now,auth.uid());
 return to_jsonb(v_current);
end; $$;
revoke all on function public.record_fitness_opportunity_contact_v1(uuid,text,bigint,date,text) from public,anon,authenticated;
grant execute on function public.record_fitness_opportunity_contact_v1(uuid,text,bigint,date,text) to authenticated,service_role;
commit;
