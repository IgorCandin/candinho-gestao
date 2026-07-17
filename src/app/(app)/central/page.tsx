import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, ImageIcon, Inbox, Link2, MessageCircleMore, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess } from "@/lib/data";
import { getCentralDashboardSnapshot } from "@/lib/central-data";

const providerLabel: Record<string, string> = { whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook" };

export default async function CentralPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness)) redirect("/dashboard");
  const data = await getCentralDashboardSnapshot();

  return <>
    <PageHeader eyebrow="Candinho Company" title="Candinho Central" description="Seu centro de comando para atendimento, relacionamento, mídia e inteligência entre as operações." action={<Link className="button gold" href="/central/inbox"><Inbox size={16}/>Abrir atendimento</Link>}/>

    <section className="stats-grid central-stats-grid">
      <StatCard href="/central/inbox" label="Mensagens não lidas" value={String(data.unread)} note={`${data.open_conversations} conversa(s) aberta(s)`} icon={Inbox}/>
      <StatCard href="/central/inbox?status=pending" label="Aguardando retorno" value={String(data.pending_conversations)} note="Conversas marcadas como pendentes" icon={MessageCircleMore}/>
      <StatCard href="/central/clientes" label="Contatos unificados" value={String(data.contacts)} note="WhatsApp, Instagram, Facebook e CRM" icon={UsersRound}/>
      <StatCard href="/central/midia" label="Arquivos de mídia" value={String(data.media_assets)} note="Biblioteca privada pesquisável" icon={ImageIcon}/>
      <StatCard href="/central/nexus" label="Insights ativos" value={String(data.active_ai_insights)} note="Sugestões geradas pelo Nexus" icon={Bot}/>
    </section>

    <section className="central-launch-grid">
      <Link href="/central/inbox" className="central-launch-card primary"><Inbox size={24}/><span><strong>Atendimento</strong><small>Uma caixa de entrada para todos os canais.</small></span></Link>
      <Link href="/central/clientes" className="central-launch-card"><UsersRound size={24}/><span><strong>Clientes</strong><small>Identidade única ligada às operações.</small></span></Link>
      <Link href="/central/midia" className="central-launch-card"><ImageIcon size={24}/><span><strong>Mídia</strong><small>Fotos, vídeos e documentos organizados.</small></span></Link>
      <Link href="/central/nexus" className="central-launch-card"><Bot size={24}/><span><strong>Nexus IA</strong><small>Sugestões para você revisar antes de enviar.</small></span></Link>
    </section>

    <article className="panel central-integrations-panel">
      <div className="panel-head"><div><h2>Canais conectados</h2><p>O Central passa a receber conversas assim que as credenciais oficiais forem ativadas.</p></div>{access.canManageUsers && <Link className="button ghost compact-button" href="/central/integracoes"><Link2 size={15}/>Gerenciar</Link>}</div>
      <div className="panel-body central-integration-chips">
        {data.integrations.length === 0 ? <div className="central-empty-inline"><Link2 size={18}/><span><strong>Nenhuma conta conectada ainda.</strong><small>A estrutura já está pronta; faltam apenas as credenciais da Meta.</small></span></div> : data.integrations.map((item) => <span className={`central-integration-chip ${item.status}`} key={`${item.provider}-${item.scope}`}><i/><b>{providerLabel[item.provider] ?? item.provider}</b><small>{item.account_name ?? item.scope}</small></span>)}
      </div>
    </article>
  </>;
}
