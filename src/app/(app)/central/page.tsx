import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CalendarDays, CheckCircle2, ImageIcon, Link2, ListChecks, ListTodo, MessageSquareText, PlugZap, Search, ShieldCheck, UsersRound } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess } from "@/lib/data";
import { getCentralAgendaSnapshot, getCentralAlertsSnapshot, getCentralDailyPriorities, getCentralDashboardSnapshot, getCentralIntegrationReadiness } from "@/lib/central-data";

const providerLabel: Record<string, string> = { whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook" };

export default async function CentralPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing)) redirect("/dashboard");

  const [data, agenda, alerts, priorities, readiness] = await Promise.all([
    getCentralDashboardSnapshot(),
    getCentralAgendaSnapshot("planned", null),
    getCentralAlertsSnapshot(),
    getCentralDailyPriorities(),
    access.canManageUsers ? getCentralIntegrationReadiness() : Promise.resolve(null),
  ]);

  const metaReady = Boolean(readiness?.meta.ready);
  const aiReady = Boolean(readiness?.openai.ready);

  return <>
    <form className="central-home-search central-home-search-first" action="/central/busca" method="get">
      <Search size={18}/><input name="q" placeholder="Buscar cliente, produto, parceiro, tarefa ou mídia..."/>
      <button className="button gold compact-button" type="submit">Buscar</button>
    </form>

    <section className="stats-grid central-stats-grid">
      <StatCard href="/central/prioridades" label="Prioridades do dia" value={String(priorities.summary.total)} note="Fila consolidada de ação" icon={ListChecks}/>
      <StatCard href="/central/clientes" label="Contatos unificados" value={String(data.contacts)} note="Cadastros e vínculos entre operações" icon={UsersRound}/>
      <StatCard href="/central/midia" label="Arquivos de mídia" value={String(data.media_assets)} note="Biblioteca pesquisável" icon={ImageIcon}/>
      <StatCard href="/central/agenda" label="Agenda hoje" value={String(agenda.summary.today_count)} note={`${agenda.summary.next_seven_days_count} nos próximos 7 dias`} icon={CalendarDays}/>
      <StatCard href="/central/pendencias" label="Pendências" value={String(agenda.summary.pending_count)} note={`${agenda.summary.overdue_count} atrasada(s)`} icon={ListTodo}/>
      <StatCard href="/central/alertas" label="Alertas ativos" value={String(alerts.summary.total)} note={`${alerts.summary.critical} crítico(s) · ${alerts.summary.attention} em atenção`} icon={Bell}/>
    </section>

    <section className="central-launch-grid">
      <Link href="/central/prioridades" className="central-launch-card primary"><ListChecks size={24}/><span><strong>Prioridades do dia</strong><small>Tarefas, retornos, Radar, estoque, parceiros e integrações em uma fila única.</small></span></Link>
      <Link href="/central/busca" className="central-launch-card"><Search size={24}/><span><strong>Busca Global</strong><small>Encontre clientes, produtos, parceiros, tarefas e mídias em uma única pesquisa.</small></span></Link>
      <Link href="/central/alertas" className="central-launch-card"><Bell size={24}/><span><strong>Alertas</strong><small>Veja o que exige atenção agora em toda a Company.</small></span></Link>
      {(access.canWriteSupplements || access.canWriteFitness || access.canWriteMarketing || access.role === "admin") && <Link href="/central/respostas" className="central-launch-card"><MessageSquareText size={24}/><span><strong>Respostas rápidas</strong><small>Textos prontos para consulta e uso nos seus canais.</small></span></Link>}
      <Link href="/central/clientes" className="central-launch-card"><UsersRound size={24}/><span><strong>Clientes</strong><small>Cadastre manualmente e una identidades sem apagar as origens.</small></span></Link>
      <Link href="/central/agenda" className="central-launch-card"><CalendarDays size={24}/><span><strong>Agenda</strong><small>Compromissos e tarefas de todas as operações.</small></span></Link>
      <Link href="/central/midia" className="central-launch-card"><ImageIcon size={24}/><span><strong>Mídia</strong><small>Fotos, vídeos e documentos organizados para uso futuro.</small></span></Link>
      {access.canManageUsers && <Link href="/central/governanca" className="central-launch-card"><ShieldCheck size={24}/><span><strong>Governança</strong><small>Auditoria de acessos, integrações e mudanças críticas.</small></span></Link>}
    </section>

    {access.canManageUsers && <article className="panel central-readiness-panel">
      <div className="panel-head"><div><h2>Prontidão da Central</h2><p>Integrações externas e inteligência de mídia ficam visíveis aqui sem misturar com a operação diária.</p></div><PlugZap size={20}/></div>
      <div className="panel-body central-readiness-grid">
        <div className={metaReady ? "ready" : "waiting"}><span>{metaReady ? <CheckCircle2 size={18}/> : <PlugZap size={18}/>}</span><div><strong>Meta · Canais</strong><small>{metaReady ? "Secrets básicos configurados. As contas podem ser registradas e ativadas conforme a integração evoluir." : "Aguardando os dados técnicos necessários para ativar os canais da Meta."}</small></div></div>
        <div className={aiReady ? "ready" : "waiting"}><span>{aiReady ? <CheckCircle2 size={18}/> : <PlugZap size={18}/>}</span><div><strong>OpenAI · Marketing e Mídia</strong><small>{aiReady ? "Chave configurada para os fluxos inteligentes que continuam ativos." : "Aguardando OPENAI_API_KEY para classificação e interpretação inteligente de arquivos."}</small></div></div>
        <Link className="button ghost" href="/central/integracoes"><Link2 size={15}/>Abrir Integrações</Link>
      </div>
    </article>}

    <article className="panel central-integrations-panel">
      <div className="panel-head"><div><h2>Canais cadastrados</h2><p>As contas aparecem aqui assim que são registradas na área de Integrações.</p></div>{access.canManageUsers && <Link className="button ghost compact-button" href="/central/integracoes"><Link2 size={15}/>Gerenciar</Link>}</div>
      <div className="panel-body central-integration-chips">
        {data.integrations.length === 0
          ? <div className="central-empty-inline"><Link2 size={19}/><span><strong>Nenhuma conta cadastrada</strong><small>Clientes, Agenda, Busca e Mídia continuam funcionando independentemente dos canais externos.</small></span></div>
          : data.integrations.map((item) => <div className={`central-integration-chip ${item.status}`} key={`${item.provider}-${item.scope}-${item.account_name}`}><i/><b>{providerLabel[item.provider] ?? item.provider}</b><small>{item.account_name ?? item.scope} · {item.status}</small></div>)}
      </div>
    </article>
  </>;
}
