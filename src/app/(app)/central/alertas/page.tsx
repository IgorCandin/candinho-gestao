import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CheckCircle2, CircleAlert, Info, ShieldAlert, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCentralAlertsSnapshot } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";

const severityMeta = {
  critical: { label: "Crítico", icon: ShieldAlert },
  attention: { label: "Atenção", icon: TriangleAlert },
  info: { label: "Informativo", icon: Info },
};

export default async function CentralAlertsPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing)) redirect("/dashboard");
  const data = await getCentralAlertsSnapshot();
  return <>
    <PageHeader eyebrow="Candinho Central" title="Central de Alertas" description="Uma fila única do que merece atenção agora, cruzando atendimento, agenda, estoque, mídia, parceiros e integrações."/>
    <section className="stats-grid central-alert-stats">
      <StatCard label="Alertas ativos" value={String(data.summary.total)} note="Categorias que exigem acompanhamento" icon={Bell}/>
      <StatCard label="Críticos" value={String(data.summary.critical)} note="Prioridade imediata" icon={ShieldAlert}/>
      <StatCard label="Atenção" value={String(data.summary.attention)} note="Revisar na rotina" icon={TriangleAlert}/>
      <StatCard label="Informativos" value={String(data.summary.info)} note="Acompanhar quando possível" icon={Info}/>
    </section>

    <article className="panel central-alert-list-panel">
      <div className="panel-head"><div><h2>O que precisa da sua atenção</h2><p>Os alertas são calculados em tempo real. Ao resolver a origem, eles desaparecem automaticamente.</p></div><CircleAlert size={20}/></div>
      <div className="central-alert-list">
        {data.items.length === 0 ? <div className="empty"><CheckCircle2 size={28}/><strong>Nenhum alerta ativo</strong>A operação está sem pendências relevantes neste momento.</div> : data.items.map((item) => {
          const meta = severityMeta[item.severity as keyof typeof severityMeta] ?? severityMeta.info;
          const Icon = meta.icon;
          return <Link className={`central-alert-row ${item.severity}`} href={item.href} key={item.key}>
            <span className="central-alert-icon"><Icon size={19}/></span>
            <div><small>{meta.label}</small><strong>{item.title}</strong><span>{item.description}</span></div>
            <b>{item.count}</b>
          </Link>;
        })}
      </div>
    </article>
  </>;
}
