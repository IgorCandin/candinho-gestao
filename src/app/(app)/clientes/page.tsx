import Link from "next/link";
import { AlertTriangle, CalendarClock, ContactRound, Plus, Radar, UserRoundSearch } from "lucide-react";
import { CustomersTable } from "@/components/customers-table";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCustomerCRMSummary, getCustomerOpportunityRadarSummary, getCustomers } from "@/lib/data";

export default async function CustomersPage() {
  const [customers, summary, radar] = await Promise.all([getCustomers(), getCustomerCRMSummary(), getCustomerOpportunityRadarSummary()]);
  const returns = summary.followups_today + summary.overdue_followups;
  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Relacionamento"
        title="CRM de clientes"
        description="Retornos, pós-venda, oportunidades, cuidados e histórico reunidos em uma única fila."
        action={<Link className="button gold" href="/clientes/novo"><Plus size={16} />Novo cliente</Link>}
      />
      <section className="grid stats-grid crm-stats-grid crm-stats-grid-five">
        <StatCard href="/clientes" label="Clientes ativos" value={String(summary.total_active_customers)} note="Cadastros disponíveis" icon={ContactRound} />
        <StatCard href="/agenda" label="Retornos" value={String(returns)} note={`${summary.overdue_followups} atrasado(s) · ${summary.followups_today} para hoje`} icon={CalendarClock} />
        <StatCard href="/leads" label="Oportunidades" value={String(summary.lead_only_customers + summary.inactive_customers)} note={`${summary.lead_only_customers} leads · ${summary.inactive_customers} inativos`} icon={UserRoundSearch} />
        <StatCard href="/clientes" label="Cuidados" value={String(summary.care_customers)} note="Restrições ou atenção especial" icon={AlertTriangle} />
        <StatCard href="/clientes/radar" label="Possíveis clientes" value={String(radar.possible_customers)} note={`${radar.high_priority} em alta prioridade`} icon={Radar} />
      </section>
      <article className="panel crm-customers-panel">
        <div className="panel-head">
          <div><h2>Radar de relacionamento</h2><p>Prioridade operacional sem alterar a ordem original dos dados.</p></div>
          <strong>{customers.length}</strong>
        </div>
        {customers.length === 0 ? <div className="empty"><strong>Nenhum cliente cadastrado</strong>Cadastre o primeiro cliente.</div> : <CustomersTable customers={customers} />}
      </article>
    </>
  );
}
