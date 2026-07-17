import { Radar, Repeat2, UserRoundSearch, Zap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { CustomerOpportunityRadar } from "@/components/customer-opportunity-radar";
import { getCustomerOpportunityRadar, getCustomerOpportunityRadarSummary } from "@/lib/data";

export default async function CustomerRadarPage() {
  const [rows, summary] = await Promise.all([getCustomerOpportunityRadar(), getCustomerOpportunityRadarSummary()]);
  return <>
    <PageHeader eyebrow="Candinho Suplementos · CRM" title="Radar de Oportunidades" description="Possíveis clientes para recompra, reativação e retomada de leads. O Radar prioriza retornos já existentes no CRM/AppSheet antes das sugestões automáticas."/>
    <section className="grid stats-grid crm-stats-grid">
      <StatCard href="/clientes/radar" label="Possíveis clientes" value={String(summary.possible_customers)} note="Oportunidades dentro da janela atual" icon={Radar}/>
      <StatCard href="/clientes/radar" label="Alta prioridade" value={String(summary.high_priority)} note={`${summary.appsheet_prioritized} priorizadas pelo CRM/AppSheet`} icon={Zap}/>
      <StatCard href="/clientes/radar" label="Recompra provável" value={String(summary.likely_repurchase)} note="Baseada no último produto e tempo estimado de uso" icon={Repeat2}/>
      <StatCard href="/clientes/radar" label="Leads esquecidos" value={String(summary.forgotten_leads)} note="Leads que ainda merecem retomada" icon={UserRoundSearch}/>
    </section>
    <CustomerOpportunityRadar rows={rows}/>
  </>;
}
