insert into public.central_quick_replies(operation_scope,title,body,sort_order)
select 'company','Saudação','Olá! Tudo bem? Como posso te ajudar?',10
where not exists(select 1 from public.central_quick_replies where operation_scope='company' and lower(title)='saudação');
insert into public.central_quick_replies(operation_scope,title,body,sort_order)
select 'supplements','Entender objetivo','Me conta qual é o seu objetivo hoje e como está sua rotina de treino ou alimentação. Assim consigo te orientar melhor sem te indicar algo no escuro.',20
where not exists(select 1 from public.central_quick_replies where operation_scope='supplements' and lower(title)='entender objetivo');
insert into public.central_quick_replies(operation_scope,title,body,sort_order)
select 'fitness','Entender o que procura','Me conta qual tipo de peça você está procurando e o tamanho que costuma usar. Assim consigo te mostrar as opções mais próximas do que você precisa.',20
where not exists(select 1 from public.central_quick_replies where operation_scope='fitness' and lower(title)='entender o que procura');
