insert into public.central_strategic_agenda_templates
(code,week_number,task,objective,priority,category,action_href,action_label,sort_order)
values
('001',1,'Reativar clientes antigos','Gerar recompra com clientes frios e fortalecer relacionamento.','high','Relacionamento','/clientes/radar','Abrir Radar',1),
('002',1,'Postar promoção do mês','Abrir o mês com oferta clara e gerar movimento rápido.','high','Marketing','/central/promocoes','Abrir Promoções',2),
('003',1,'Ver top 3 produtos vendidos','Identificar produtos campeões para focar vendas e estoque.','low','Operacional','/suplementos/painel','Abrir Painel',3),
('004',1,'Repor estoque','Evitar perda de venda por falta de produto.','extreme','Operacional','/pedidos-fornecedor/planejamento','Planejar reposição',4),
('005',1,'Criar 1ª oportunidade de conversa','Gerar vendas espontâneas através de relacionamento.','high','Relacionamento','/clientes/radar','Abrir Radar',5),
('006',1,'Atualizar Linkedin 1º',null,'low','Empresarial',null,null,6),
('007',1,'ESCREVER E ANALISAR IDEIAS - SEMANA 1','Registrar ideias estratégicas e melhorias para crescimento.','extreme','Crescimento','/central/midia?scope=marketing','Abrir ideias',7),
('008',2,'Criar 1 post institucional','Fortalecer marca e gerar autoridade regional.','medium','Marketing','/marketing','Abrir Marketing',8),
('009',2,'Fazer pós-venda estratégico - 1ª parte','Colher feedback, gerar confiança e abrir novas vendas.','medium','Relacionamento','/agenda','Abrir pós-venda',9),
('010',2,'Separar 3 ideias de reels','Criar conteúdos com potencial de alcance e conexão.','high','Marketing','/central/midia?scope=marketing','Abrir ideias',10),
('011',2,'Criar 2ª oportunidade de conversa','Gerar networking e possíveis clientes novos.','high','Relacionamento','/clientes/radar','Abrir Radar',11),
('012',2,'Atualizar Google Maps 1º',null,'medium','Operacional',null,null,12),
('013',2,'ESCREVER E ANALISAR IDEIAS - SEMANA 2','Analisar melhorias práticas para empresa e vendas.','extreme','Crescimento','/central/midia?scope=marketing','Abrir ideias',13)
on conflict(code) do update set
week_number=excluded.week_number,task=excluded.task,objective=excluded.objective,priority=excluded.priority,category=excluded.category,action_href=excluded.action_href,action_label=excluded.action_label,sort_order=excluded.sort_order,active=true,updated_at=now();
