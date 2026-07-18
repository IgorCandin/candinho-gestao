import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, Boxes, CalendarClock, Inbox, Link2, Radar, ShieldAlert, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCentralDailyPriorities } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

const scopeLabels: Record<string, string> = { company: "Company", supplements: "Suplementos", fitness: "Fitness", marketing: "Marketing" };

export default async function CentralPrioritiesPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing)) redirect("/dashboard");
  const data = await getCentralDailyPriorities();

  return <>
    <PageHeader eyebrow="Candinho Central" title="Prioridades do dia" description="Uma fila única do que merece atenção agora: atendimento, retornos, Radar, estoque, parceiros e integrações." />

    <section className="stats-grid central-priority-stats">
      <StatCard href="/central/agenda" label="Tarefas próximas" value={String(data.summary.tasks)} note="Atrasadas, hoje e próximos 7 dias" icon={CalendarClock}/>
      <StatCard href="/central/inbox" label="Atendimentos" value={String(data.summary.conversations)} note="Não lidos ou aguardando retorno" icon={Inbox}/>
      <StatCard href="/clientes/radar" label="Radar" value={String(data.summary.radar)} note="Possíveis clientes priorizados" icon={Radar}/>
      <StatCard href="/estoque/reconciliacao" label="Estoque" value={String(data.summary.inventory)} note="Pontos que exigem conferência" icon={Boxes}/>
      {access.canManageUsers && <StatCard href="/parceiros/gerencial" label="Parceiros" value={String(data.summary.partner_attention)} note="Portais que exigem atenção" icon={UsersRound}/>} 
      {access.canManageUsers && <StatCard href="/central/integracoes" label="Integrações" value={String(data.summary.integration_attention)} note="Canais fora do estado saudável" icon={Link2}/>} 
    </section>

    <section className="central-priority-grid">
      <article className="panel priority-section-card">
        <div className="panel-head"><div><h2>Atendimentos</h2><p>Mensagens não lidas e conversas marcadas para retorno.</p></div><Inbox size={20}/></div>
        <div className="priority-list">{data.conversations.length === 0 ? <div className="empty"><Inbox size={22}/><strong>Fila limpa</strong>Nenhuma conversa urgente agora.</div> : data.conversations.map((item) => <Link className="priority-row" href={`/central/inbox?conversa=${item.conversation_id}`} key={item.conversation_id}><span><strong>{item.contact_name}</strong><small>{item.last_message_body ?? "Sem texto"}</small><em>{scopeLabels[item.operation_scope] ?? item.operation_scope} · {item.provider}</em></span><b>{item.unread_count > 0 ? `${item.unread_count} nova(s)` : item.status === "pending" ? "Pendente" : "Aberta"}</b></Link>)}</div>
      </article>

      <article className="panel priority-section-card">
        <div className="panel-head"><div><h2>Agenda e retornos</h2><p>O que vence primeiro aparece no topo.</p></div><CalendarClock size={20}/></div>
        <div className="priority-list">{data.tasks.length === 0 ? <div className="empty"><CalendarClock size={22}/><strong>Sem retorno próximo</strong>Nenhuma tarefa pendente nos próximos 7 dias.</div> : data.tasks.map((item) => <Link className="priority-row" href="/central/agenda" key={item.id}><span><strong>{item.title}</strong><small>{item.contact_name ?? item.category}</small><em>{scopeLabels[item.operation_scope] ?? item.operation_scope} · {formatDateTime(item.due_at)}</em></span><b className={item.sort_rank === 0 ? "priority-danger" : ""}>{item.sort_rank === 0 ? "Atrasada" : item.priority === "urgent" ? "Urgente" : "Pendente"}</b></Link>)}</div>
      </article>

      {access.canAccessSupplements && <article className="panel priority-section-card">
        <div className="panel-head"><div><h2>Radar comercial</h2><p>Recompra, retornos e leads priorizados pela lógica do CRM/AppSheet.</p></div><Radar size={20}/></div>
        <div className="priority-list">{data.radar.length === 0 ? <div className="empty"><Radar size={22}/><strong>Sem oportunidade prioritária</strong>O Radar não encontrou ação imediata.</div> : data.radar.map((item) => <Link className="priority-row" href={`/clientes/${item.customer_id}`} key={item.customer_id}><span><strong>{item.customer_name}</strong><small>{item.opportunity_label}</small><em>{item.last_product_name ?? item.priority_source}</em></span><b>{item.opportunity_priority}</b></Link>)}</div>
      </article>}

      {access.canAccessSupplements && <article className="panel priority-section-card">
        <div className="panel-head"><div><h2>Estoque em atenção</h2><p>Conferências e reconciliações sem ajuste automático de saldo.</p></div><Boxes size={20}/></div>
        <div className="priority-list">{data.inventory.length === 0 ? <div className="empty"><Boxes size={22}/><strong>Sem pendência de estoque</strong>Nenhum item exige reconciliação agora.</div> : data.inventory.map((item) => <Link className="priority-row" href="/estoque/reconciliacao" key={`${item.attention_type}-${item.entity_id}`}><span><strong>{item.title}</strong><small>{item.attention_type}</small></span><b>{item.status}</b></Link>)}</div>
      </article>}

      {access.canManageUsers && data.summary.partner_attention > 0 && <article className="panel priority-section-card"><div className="panel-head"><div><h2>Portal Parceiro</h2><p>Há acessos ou vínculos que precisam de revisão.</p></div><ShieldAlert size={20}/></div><div className="panel-body"><Link className="central-priority-cta" href="/parceiros/gerencial"><UsersRound size={18}/><span><strong>{data.summary.partner_attention} parceiro(s) em atenção</strong><small>Abrir diagnóstico dos portais.</small></span></Link></div></article>}

      {access.canManageUsers && data.summary.integration_attention > 0 && <article className="panel priority-section-card"><div className="panel-head"><div><h2>Integrações</h2><p>Canais com erro, desconectados ou aguardando configuração.</p></div><BellRing size={20}/></div><div className="panel-body"><Link className="central-priority-cta" href="/central/integracoes"><Link2 size={18}/><span><strong>{data.summary.integration_attention} integração(ões) em atenção</strong><small>Abrir diagnóstico dos canais.</small></span></Link></div></article>}
    </section>
  </>;
}
