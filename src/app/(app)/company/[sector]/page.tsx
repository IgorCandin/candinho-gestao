import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";
import { CompanySalesWorkspace } from "@/components/company-sales-workspace";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";
import type { LeadRow } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SECTORS: Record<string, { title: string; description: string }> = {
  vender: { title: "Vender agora", description: "A próxima etapa reunirá recompra, leads quentes e oportunidades em uma fila única de venda." },
  receber: { title: "Receber dinheiro", description: "A próxima etapa reunirá cobranças vencidas, valores de hoje e acordos pendentes." },
  acompanhar: { title: "Atender e acompanhar", description: "A próxima etapa reunirá pós-vendas, respostas aguardadas e retornos combinados." },
  entregar: { title: "Entregar", description: "A próxima etapa reunirá pedidos prontos, retiradas, rotas e pendências logísticas." },
  dia: { title: "Organizar o dia", description: "A próxima etapa reunirá agenda, tarefas, alertas e itens sem próxima ação." },
};

export default async function CompanySectorPage({ params }: { params: Promise<{ sector: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const { sector } = await params;
  const config = SECTORS[sector];
  if (!config) notFound();

  if (sector === "vender") {
    const supabase = await createClient();
    const [opportunitiesResult, priorityResult, leadsResult, mediaResult] = await Promise.all([
      supabase.from("customer_sales_opportunities_actionable_v2").select("*").order("opportunity_score", { ascending: false }).limit(300),
      supabase.from("customer_sales_opportunities_priority_v2").select("*").order("opportunity_score", { ascending: false }).limit(100),
      supabase.from("leads_history").select("*").eq("general_status", "pending").order("lead_date", { ascending: false }).limit(150),
      supabase.from("products").select("id,image_url,banner_image_url").eq("active", true),
    ]);
    if (opportunitiesResult.error) throw new Error(opportunitiesResult.error.message);
    if (priorityResult.error) throw new Error(priorityResult.error.message);
    if (leadsResult.error) throw new Error(leadsResult.error.message);
    if (mediaResult.error) throw new Error(mediaResult.error.message);
    const productMedia = Object.fromEntries((mediaResult.data ?? []).map((row) => [row.id, { photo1: row.image_url, photo2: row.banner_image_url }]));
    return <CompanySalesWorkspace opportunities={(opportunitiesResult.data ?? []) as SalesOpportunity[]} priorityCustomers={(priorityResult.data ?? []) as SalesOpportunity[]} leads={(leadsResult.data ?? []) as LeadRow[]} productMedia={productMedia} />;
  }

  return <div className="company-v2-page"><div className="company-coming-soon"><Construction size={34} /><span>ERP 2.0 · Próximo módulo</span><h1>{config.title}</h1><p>{config.description}</p><Link className="button ghost" href="/company/inicio"><ArrowLeft size={16} />Voltar à Company</Link></div></div>;
}
