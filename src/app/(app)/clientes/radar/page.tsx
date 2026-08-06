import Link from "next/link";
import { PackageSearch, Radar, Repeat2, Sparkles, Zap } from "lucide-react";
import { CustomerSalesRadarV45 } from "@/components/customer-sales-radar-v45";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CustomerRadarPage() {
  const supabase = await createClient();

  const [opportunitiesResult, priorityResult] = await Promise.all([
    supabase
      .from("customer_sales_opportunities_actionable_v2")
      .select("*")
      .order("opportunity_score", { ascending: false })
      .limit(500),
    supabase
      .from("customer_sales_opportunities_priority_v2")
      .select("*")
      .order("opportunity_score", { ascending: false })
      .limit(200),
  ]);

  if (opportunitiesResult.error) throw new Error(opportunitiesResult.error.message);
  if (priorityResult.error) throw new Error(priorityResult.error.message);

  const opportunities = (opportunitiesResult.data ?? []) as SalesOpportunity[];
  const priorityCustomers = (priorityResult.data ?? []) as SalesOpportunity[];

  const high = opportunities.filter((row) => row.priority === "Alta").length;
  const repurchase = opportunities.filter((row) => row.opportunity_group === "recompra").length;
  const creatine = opportunities.filter((row) => row.opportunity_group === "creatina_candinho").length;
  const complementary = opportunities.filter((row) => row.opportunity_group === "produto_complementar").length;

  return (
    <>
      <PageHeader
        eyebrow="Candinho Suplementos · Nexus Comercial"
        title="Radar de Vendas"
        description="Quem chamar, o que oferecer e por que agora. O Radar aprende com seus feedbacks e deixa de insistir em oportunidades pausadas."
        action={
          <div className="page-header-actions">
            <Link className="button ghost" href="/suplementos/saidas">
              Saídas não-venda
            </Link>
            <Link className="button ghost" href="/parceiros/configuracao">
              Parcerias
            </Link>
            <Link className="button gold" href="/clientes/radar/produtos">
              <PackageSearch size={15} /> Quero vender um produto
            </Link>
          </div>
        }
      />

      <section className="grid stats-grid crm-stats-grid sales-radar-stats-v45">
        <StatCard
          href="/clientes/radar"
          label="Clientes para falar"
          value={String(priorityCustomers.length)}
          note="Melhor oportunidade por cliente"
          icon={Radar}
        />
        <StatCard
          href="/clientes/radar"
          label="Alta prioridade"
          value={String(high)}
          note="Oportunidades mais quentes"
          icon={Zap}
        />
        <StatCard
          href="/clientes/radar"
          label="Recompras"
          value={String(repurchase)}
          note="Produto acabando ou já vencido"
          icon={Repeat2}
        />
        <StatCard
          href="/clientes/radar"
          label="Creatina Candinho"
          value={String(creatine)}
          note="Primeira compra, troca ou reposição"
          icon={Sparkles}
        />
        <StatCard
          href="/clientes/radar"
          label="Complementares"
          value={String(complementary)}
          note="Próximo produto coerente"
          icon={PackageSearch}
        />
      </section>

      <CustomerSalesRadarV45
        opportunities={opportunities}
        priorityCustomers={priorityCustomers}
      />
    </>
  );
}
