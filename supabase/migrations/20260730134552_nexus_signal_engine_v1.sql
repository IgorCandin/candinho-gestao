begin;

create or replace function public.refresh_nexus_signals_v1()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_refresh timestamptz := clock_timestamp();
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_open integer := 0;
begin
  if not public.can_write() then
    raise exception 'Usuário sem permissão para atualizar sinais do Nexus';
  end if;

  -- =======================================================
  -- LEADS: só reaparece quando realmente ficou sem contato.
  -- O último contato cadastrado no cliente faz o lead sair
  -- da fila inteligente, mesmo que continue no histórico.
  -- =======================================================
  insert into public.nexus_signals(
    fingerprint,signal_type,severity,operation_scope,
    entity_type,entity_id,customer_id,title,summary,rationale,
    recommended_action,action_label,action_href,score,status,
    metadata,first_seen_at,last_seen_at,resolved_at
  )
  select
    'lead:'||l.id::text||':followup',
    'lead_followup',
    case when extract(epoch from (v_refresh-last_touch.last_touch))/86400 >= 7
      then 'urgent' else 'attention' end,
    'supplements','lead',l.id,l.customer_id,
    'Retomar '||coalesce(c.name,'cliente'),
    concat_ws(' · ',prod.product_summary,
      'sem novo contato há '||
      greatest(floor(extract(epoch from (v_refresh-last_touch.last_touch))/86400),0)::int||' dia(s)'),
    'O lead continua aberto, mas o último contato registrado ficou para trás.',
    'Abra o lead, revise o contexto e decida se vale chamar agora.',
    'Abrir lead','/leads/'||l.id::text,
    60 + least(greatest(floor(extract(epoch from (v_refresh-last_touch.last_touch))/86400),0),20),
    'open',
    jsonb_build_object(
      'last_touch',last_touch.last_touch,
      'lead_status',l.lead_status,
      'product_summary',prod.product_summary
    ),
    v_refresh,v_refresh,null
  from public.sales l
  left join public.customers c on c.id=l.customer_id
  left join lateral (
    select string_agg(distinct p.name,', ' order by p.name) product_summary
    from public.sale_items si
    join public.products p on p.id=si.product_id
    where si.sale_id=l.id
  ) prod on true
  left join lateral (
    select greatest(
      coalesce(l.quoted_at,l.created_at),
      coalesce(c.last_contact_at,'epoch'::timestamptz),
      coalesce((
        select max(coalesce(ci.completed_at,ci.occurred_at,ci.created_at))
        from public.customer_interactions ci
        where ci.customer_id=l.customer_id
          and (ci.completed_at is not null or lower(coalesce(ci.status,'')) in ('completed','done','concluido','concluído'))
      ),'epoch'::timestamptz)
    ) last_touch
  ) last_touch on true
  where l.record_type::text='lead'
    and l.general_status::text not in ('finalized','cancelled')
    and coalesce(l.lead_status,'')<>'Convertido'
    and (c.next_contact_at is null or c.next_contact_at<=v_today)
    and last_touch.last_touch<=v_refresh-interval '3 days'
    and last_touch.last_touch>=v_refresh-interval '30 days'
  on conflict(fingerprint) do update set
    severity=excluded.severity,
    title=excluded.title,
    summary=excluded.summary,
    rationale=excluded.rationale,
    recommended_action=excluded.recommended_action,
    action_label=excluded.action_label,
    action_href=excluded.action_href,
    score=excluded.score,
    metadata=excluded.metadata,
    last_seen_at=v_refresh,
    resolved_at=case
      when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours'
        then nexus_signals.resolved_at
      else null
    end,
    status=case
      when nexus_signals.status='dismissed' then 'dismissed'
      when nexus_signals.status='snoozed' and coalesce(nexus_signals.snoozed_until,'epoch')>v_refresh then 'snoozed'
      when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then 'resolved'
      else 'open'
    end;

  -- Orçamentos aguardando nova movimentação.
  insert into public.nexus_signals(
    fingerprint,signal_type,severity,operation_scope,
    entity_type,entity_id,customer_id,title,summary,rationale,
    recommended_action,action_label,action_href,score,status,
    metadata,first_seen_at,last_seen_at,resolved_at
  )
  select
    'quote:'||q.id::text||':followup','quote_followup',
    case when q.quoted_on<=v_today-7 then 'urgent' else 'attention' end,
    'supplements','quote',q.id,q.customer_id,
    'Orçamento aguardando · '||coalesce(c.name,'cliente'),
    'Orçamento #'||q.quote_number::text||' · R$ '||replace(to_char(q.total_amount,'FM999G999G990D00'),'.',','),
    'A proposta continua aberta sem conversão e sem contato recente registrado.',
    'Revise a proposta e decida se deve retomar a conversa.',
    'Abrir orçamento','/vendas/nova?quote='||q.id::text,
    50+least(greatest(v_today-q.quoted_on,0),20),'open',
    jsonb_build_object('quote_number',q.quote_number,'quoted_on',q.quoted_on,'valid_until',q.valid_until,'total_amount',q.total_amount),
    v_refresh,v_refresh,null
  from public.sales_quotes q
  left join public.customers c on c.id=q.customer_id
  where q.status='quoted'
    and q.quoted_on<=v_today-3
    and (c.last_contact_at is null or c.last_contact_at<v_refresh-interval '2 days')
  on conflict(fingerprint) do update set
    severity=excluded.severity,title=excluded.title,summary=excluded.summary,
    rationale=excluded.rationale,recommended_action=excluded.recommended_action,
    action_label=excluded.action_label,action_href=excluded.action_href,
    score=excluded.score,metadata=excluded.metadata,last_seen_at=v_refresh,
    resolved_at=case when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then nexus_signals.resolved_at else null end,
    status=case
      when nexus_signals.status='dismissed' then 'dismissed'
      when nexus_signals.status='snoozed' and coalesce(nexus_signals.snoozed_until,'epoch')>v_refresh then 'snoozed'
      when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then 'resolved'
      else 'open' end;

  -- Cobranças vencidas.
  insert into public.nexus_signals(
    fingerprint,signal_type,severity,operation_scope,
    entity_type,entity_id,customer_id,title,summary,rationale,
    recommended_action,action_label,action_href,score,status,
    metadata,first_seen_at,last_seen_at,resolved_at
  )
  select
    'sale:'||s.id::text||':payment','payment_due','urgent','supplements',
    'sale',s.id,s.customer_id,
    'Cobrar '||coalesce(c.name,'cliente'),
    'Saldo pendente · R$ '||replace(to_char(ps.outstanding_amount,'FM999G999G990D00'),'.',','),
    'Existe saldo vencido nesta venda.',
    'Abra a venda, confira o combinado e registre o recebimento quando ocorrer.',
    'Abrir venda','/vendas/'||s.id::text,
    100+least(greatest(v_today-coalesce(ps.next_payment_due_at,s.payment_due_at,v_today),0),30),
    'open',
    jsonb_build_object('outstanding_amount',ps.outstanding_amount,'due_on',coalesce(ps.next_payment_due_at,s.payment_due_at),'payment_state',ps.payment_state),
    v_refresh,v_refresh,null
  from public.sales s
  join public.sale_payment_summary ps on ps.sale_id=s.id
  left join public.customers c on c.id=s.customer_id
  where s.record_type::text='sale'
    and s.general_status::text<>'cancelled'
    and ps.outstanding_amount>0.005
    and coalesce(ps.next_payment_due_at,s.payment_due_at)>date '2000-01-01'
    and coalesce(ps.next_payment_due_at,s.payment_due_at)<=v_today
  on conflict(fingerprint) do update set
    title=excluded.title,summary=excluded.summary,score=excluded.score,
    metadata=excluded.metadata,last_seen_at=v_refresh,
    resolved_at=case when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then nexus_signals.resolved_at else null end,
    status=case
      when nexus_signals.status='dismissed' then 'dismissed'
      when nexus_signals.status='snoozed' and coalesce(nexus_signals.snoozed_until,'epoch')>v_refresh then 'snoozed'
      when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then 'resolved'
      else 'open' end;

  -- Entregas vencidas ou para hoje.
  insert into public.nexus_signals(
    fingerprint,signal_type,severity,operation_scope,
    entity_type,entity_id,customer_id,title,summary,rationale,
    recommended_action,action_label,action_href,score,status,
    metadata,first_seen_at,last_seen_at,resolved_at
  )
  select
    'sale:'||s.id::text||':delivery','delivery_due',
    case when s.delivery_due_at<v_today then 'urgent' else 'attention' end,
    'supplements','sale',s.id,s.customer_id,
    'Entregar para '||coalesce(c.name,'cliente'),
    case when s.delivery_due_at<v_today then 'Entrega vencida' else 'Entrega prevista para hoje' end,
    'A venda ainda não está marcada como entregue.',
    'Abra a venda, conclua a entrega e registre a baixa correta do estoque.',
    'Abrir venda','/vendas/'||s.id::text,
    case when s.delivery_due_at<v_today then 96 else 88 end,'open',
    jsonb_build_object('delivery_due_at',s.delivery_due_at),
    v_refresh,v_refresh,null
  from public.sales s
  left join public.customers c on c.id=s.customer_id
  where s.record_type::text='sale'
    and s.general_status::text<>'cancelled'
    and s.delivery_status::text<>'delivered'
    and s.delivery_due_at is not null
    and s.delivery_due_at<=v_today
  on conflict(fingerprint) do update set
    severity=excluded.severity,title=excluded.title,summary=excluded.summary,
    score=excluded.score,metadata=excluded.metadata,last_seen_at=v_refresh,
    resolved_at=case when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then nexus_signals.resolved_at else null end,
    status=case
      when nexus_signals.status='dismissed' then 'dismissed'
      when nexus_signals.status='snoozed' and coalesce(nexus_signals.snoozed_until,'epoch')>v_refresh then 'snoozed'
      when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then 'resolved'
      else 'open' end;

  -- Pós-venda planejado.
  insert into public.nexus_signals(
    fingerprint,signal_type,severity,operation_scope,
    entity_type,entity_id,customer_id,title,summary,rationale,
    recommended_action,action_label,action_href,score,status,
    metadata,first_seen_at,last_seen_at,resolved_at
  )
  select
    'post-sale:'||p.id::text,'post_sale',
    case when p.due_on<v_today then 'urgent' else 'attention' end,
    'supplements','post_sale',p.id,p.customer_id,
    'Pós-venda · '||coalesce(p.customer_name,'cliente'),
    concat_ws(' · ',p.product_summary,case when p.due_on<v_today then 'atrasado' else 'para hoje' end),
    'Existe um retorno de pós-venda planejado.',
    'Abra o pós-venda, revise o histórico e faça o contato.',
    'Abrir pós-venda','/pos-venda',
    case when p.due_on<v_today then 82 else 72 end,'open',
    jsonb_build_object('due_on',p.due_on,'product_summary',p.product_summary,'sale_count',p.sale_count),
    v_refresh,v_refresh,null
  from public.post_sale_batch_overview p
  where p.status='planned' and p.due_on<=v_today
  on conflict(fingerprint) do update set
    severity=excluded.severity,title=excluded.title,summary=excluded.summary,
    score=excluded.score,metadata=excluded.metadata,last_seen_at=v_refresh,
    resolved_at=case when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then nexus_signals.resolved_at else null end,
    status=case
      when nexus_signals.status='dismissed' then 'dismissed'
      when nexus_signals.status='snoozed' and coalesce(nexus_signals.snoozed_until,'epoch')>v_refresh then 'snoozed'
      when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then 'resolved'
      else 'open' end;

  -- Estoque zerado: ideal > 0 + nada disponível + nada a caminho.
  insert into public.nexus_signals(
    fingerprint,signal_type,severity,operation_scope,
    entity_type,entity_id,product_id,title,summary,rationale,
    recommended_action,action_label,action_href,score,status,
    metadata,first_seen_at,last_seen_at,resolved_at
  )
  select
    'product:'||p.id::text||':stockout','stockout','urgent','supplements',
    'product',p.id,p.id,
    'Repor · '||p.name,
    'Zerado · ideal '||coalesce(p.ideal_stock,0)::text||' un.',
    'O produto deveria ter estoque, está sem disponibilidade e não há reposição aberta.',
    'Inclua no planejamento do próximo pedido.',
    'Planejar compra','/pedidos-fornecedor/proximo-pedido',
    86+least(coalesce(p.ideal_stock,0),10),'open',
    jsonb_build_object('ideal_stock',p.ideal_stock,'min_stock',p.min_stock),
    v_refresh,v_refresh,null
  from public.products p
  left join lateral (
    select coalesce(sum(sa.available_quantity),0)::integer available
    from public.sale_stock_availability sa
    where sa.product_id=p.id
  ) st on true
  left join public.product_incoming_stock inc on inc.product_id=p.id
  where p.active
    and coalesce(p.ideal_stock,0)>0
    and coalesce(st.available,0)=0
    and coalesce(inc.incoming_quantity,0)=0
  on conflict(fingerprint) do update set
    title=excluded.title,summary=excluded.summary,score=excluded.score,
    metadata=excluded.metadata,last_seen_at=v_refresh,
    resolved_at=case when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then nexus_signals.resolved_at else null end,
    status=case
      when nexus_signals.status='dismissed' then 'dismissed'
      when nexus_signals.status='snoozed' and coalesce(nexus_signals.snoozed_until,'epoch')>v_refresh then 'snoozed'
      when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then 'resolved'
      else 'open' end;

  -- Produto voltou a ter estoque enquanto leads ainda aguardam.
  insert into public.nexus_signals(
    fingerprint,signal_type,severity,operation_scope,
    entity_type,entity_id,product_id,title,summary,rationale,
    recommended_action,action_label,action_href,score,status,
    metadata,first_seen_at,last_seen_at,resolved_at
  )
  select
    'product:'||p.id::text||':lead-opportunity','stock_lead_opportunity','opportunity','supplements',
    'product',p.id,p.id,
    p.name||' disponível para lead(s)',
    count(distinct l.id)::text||' lead(s) aguardando este produto.',
    'O produto possui estoque e existem leads em status de espera.',
    'Abra os leads e priorize quem ainda não foi contatado recentemente.',
    'Ver leads','/leads?q='||replace(p.name,' ','%20'),
    78+least(count(distinct l.id),8),'open',
    jsonb_build_object('lead_count',count(distinct l.id)),
    v_refresh,v_refresh,null
  from public.products p
  join public.sale_stock_availability sa on sa.product_id=p.id and sa.available_quantity>0
  join public.sale_items li on li.product_id=p.id
  join public.sales l on l.id=li.sale_id
    and l.record_type::text='lead'
    and l.general_status::text not in ('finalized','cancelled')
    and coalesce(l.lead_status,'') in ('Esperando pedido de fornecedor','Aguardando')
  left join public.customers c on c.id=l.customer_id
  where p.active
    and (c.last_contact_at is null or c.last_contact_at<v_refresh-interval '1 day')
  group by p.id,p.name
  on conflict(fingerprint) do update set
    title=excluded.title,summary=excluded.summary,score=excluded.score,
    metadata=excluded.metadata,last_seen_at=v_refresh,
    resolved_at=case when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then nexus_signals.resolved_at else null end,
    status=case
      when nexus_signals.status='dismissed' then 'dismissed'
      when nexus_signals.status='snoozed' and coalesce(nexus_signals.snoozed_until,'epoch')>v_refresh then 'snoozed'
      when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then 'resolved'
      else 'open' end;

  -- Padrão manual de parceria: sugere cadastro, nunca inventa a relação.
  insert into public.nexus_signals(
    fingerprint,signal_type,severity,operation_scope,
    entity_type,entity_id,customer_id,partner_id,title,summary,rationale,
    recommended_action,action_label,action_href,score,status,
    metadata,first_seen_at,last_seen_at,resolved_at
  )
  select
    'customer:'||s.customer_id::text||':partner-review:'||s.partner_id::text,
    'relationship_review','info','supplements','customer',s.customer_id,s.customer_id,s.partner_id,
    'Revisar vínculo · '||c.name,
    count(*)::text||' venda(s) já foram atribuídas a '||p.name||'.',
    'Há um padrão de atribuição manual, mas o Nexus não sabe qual é a relação.',
    'Se fizer sentido, abra o cliente e registre o vínculo correto. Nenhuma relação é inferida automaticamente.',
    'Revisar cliente','/clientes/'||s.customer_id::text,
    28+least(count(*),10),'open',
    jsonb_build_object('partner_name',p.name,'historical_sales',count(*)),
    v_refresh,v_refresh,null
  from public.sales s
  join public.customers c on c.id=s.customer_id
  join public.partners p on p.id=s.partner_id
  where s.record_type::text='sale'
    and s.general_status::text<>'cancelled'
    and s.partner_id is not null
    and not exists(
      select 1 from public.customer_partner_affiliations a
      where a.customer_id=s.customer_id and a.partner_id=s.partner_id and a.active
    )
  group by s.customer_id,s.partner_id,c.name,p.name
  having count(*)>=2
  on conflict(fingerprint) do update set
    title=excluded.title,summary=excluded.summary,rationale=excluded.rationale,
    score=excluded.score,metadata=excluded.metadata,last_seen_at=v_refresh,
    resolved_at=case when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then nexus_signals.resolved_at else null end,
    status=case
      when nexus_signals.status='dismissed' then 'dismissed'
      when nexus_signals.status='snoozed' and coalesce(nexus_signals.snoozed_until,'epoch')>v_refresh then 'snoozed'
      when nexus_signals.status='resolved' and nexus_signals.last_seen_at>=v_refresh-interval '12 hours' then 'resolved'
      else 'open' end;

  -- Condições que o engine não reencontrou foram resolvidas pela operação.
  update public.nexus_signals
  set status='resolved',resolved_at=v_refresh,updated_at=v_refresh
  where generated_by='engine'
    and operation_scope='supplements'
    and status in ('open','snoozed')
    and last_seen_at<v_refresh;

  select count(*)::integer into v_open
  from public.nexus_signals
  where operation_scope='supplements'
    and status='open';

  return jsonb_build_object('refreshed_at',v_refresh,'open_signals',v_open);
end;
$$;

grant execute on function public.refresh_nexus_signals_v1()
to authenticated,service_role;

commit;
