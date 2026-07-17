import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, KeyRound, Link2, ScrollText, ShieldCheck, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCentralGovernanceSnapshot } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

const entityLabel: Record<string,string> = {
  partner_user_link: "Acesso de parceiro",
  central_integration: "Integração",
  ui_feature_flag: "Feature flag",
  partner_portal_invite: "Convite de parceiro",
};

const healthLabel: Record<string,string> = {
  healthy: "Saudável",
  stale: "Sem sincronizar",
  never_synced: "Nunca sincronizou",
  disconnected: "Desconectada",
  error: "Com erro",
};

export default async function CentralGovernancePage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canManageUsers)) redirect("/central");

  const data = await getCentralGovernanceSnapshot(150);
  const unhealthy = data.integrations.filter((item) => item.health_status && item.health_status !== "healthy").length;
  const failures = data.integrations.reduce((sum,item)=>sum+Number(item.failed_events ?? 0),0);

  return <>
    <PageHeader eyebrow="Candinho Central" title="Governança" description="Auditoria dos acessos e integrações críticas da Company, sem expor secrets ou credenciais." action={<Link className="button ghost" href="/central/integracoes"><Link2 size={15}/>Integrações</Link>}/>

    <section className="stats-grid central-governance-stats">
      <StatCard label="Eventos auditados" value={String(data.audit.length)} note="Últimos registros de governança" icon={ScrollText}/>
      <StatCard href="/central/integracoes" label="Integrações cadastradas" value={String(data.integrations.length)} note={`${unhealthy} exigindo atenção`} icon={Link2}/>
      <StatCard label="Falhas de webhook" value={String(failures)} note="Somatório das integrações visíveis" icon={TriangleAlert}/>
      <StatCard href="/parceiros/gerencial" label="Portal Parceiro" value="Protegido" note="Acessos e convites auditáveis" icon={KeyRound}/>
    </section>

    <article className="panel governance-health-panel">
      <div className="panel-head"><div><h2>Saúde das integrações</h2><p>Uma leitura operacional rápida para saber o que está conectado, parado ou com erro.</p></div><Activity size={20}/></div>
      <div className="panel-body governance-health-grid">
        {data.integrations.length===0 ? <div className="empty"><Link2 size={24}/><strong>Nenhuma integração cadastrada</strong>Meta e OpenAI continuam aguardando a configuração dos respectivos secrets e contas.</div> : data.integrations.map((item)=><div className={`governance-health-card ${item.health_status ?? item.status}`} key={`${item.provider}-${item.operation_scope}-${item.account_external_id ?? ""}`}>
          <div><strong>{item.account_name ?? item.provider}</strong><span>{item.provider} · {item.operation_scope}</span></div>
          <b>{healthLabel[item.health_status ?? ""] ?? item.health_status ?? item.status}</b>
          <small>Processados: {Number(item.processed_events ?? 0)} · Pendentes: {Number(item.pending_events ?? 0)} · Falhas: {Number(item.failed_events ?? 0)}</small>
        </div>)}
      </div>
    </article>

    <article className="panel governance-audit-panel">
      <div className="panel-head"><div><h2>Histórico de governança</h2><p>Alterações em acessos do parceiro, integrações, feature flags e convites.</p></div><ShieldCheck size={20}/></div>
      {data.audit.length===0 ? <div className="empty"><ScrollText size={24}/><strong>Nenhum evento novo</strong>O feed começa a registrar alterações feitas depois que os gatilhos de auditoria foram ativados.</div> : <div className="governance-audit-list">{data.audit.map((event)=><div className="governance-audit-row" key={event.id}>
        <span className="governance-audit-icon"><ShieldCheck size={16}/></span>
        <div><strong>{entityLabel[event.entity_type] ?? event.entity_type}</strong><span>{event.action}</span><small>{event.created_by_name ?? "Sistema"} · {formatDateTime(event.created_at)}</small></div>
      </div>)}</div>}
    </article>
  </>;
}
