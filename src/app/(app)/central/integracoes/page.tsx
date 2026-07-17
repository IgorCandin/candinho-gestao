import { redirect } from "next/navigation";
import { CheckCircle2, CircleOff, Link2, MessageCircle, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCentralIntegrationHealth } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

const labels: Record<string, string> = { whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook" };

function statusMeta(item: { status: string; health_status?: string | null }) {
  const health = item.health_status ?? item.status;
  if (health === "healthy" || item.status === "connected") return { label: "Conectada", cls: "green", icon: CheckCircle2 };
  if (health === "error" || item.status === "error") return { label: "Com erro", cls: "red", icon: TriangleAlert };
  if (health === "stale") return { label: "Sem atividade", cls: "orange", icon: TriangleAlert };
  return { label: "Desconectada", cls: "gray", icon: CircleOff };
}

export default async function IntegrationsPage() {
  const access = await getCurrentUserAccess();
  if (!access.canManageUsers && access.role !== "admin") redirect("/central");
  const integrations = await getCentralIntegrationHealth();

  return <>
    <PageHeader eyebrow="Candinho Central" title="Integrações" description="Acompanhe a saúde dos canais. Tokens e segredos não são exibidos nem armazenados nesta tela." />

    <article className="panel central-integration-security"><div className="panel-body"><Link2 size={22}/><div><strong>Credenciais protegidas</strong><p>META_APP_SECRET, token de verificação e OPENAI_API_KEY ficam nas variáveis seguras das Edge Functions. A interface enxerga apenas estado, conta e diagnóstico.</p></div></div></article>

    <section className="central-health-grid">
      {integrations.length === 0 ? ["whatsapp", "instagram", "facebook"].map((provider) => <article className="central-health-card" key={provider}><span className="central-health-icon"><MessageCircle size={22}/></span><div><small>Canal</small><strong>{labels[provider]}</strong><em>Credenciais ainda não configuradas.</em></div><span className="badge gray">Desconectada</span></article>) : integrations.map((item) => {
        const meta = statusMeta(item); const Icon = meta.icon;
        return <article className="central-health-card" key={`${item.provider}-${item.operation_scope}`}>
          <span className="central-health-icon"><MessageCircle size={22}/></span>
          <div><small>{item.operation_scope}</small><strong>{labels[item.provider] ?? item.provider}</strong><em>{item.account_name ?? "Conta sem nome"}</em><p>Última sincronização: {formatDateTime(item.last_sync_at)}</p>{item.last_error && <p className="health-error">{item.last_error}</p>}</div>
          <span className={`badge ${meta.cls}`}><Icon size={13}/>{meta.label}</span>
          <div className="central-health-events"><span>Processados <b>{Number(item.processed_events ?? 0)}</b></span><span>Pendentes <b>{Number(item.pending_events ?? 0)}</b></span><span>Falhos <b>{Number(item.failed_events ?? 0)}</b></span></div>
        </article>;
      })}
    </section>
  </>;
}
