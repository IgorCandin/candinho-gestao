begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='admin' and active and can_access_fitness limit 1),true);
select set_config('test.fitness_contact_admin',auth.uid()::text,true);
with fixture as (insert into public.fitness_customers(name) values('TESTE ROLLBACK contato oportunidade 20261019') returning id)
select set_config('test.fitness_contact_customer',id::text,true) from fixture;
do $test$
declare c uuid:=current_setting('test.fitness_contact_customer')::uuid; s jsonb; d date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 s:=public.record_fitness_opportunity_contact_v1(c,'contacted',0,null,'Conversei');
 if s->>'next_contact_on'<>(d+6)::text or (s->>'revision')::int<>1 then raise exception 'Espera de contato incorreta'; end if;
 begin perform public.record_fitness_opportunity_contact_v1(c,'later',0,d+10,null);raise exception 'Aceitou versão antiga';exception when serialization_failure then null;end;
 begin perform public.record_fitness_opportunity_contact_v1(c,'later',1,d,null);raise exception 'Aceitou retorno passado';exception when invalid_parameter_value then null;end;
 s:=public.record_fitness_opportunity_contact_v1(c,'responded',1,null,'Respondeu');
 if s->>'next_contact_on' is not null or s->>'status'<>'responded' then raise exception 'Resposta incorreta';end if;
 s:=public.record_fitness_opportunity_contact_v1(c,'later',2,d+12,'Retorno combinado');
 if (s->>'revision')::int<>3 or s->>'next_contact_on'<>(d+12)::text then raise exception 'Retorno incorreto';end if;
 if (select count(*) from public.fitness_opportunity_contact_history where customer_id=c)<>3 then raise exception 'Histórico incompleto ou duplicado';end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin perform public.record_fitness_opportunity_contact_v1(c,'responded',3,null,null);raise exception 'Permitiu acesso sem escrita';exception when insufficient_privilege then null;end;
end $test$;
set local role authenticated;
do $test$
begin
 if exists(select 1 from public.fitness_opportunity_contact_state) then raise exception 'RLS expôs contato sem acesso Fitness';end if;
 begin update public.fitness_opportunity_contact_state set status='responded';raise exception 'Permitiu escrita direta';exception when insufficient_privilege then null;end;
end $test$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.fitness_contact_admin'),true);
set local role authenticated;
do $test$
begin
 if not exists(select 1 from public.fitness_opportunity_contact_state where customer_id=current_setting('test.fitness_contact_customer')::uuid and revision=3) then raise exception 'Leitura autorizada falhou';end if;
end $test$;
reset role;
set local role anon;
do $test$
begin
 begin perform public.record_fitness_opportunity_contact_v1(current_setting('test.fitness_contact_customer')::uuid,'responded',3,null,null);raise exception 'Anônimo executou RPC';exception when insufficient_privilege then null;end;
end $test$;
reset role;
select 'PASS: contato, resposta, retorno, histórico, conflito, data e permissões; fixture rollback' as result;
rollback;
