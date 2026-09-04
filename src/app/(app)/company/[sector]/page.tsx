import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserAccess, getInventoryOverview } from "@/lib/data";
import { CompanySalesWorkspace } from "@/components/company-sales-workspace";
import { CompanyCompletionWorkspace } from "@/components/company-completion-workspace";
import { CompanyProductsWorkspace } from "@/components/company-products-workspace";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";
import type { InventoryOverviewRow, LeadRow, PendingOrderRow } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SECTORS: Record<string, { title: string; description: string }> = {
  vender: { title: "Vender agora", description: "A próxima etapa reunirá recompra, leads quentes e oportunidades em uma fila única de venda." },
  concluir: { title: "Concluir vendas", description: "Recebimentos e entregas reunidos na mesma fila." },
  acompanhar: { title: "Atender e acompanhar", description: "A próxima etapa reunirá pós-vendas, respostas aguardadas e retornos combinados." },
  produtos: { title: "Produtos", description: "Consulte disponibilidade, preços e catálogo sem sair da Company." },
  dia: { title: "Organizar o dia", description: "A próxima etapa reunirá agenda, tarefas, alertas e itens sem próxima ação." },
};

function brazilToday() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export default async function CompanySectorPage({ params }: { params: Promise<{ sector: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const { sector } = await params;
  if (sector === "receber" || sector === "entregar") redirect("/company/concluir");
  const config = SECTORS[sector];
  if (!config) notFound();

  if (sector === "vender") {
    const supabase = await createClient();
    const [opportunitiesResult, priorityResult, leadsResult, mediaResult, baseResult, feedbackResult] = await Promise.all([
      supabase.from("customer_sales_opportunities_actionable_v2").select("*").order("opportunity_score", { ascending: false }).limit(300),
      supabase.from("customer_sales_opportunities_priority_v2").select("*").order("opportunity_score", { ascending: false }).limit(100),
      supabase.from("leads_history").select("*").eq("general_status", "pending").order("lead_date", { ascending: false }).limit(150),
      supabase.from("products").select("id,image_url,banner_image_url").eq("active", true),
      supabase.from("customer_sales_opportunities_v1").select("*").order("opportunity_score", { ascending: false }).limit(500),
      supabase.from("customer_sales_opportunity_feedback").select("customer_id,recommended_product_id,opportunity_group,feedback_status,next_action_on,created_at").order("created_at", { ascending: false }).limit(2000),
    ]);
    if (opportunitiesResult.error) throw new Error(opportunitiesResult.error.message);
    if (priorityResult.error) throw new Error(priorityResult.error.message);
    if (leadsResult.error) throw new Error(leadsResult.error.message);
    if (mediaResult.error) throw new Error(mediaResult.error.message);
    if (baseResult.error) throw new Error(baseResult.error.message);
    if (feedbackResult.error) throw new Error(feedbackResult.error.message);

    const opportunityKey = (row: { customer_id: string; recommended_product_id?: string | null; opportunity_group?: string | null }) => `${row.customer_id}:${row.recommended_product_id ?? "none"}:${row.opportunity_group ?? "none"}`;
    const latestFeedback = new Map<string, (typeof feedbackResult.data extends Array<infer Row> ? Row : never)>();
    for (const feedback of feedbackResult.data ?? []) {
      const key = opportunityKey(feedback);
      if (!latestFeedback.has(key)) latestFeedback.set(key, feedback);
    }
    const today = brazilToday();
    const dueContacted = (baseResult.data ?? []).flatMap((row) => {
      const feedback = latestFeedback.get(opportunityKey(row));
      if (feedback?.feedback_status !== "contacted" || (feedback.next_action_on && feedback.next_action_on > today)) return [];
      return [{ ...row, last_feedback_status: feedback.feedback_status, feedback_next_action_on: feedback.next_action_on, feedback_at: feedback.created_at } as SalesOpportunity];
    });

    const opportunityMap = new Map<string, SalesOpportunity>();
    for (const row of [...((opportunitiesResult.data ?? []) as SalesOpportunity[]), ...dueContacted]) opportunityMap.set(opportunityKey(row), row);
    const opportunities = [...opportunityMap.values()].sort((a, b) => b.opportunity_score - a.opportunity_score);

    const priorityByCustomer = new Map<string, SalesOpportunity>();
    for (const row of [...((priorityResult.data ?? []) as SalesOpportunity[]), ...dueContacted].sort((a, b) => b.opportunity_score - a.opportunity_score)) {
      if (!priorityByCustomer.has(row.customer_id)) priorityByCustomer.set(row.customer_id, row);
    }
    const productMedia = Object.fromEntries((mediaResult.data ?? []).map((row) => [row.id, { photo1: row.image_url, photo2: row.banner_image_url }]));
    return <CompanySalesWorkspace opportunities={opportunities} priorityCustomers={[...priorityByCustomer.values()]} leads={(leadsResult.data ?? []) as LeadRow[]} productMedia={productMedia} />;
  }

  if (sector === "concluir") {
    const supabase = await createClient();
    const { data, error } = await supabase.from("pending_orders").select("*").order("business_at", { ascending: true }).limit(500);
    if (error) throw new Error(error.message);
    return <CompanyCompletionWorkspace orders={(data ?? []) as PendingOrderRow[]} />;
  }

  if (sector === "produtos") {
    const products = await getInventoryOverview();
    return <CompanyProductsWorkspace products={products as InventoryOverviewRow[]} />;
  }

  return <div className="company-v2-page"><div className="company-coming-soon"><Construction size={34} /><span>ERP 2.0 · Próximo módulo</span><h1>{config.title}</h1><p>{config.description}</p><Link className="button ghost" href="/company/inicio"><ArrowLeft size={16} />Voltar à Company</Link></div></div>;
}
