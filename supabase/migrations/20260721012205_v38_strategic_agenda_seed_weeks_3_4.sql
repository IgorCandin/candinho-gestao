insert into public.central_strategic_agenda_templates
(code,week_number,task,objective,priority,category,action_href,action_label,sort_order)
values
('014',3,'Ações do dia','Resolver pendências rápidas e manter organização.','high','Relacionamento','/central/prioridades','Abrir Prioridades',14),
('015',3,'Postar conteúdos principais','Fortalecer autoridade e aquecer leads.','medium','Marketing','/marketing','Abrir Marketing',15),
('016',3,'Identificar produto com maior lucro','Entender quais produtos mais fortalecem o caixa.','medium','Operacional','/central/executivo','Abrir Sala do Dono',16),
('017',3,'Criar 3ª oportunidade de conversa','Aumentar presença e gerar novas oportunidades de venda.','high','Relacionamento','/clientes/radar','Abrir Radar',17),
('018',3,'Recomprar produtos de baixo estoque','Manter giro saudável sem travar caixa.','low','Operacional','/pedidos-fornecedor/planejamento','Planejar reposição',18),
('019',3,'Gravar 2 stories falando de produtos','Gerar proximidade e reforçar autoridade.','high','Marketing','/marketing','Abrir Marketing',19),
('020',3,'Atualizar Linkedin 2º',null,'low','Empresarial',null,null,20),
('021',3,'ESCREVER E ANALISAR IDEIAS - SEMANA 3','Refletir sobre melhorias e novas estratégias.','extreme','Crescimento','/central/midia?scope=marketing','Abrir ideias',21),
('022',4,'Fazer pós-venda estratégico - 2ª parte','Reforçar relacionamento e aumentar recompra.','medium','Relacionamento','/agenda','Abrir pós-venda',22),
('023',4,'Criar promoção do mês seguinte','Entrar no próximo mês já com campanha preparada.','high','Marketing','/central/promocoes','Abrir Promoções',23),
('024',4,'Calcular giro mensal','Entender saída dos produtos e prever reposição.','high','Operacional','/estoque/inteligencia','Abrir inteligência',24),
('025',4,'Criar 4ª oportunidade de conversa','Gerar novas conexões e manter networking ativo.','high','Relacionamento','/clientes/radar','Abrir Radar',25),
('026',4,'Atualizar Google Maps 2º',null,'medium','Operacional',null,null,26),
('027',4,'ESCREVER E ANALISAR IDEIAS - SEMANA 4','Planejar melhorias contínuas para o próximo mês.','extreme','Crescimento','/central/midia?scope=marketing','Abrir ideias',27)
on conflict(code) do update set
week_number=excluded.week_number,task=excluded.task,objective=excluded.objective,priority=excluded.priority,category=excluded.category,action_href=excluded.action_href,action_label=excluded.action_label,sort_order=excluded.sort_order,active=true,updated_at=now();
