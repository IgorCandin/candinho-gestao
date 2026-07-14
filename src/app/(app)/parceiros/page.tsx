import Link from "next/link";
import { CircleDollarSign, Gift, Handshake, Link2, Plus } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { PartnersTable } from "@/components/partners-table";
import { StatCard } from "@/components/stat-card";
import { getPartnersOverview, getUnassignedPartnershipSales } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export default async function PartnersPage() {
  const [partners, unassigned] = await Promise.all([getPartnersOverview(), getUnassignedPartnershipSales()]);
  const active = partners.filter((partner) => partner.active && partner.status !== "Pausado");
  const pending = partners.filter((partner) => partner.settlement_pending);
  const cycleRevenue = partners.reduce((sum, partner) => sum + partner.current_cycle_revenue, 0);
  return <>
    <DemoBanner />
    <PageHeader eyebrow="Rede Candinho" title="Parceiros" description="Metas, comissões, brindes, vendas vinculadas e histórico de acertos em um só lugar." action={<Link className="button gold" href="/parceiros/novo"><Plus size={16} />Novo parceiro</Link>} />
    <section className="stats-grid partner-stats-grid">
      <StatCard label="Parceiros ativos" value={String(active.length)} note={`${partners.length} cadastrados`} icon={Handshake} />
      <StatCard label="Acertos pendentes" value={String(pending.length)} note="Metas ou movimentos a revisar" icon={Gift} />
      <StatCard label="Vendas no ciclo" value={String(partners.reduce((sum, partner) => sum + partner.current_cycle_sales_count, 0))} note={formatCurrency(cycleRevenue)} icon={CircleDollarSign} />
      <StatCard label="Vendas sem vínculo" value={String(unassigned.length)} note="Registros antigos para revisar" icon={Link2} />
    </section>
    <PartnersTable partners={partners} />
  </>;
}
