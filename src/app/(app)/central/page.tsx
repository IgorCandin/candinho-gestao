import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Bot, CalendarDays, CheckCircle2, ImageIcon, Inbox, Link2, ListChecks, ListTodo, MessageCircleMore, MessageSquareText, PlugZap, Search, ShieldCheck, UsersRound } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess } from "@/lib/data";
import { getCentralAgendaSnapshot, getCentralAlertsSnapshot, getCentralDailyPriorities, getCentralDashboardSnapshot, getCentralIntegrationReadiness } from "@/lib/central-data";

const providerLabel: Record<string, string> = { whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook" };

export default async function CentralPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing)) redirect("/dashboard");
  const [data, agenda, alerts, priorities, readiness] = await Promise.all([getCentralDashboardSnapshot(), getCentralAgendaSnapshot("planned", null), getCentralAlertsSnapshot(), getCentralDailyPriorities(), access.canManageUsers ? getCentralIntegrationReadiness() : Promise.resolve(null)]);
  const metaReady = Boolean(readiness?.meta.ready);
  const aiReady = Boolean(readiness?.openai.ready);

  return <>

    <form className="central-home-search central-home-search-first" action="/central/busca" method="get"><Search size={18}/><input name="q" placeholder="Buscar cliente, produto, parceiro, tarefa ou mídia..."/><button className="button gold compact-button" type="submit">Buscar</button></form>

    <section className="stats-grid central-stats-grid">
      <StatCard href="/central/prioridades" label="Prioridades do dia" value={String(priorities.summary.total)} note="Fila consolidada de ação" icon={ListChecks}/>
      <StatCard href="/central/inbox" label="Mensagens não lidas" value={String(data.unread)} note={`${data.open_conversations} conversa(s) aberta(s)`} icon={Inbox}/>
      <StatCard href="/central/inbox?status=pending" label="Aguardando retorno" value={String(data.pending_conversations)} note="Conversas marcadas como pendentes" icon={MessageCircleMore}/>
      <StatCard href="/central/clientes" label="Contatos unificados" value={String(data.contacts)} note="Meta, cadastro manual e CRM" icon={UsersRound}/>
      <StatCard href="/central/midia" label="Arquivos de mídia" value={String(data.media_assets)} note="Biblioteca privada pesquisável" icon={ImageIcon}/>
      <StatCard href="/central/agenda" label="Agenda hoje" value={String(agenda.summary.today_count)} note={`${agenda.summary.next_seven_days_count} nos próximos 7 dias`} icon={CalendarDays}/>
      <StatCard href="/central/pendencias" label="Pendências" value={String(agenda.summary.pending_count)} note={`${agenda.summary.overdue_count} atrasada(s)`} icon={ListTodo}/>
      <StatCard href="/central/alertas" label="Alertas ativos" value={String(alerts.summary.total)} note={`${alerts.summary.critical} crítico(s) · ${alerts.summary.attention} em atenção`} icon={Bell}/>
      <StatCard href="/central/nexus" label="Insights ativos" value={String(data.active_ai_insights)} note="Sugestões geradas pelo Nexus" icon={Bot}/>
    </section>

    <section className="central-launch-grid">
      <Link href="/central/prioridades" className="central-launch-card primary"><ListChecks size={24}/><span><strong>Prioridades do dia</strong><small>Atendimento, retornos, Radar, estoque, parceiros e integrações em uma fila única.</small></span></Link>
      <Link href="/central/busca" className="central-launch-card"><Search size={24}/><span><strong>Busca Global</strong><small>Encontre clientes, produtos, parceiros, tarefas e mídias em uma única pesquisa.</small></span></Link>
      <Link href="/central/alertas" className="central-launch-card"><Bell size={24}/><span><strong>Alertas</strong><small>Veja o que exige atenção agora em toda a Company.</small></span></Link>
      <Link href="/central/inbox" className="central-launch-card"><Inbox size={24}/><span><strong>Atendimento</strong><small>Fila única com busca, filtros, responsável, retorno e contexto do cliente.</small></span></Link>
      {(access.canWriteSupplements || access.canWriteFitness || access.canWriteMarketing || access.role === "admin") && <Link href="/central/respostas" className="central-launch-card"><MessageSquareText size={24}/><span><strong>Respostas rápidas</strong><small>Textos prontos para carregar e revisar antes do envio.</small></span></Link>}
      <Link href="/central/clientes" className="central-launch-card"><UsersRound size={24}/><span><strong>Clientes</strong><small>Cadastre manualmente e una identidades sem apagar as origens.</small></span></Link>
      <Link href="/central/agenda" className="central-launch-card"><CalendarDays size={24}/><span><strong>Agenda</strong><small>Compromissos e tarefas de todas as operações.</small></span></Link>
      <Link href="/central/midia" className="central-launch-card"><ImageIcon size={24}/><span><strong>Mídia</strong><small>Fotos, vídeos e documentos organizados para uso futuro.</small></span></Link>
      <Link href="/central/nexus" className="central-launch-card"><Bot size={24}/><span><strong>Nexus IA</strong><small>Sugestões para você revisar antes de qualquer envio.</small></span></Link>
      {access.canManageUsers && <Link href="/central/governanca" className="central-launch-card"><ShieldCheck size={24}/><span><strong>Governança</strong><small>Auditoria de acessos, integrações e mudanças críticas.</small></span></Link>}
    </section>

    {access.canManageUsers && <article className="panel central-readiness-panel">
      <div className="panel-head"><div><h2>Prontidão da Central</h2><p>O sistema já está montado; estes são os dois pontos que liberam automação externa.</p></div><PlugZap size={20}/></div>
      <div className="panel-body central-readiness-grid">
        <div className={metaReady ? "ready" : "waiting"}><span>{metaReady ? <CheckCircle2 size={18}/> : <PlugZap size={18}/>}</span><div><strong>Meta · Atendimento</strong><small>{metaReady ? "Secrets básicos configurados. Falta apenas registrar/ativar as contas necessárias." : "Aguardando App Secret e Verify Token para receber WhatsApp, Instagram e Facebook."}</small></div></div>
        <div className={aiReady ? "ready" : "waiting"}><span>{aiReady ? <CheckCircle2 size={18}/> : <Bot size={18}/>}</span><div><strong>OpenAI · Nexus e Mídia</strong><small>{aiReady ? "Chave configurada. Nexus e classificação inteligente estão prontos." : "Aguardando OPENAI_API_KEY para sugestões e classificação de imagens."}</small></div></div>
        <Link className="button ghost" href="/central/integracoes"><Link2 size={15}/>Abrir Integrações</Link>
      </div>
    </article>}

    <article className="panel central-integrations-panel">
      <div className="panel-head"><div><h2>Canais cadastrados</h2><p>As contas aparecem aqui assim que são registradas na área de Integrações.</p></div>{access.canManageUsers && <Link className="button ghost compact-button" href="/central/integracoes"><Link2 size={15}/>Gerenciar</Link>}</div>
      <div className="panel-body central-integration-chips">
        {data.integrations.length === 0 ? <div className="central-empty-inline"><Link2 size={19}/><span><strong>Nenhuma conta cadastrada</strong><small>Você já pode usar Clientes e Mídia manualmente enquanto prepara a Meta.</small></span></div> : data.integrations.map((item) => <div className={`central-integration-chip ${item.status}`} key={`${item.provider}-${item.scope}-${item.account_name}`}><i/><b>{providerLabel[item.provider] ?? item.provider}</b><small>{item.account_name ?? item.scope} · {item.status}</small></div>)}
      </div>
    </article>
  </>;
}
