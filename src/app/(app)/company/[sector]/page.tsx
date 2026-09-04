import Link from "next/link";
import { ArrowLeft, BarChart3, Construction, Handshake, Truck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getAgendaEvents, getAgendaPurchaseOrderOptions, getAgendaSaleOptions, getAgendaSummary, getAgendaUsers, getCurrentUserAccess, getCustomerOptions, getFitnessCustomers, getFitnessDashboardPendingSales, getFitnessProducts, getProductCatalog } from "@/lib/data";
import { CompanySalesWorkspace } from "@/components/company-sales-workspace";
import { CompanyCompletionWorkspace } from "@/components/company-completion-workspace";
import type { CompletionOrder } from "@/components/company-completion-workspace";
import { CompanyProductsWorkspace } from "@/components/company-products-workspace";
import { CompanyCareWorkspace } from "@/components/company-care-workspace";
import { AgendaDragDropV4532 } from "@/components/agenda-drag-drop-v45-32";
import { OperationalCalendar } from "@/components/operational-calendar";
import type { CompanyCareItem } from "@/components/company-care-workspace";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";
import type { LeadRow, PendingOrderRow } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SECTORS: Record<string, { title: string; description: string }> = {
  vender: { title: "Vender agora", description: "A próxima etapa reunirá recompra, leads quentes e oportunidades em uma fila única de venda." },
  concluir: { title: "Concluir vendas", description: "Recebimentos e entregas reunidos na mesma fila." },
  acompanhar: { title: "Atender e acompanhar", description: "A próxima etapa reunirá pós-vendas, respostas aguardadas e retornos combinados." },
  produtos: { title: "Produtos", description: "Consulte disponibilidade, preços e catálogo sem sair da Company." },
  dia: { title: "Gestão", description: "Agenda, valores, parceiros, fornecedores e decisões da Company." },
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
    const [opportunitiesResult, priorityResult, leadsResult, mediaResult, baseResult, feedbackResult, fitnessCustomers] = await Promise.all([
      supabase.from("customer_sales_opportunities_actionable_v2").select("*").order("opportunity_score", { ascending: false }).limit(300),
      supabase.from("customer_sales_opportunities_priority_v2").select("*").order("opportunity_score", { ascending: false }).limit(100),
      supabase.from("leads_history").select("*").eq("general_status", "pending").order("lead_date", { ascending: false }).limit(150),
      supabase.from("products").select("id,image_url,banner_image_url").eq("active", true),
      supabase.from("customer_sales_opportunities_v1").select("*").order("opportunity_score", { ascending: false }).limit(500),
      supabase.from("customer_sales_opportunity_feedback").select("customer_id,recommended_product_id,opportunity_group,feedback_status,next_action_on,created_at").order("created_at", { ascending: false }).limit(2000),
      access.role === "admin" || access.canAccessFitness ? getFitnessCustomers() : Promise.resolve([]),
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
    return <CompanySalesWorkspace opportunities={opportunities} priorityCustomers={[...priorityByCustomer.values()]} leads={(leadsResult.data ?? []) as LeadRow[]} fitnessCustomers={fitnessCustomers} productMedia={productMedia} />;
  }

  if (sector === "concluir") {
    const supabase = await createClient();
    const [{ data, error }, fitnessSales] = await Promise.all([
      supabase.from("pending_orders").select("*").order("business_at", { ascending: true }).limit(500),
      access.role === "admin" || access.canAccessFitness ? getFitnessDashboardPendingSales(500) : Promise.resolve([]),
    ]);
    if (error) throw new Error(error.message);
    const supplements = ((data ?? []) as PendingOrderRow[]).map((order) => ({ ...order, operation: "Suplementos" as const, details_href: `/company/concluir/${order.id}`, customer_key: order.customer_name.split(" - ")[0].trim().toLocaleLowerCase("pt-BR") }));
    const fitness: CompletionOrder[] = fitnessSales.map((sale) => ({
      id: sale.id, customer_id: sale.customer_id, customer_name: sale.customer_name, location_id: "fitness", location_code: "FIT", location_name: "Candinho Fitness",
      business_at: sale.created_at, business_date: sale.quoted_on, order_at: sale.created_at, paid_at: sale.paid_on, delivered_at: sale.delivered_on, general_status: sale.general_status,
      payment_status: sale.payment_status, delivery_status: sale.delivery_status, payment_method: sale.payment_method, payment_condition: null, total_amount: sale.total_amount,
      total_profit: sale.total_profit, product_summary: sale.product_summary, total_items: sale.total_items, primary_product_id: null, primary_image_url: null,
      payment_due_at: sale.payment_due_on, price_condition: null, partner_id: null, partner_name: null, reservation_status: sale.reservation_status,
      operation: "Fitness", details_href: `/company/concluir/fitness/${sale.id}`, customer_key: sale.customer_name.split(" - ")[0].trim().toLocaleLowerCase("pt-BR"),
    }));
    const orders: CompletionOrder[] = [...supplements, ...fitness];
    const saleIds = orders.map((order) => order.id);
    const itemsResult = saleIds.length
      ? await supabase.from("sale_items").select("sale_id,product_id,quantity,product:products(name,image_url)").in("sale_id", saleIds)
      : { data: [], error: null };
    if (itemsResult.error) throw new Error(itemsResult.error.message);
    const itemMedia: Record<string, Array<{ productId: string; name: string; imageUrl: string | null; quantity: number }>> = {};
    for (const row of itemsResult.data ?? []) {
      const product = Array.isArray(row.product) ? row.product[0] : row.product;
      (itemMedia[row.sale_id] ??= []).push({ productId: row.product_id, name: product?.name ?? "Produto", imageUrl: product?.image_url ?? null, quantity: Number(row.quantity) });
    }
    const fitnessIds = fitness.map((order) => order.id);
    if (fitnessIds.length) {
      const fitnessItems = await supabase.from("fitness_sale_items").select("sale_id,quantity,variant:fitness_variants(product_id,product:fitness_products(name,image_url))").in("sale_id", fitnessIds);
      if (fitnessItems.error) throw new Error(fitnessItems.error.message);
      for (const row of fitnessItems.data ?? []) {
        const variant = Array.isArray(row.variant) ? row.variant[0] : row.variant;
        const product = variant && (Array.isArray(variant.product) ? variant.product[0] : variant.product);
        (itemMedia[row.sale_id] ??= []).push({ productId: variant?.product_id ?? row.sale_id, name: product?.name ?? "Produto Fitness", imageUrl: product?.image_url ?? null, quantity: Number(row.quantity) });
      }
    }
    return <CompanyCompletionWorkspace orders={orders} itemMedia={itemMedia} />;
  }

  if (sector === "acompanhar") {
    const supabase = await createClient();
    const canSupplements = access.role === "admin" || access.canAccessSupplements;
    const canFitness = access.role === "admin" || access.canAccessFitness;
    const [suppPost, fitnessPost, crm, feedback] = await Promise.all([
      canSupplements ? supabase.from("post_sale_batch_overview").select("*").order("due_on").limit(500) : Promise.resolve({ data: [], error: null }),
      canFitness ? supabase.from("fitness_post_sale_overview").select("*").order("due_on").limit(500) : Promise.resolve({ data: [], error: null }),
      canSupplements ? supabase.from("customer_crm_overview").select("*").eq("active", true).order("radar_rank").limit(800) : Promise.resolve({ data: [], error: null }),
      canSupplements ? supabase.from("customer_sales_opportunity_feedback").select("customer_id,feedback_status,next_action_on,created_at").eq("feedback_status", "contacted").order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null }),
    ]);
    for (const result of [suppPost, fitnessPost, crm, feedback]) if (result.error) throw new Error(result.error.message);
    const items: CompanyCareItem[] = [];
    for (const row of suppPost.data ?? []) if (row.status === "planned") items.push({ id: `sup-post-${row.id}`, sourceId: row.id, customerId: row.customer_id, customerName: row.customer_name ?? "Cliente", phone: row.customer_phone, city: row.city, operation: "Suplementos", kind: "post_sale", dueOn: row.due_on, title: row.product_summary ?? "Pós-venda", note: `${Number(row.sale_count ?? 0)} compra(s) · ${Number(row.total_amount ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, href: `/company/acompanhar/suplementos/${row.id}` });
    for (const row of fitnessPost.data ?? []) if (row.status === "planned") items.push({ id: `fit-post-${row.id}`, sourceId: row.id, customerId: row.customer_id, customerName: row.customer_name ?? "Cliente", phone: row.customer_phone, city: row.city, operation: "Fitness", kind: "post_sale", dueOn: row.due_on, title: row.product_summary ?? "Pós-venda Fitness", note: `${Number(row.sale_count ?? 0)} compra(s) · ${Number(row.total_amount ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, href: `/company/acompanhar/fitness/${row.id}` });
    const crmById = new Map((crm.data ?? []).map((row) => [row.id, row]));
    for (const row of crm.data ?? []) if (Number(row.pending_followup_count ?? 0) > 0 && row.next_followup_at && row.next_followup_id) items.push({ id: `follow-${row.next_followup_id}`, sourceId: row.next_followup_id, customerId: row.id, customerName: row.name, phone: row.phone, city: row.city, operation: "Suplementos", kind: "follow_up", dueOn: row.next_followup_at, title: row.next_action_label ?? "Retorno combinado", note: row.next_followup_notes ?? row.last_contact_outcome ?? "Retorno registrado no CRM", href: `/company/clientes/${row.id}` });
    const seenWaiting = new Set<string>();
    for (const row of feedback.data ?? []) { if (seenWaiting.has(row.customer_id)) continue; seenWaiting.add(row.customer_id); const customer = crmById.get(row.customer_id); if (customer) items.push({ id: `waiting-${row.customer_id}`, sourceId: row.customer_id, customerId: row.customer_id, customerName: customer.name, phone: customer.phone, city: customer.city, operation: "Suplementos", kind: "waiting", dueOn: row.next_action_on, title: "Aguardando resposta", note: "Contato iniciado pela fila Vender agora", href: `/company/clientes/${row.customer_id}` }); }
    return <CompanyCareWorkspace items={items} />;
  }

  if (sector === "produtos") {
    const supabase = await createClient();
    const [supplements, fitness, supplementMedia] = await Promise.all([
      access.role === "admin" || access.canAccessSupplements ? getProductCatalog() : Promise.resolve([]),
      access.role === "admin" || access.canAccessFitness ? getFitnessProducts() : Promise.resolve([]),
      access.role === "admin" || access.canAccessSupplements ? supabase.from("products").select("id,secondary_image_url").eq("active", true) : Promise.resolve({ data: [], error: null }),
    ]);
    if (supplementMedia.error) throw new Error(supplementMedia.error.message);
    const secondaryByProduct = new Map((supplementMedia.data ?? []).map((row) => [row.id, row.secondary_image_url]));
    const products = [
      ...supplements.filter((product) => product.active).map((product) => ({ ...product, secondary_image_url: secondaryByProduct.get(product.id) ?? null, operation: "Suplementos" as const })),
      ...fitness.filter((product) => product.active).map((product) => ({ ...product, brand: null, sale_price: product.min_sale_price, operation: "Fitness" as const })),
    ];
    return <CompanyProductsWorkspace products={products} />;
  }

  if (sector === "dia") {
    const [events, summary, customers, sales, purchaseOrders, users] = await Promise.all([
      getAgendaEvents(), getAgendaSummary(), getCustomerOptions(), getAgendaSaleOptions(), getAgendaPurchaseOrderOptions(), getAgendaUsers(),
    ]);
    const canWrite = access.role === "admin" || access.canWriteSupplements || access.canWriteFitness;
    return <div className="company-workspace-v2 company-global-agenda">
      <header className="company-workspace-heading"><span>COMPANY · GESTÃO</span><h1>Visão da empresa</h1><p>Confira os números, organize a agenda e abra cadastros administrativos sem procurar por várias operações.</p></header>
      <section className="company-management-links">
        <Link href="/central/executivo"><BarChart3/><div><strong>Painel de valores</strong><span>Indicadores, resultados e conferência</span></div><b>→</b></Link>
        <Link href="/parceiros/gerencial"><Handshake/><div><strong>Parceiros</strong><span>Produtos, vendas, percentuais e acertos</span></div><b>→</b></Link>
        <Link href="/fornecedores"><Truck/><div><strong>Fornecedores</strong><span>Cadastros, pedidos e histórico de compra</span></div><b>→</b></Link>
      </section>
      <header className="company-management-agenda-head"><span>AGENDA GLOBAL</span><h2>Organizar compromissos</h2><p>Suplementos e Fitness aparecem juntas e podem ser reorganizadas arrastando.</p></header>
      <AgendaDragDropV4532 events={events} enabled={canWrite} />
      <OperationalCalendar events={events} summary={summary} customers={customers} sales={sales} purchaseOrders={purchaseOrders} users={users} canWrite={canWrite} />
    </div>;
  }

  return <div className="company-v2-page"><div className="company-coming-soon"><Construction size={34} /><span>ERP 2.0 · Próximo módulo</span><h1>{config.title}</h1><p>{config.description}</p><Link className="button ghost" href="/company/inicio"><ArrowLeft size={16} />Voltar à Company</Link></div></div>;
}
