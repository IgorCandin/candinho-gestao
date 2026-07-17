import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, CalendarDays, CheckCircle2, ImageIcon, Inbox, Link2, ListTodo, MessageCircleMore, PlugZap, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess } from "@/lib/data";
import { getCentralAgendaSnapshot, getCentralDashboardSnapshot, getCentralIntegrationReadiness } from "@/lib/central-data";

const providerLabel: Record<string, string> = { whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook" };

export default async function CentralPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness)) redirect("/dashboard");
  const [data, agenda, readiness] = await Promise.all([getCentralDashboardSnapshot(), getCentralAgendaSnapshot("planned", null), access.canManageUsers ? getCentralIntegrationReadiness() : Promise.resolve(null)]);
  const metaReady = Boolean(readiness?.meta.ready);
  const aiReady = Boolean(readiness?.openai.ready);

  return <>
    <PageHeader eyebrow="Candinho Company" title="Candinho Central" description="Seu centro de comando para atendimento, relacionamento, mídia e inteligência entre as operações." action={<Link className="button gold" href="/central/inbox"><Inbox size={16}/>Abrir atendimento</Link>}/>

    <section className="stats-grid central-stats-grid">
      <StatCard href="/central/inbox" label="Mensagens não lidas" value={String(data.unread)} note={`${data.open_conversations} conversa(s) aberta(s)`} icon={Inbox}/>
      <StatCard href="/central/inbox?status=pending" label="Aguardando retorno" value={String(data.pending_conversations)} note="Conversas marcadas como pendentes" icon={MessageCircleMore}/>
      <StatCard href="/central/clientes" label="Contatos unificados" value={String(data.contacts)} note="Meta, cadastro manual e CRM" icon={UsersRound}/>
      <StatCard href="/central/midia" label="Arquivos de mídia" value={String(data.media_assets)} note="Biblioteca privada pesquisável" icon={ImageIcon}/>
      <StatCard href="/central/agenda" label="Agenda hoje" value={String(agenda.summary.today_count)} note={`${agenda.summary.next_seven_days_count} nos próximos 7 dias`} icon={CalendarDays}/>
      <StatCard href="/central/pendencias" label="Pendências" value={String(agenda.summary.pending_count)} note={`${agenda.summary.overdue_count} atrasada(s)`} icon={ListTodo}/>
      <StatCard href="/central/nexus" label="Insights ativos" value={String(data.active_ai_insights)} note="Sugestões geradas pelo Nexus" icon={Bot}/>
    </section>

    <section className="central-launch-grid">
      <Link href="/central/inbox" className="central-launch-card primary"><Inbox size={24}/><span><strong>Atendimento</strong><small>Fila única com busca, filtros, status e contexto do cliente.</small></span></Link>
      <Link href="/central/clientes" className="central-launch-card"><UsersRound size={24}/><span><strong>Clientes</strong><small>Cadastre manualmente e una identidades sem apagar as origens.</small></span></Link>
      <Link href="/central/agenda" className="central-launch-card"><CalendarDays size={24}/><span><strong>Agenda</strong><small>Compromissos e tarefas de todas as operações.</small></span></Link>
      <Link href="/central/pendencias" className="central-launch-card"><ListTodo size={24}/><span><strong>Pendências</strong><small>Fila única do que ainda precisa ser resolvido.</small></span></Link>
      <Link href="/central/midia" className="central-launch-card"><ImageIcon size={24}/><span><strong>Mídia</strong><small>Fotos, vídeos e documentos organizados para uso futuro.</small></span></Link>
      <Link href="/central/nexus" className="central-launch-card"><Bot size={24}/><span><strong>Nexus IA</strong><small>Sugestões para você revisar antes de qualquer envio.</small></span></Link>
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
