import { redirect } from "next/navigation";
import { CompanyCustomerRegistry } from "@/components/company-customer-registry";
import type { CompanyCustomerRow } from "@/components/company-customer-registry";
import { getCurrentUserAccess, getCustomers, getFitnessCustomers } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CompanyCustomersPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const [supplements, fitness] = await Promise.all([
    access.role === "admin" || access.canAccessSupplements ? getCustomers() : Promise.resolve([]),
    access.role === "admin" || access.canAccessFitness ? getFitnessCustomers() : Promise.resolve([]),
  ]);
  const supabase = await createClient();
  const { data: fitnessLinks } = fitness.length
    ? await supabase.from("fitness_customers").select("id,core_customer_id").in("id", fitness.map((row) => row.id))
    : { data: [] };
  const coreByFitness = new Map((fitnessLinks ?? []).map((row) => [String(row.id), typeof row.core_customer_id === "string" ? row.core_customer_id : null]));
  const fitnessByCore = new Map(fitness.map((row) => [coreByFitness.get(row.id), row]).filter((entry): entry is [string, typeof fitness[number]] => Boolean(entry[0])));
  const linkedFitnessIds = new Set(fitnessByCore.values().map((row) => row.id));
  const customers: CompanyCustomerRow[] = supplements.map((row) => {
    const fitnessRow = fitnessByCore.get(row.id);
    const supplementActivity = row.purchase_count + row.lead_count + row.interaction_count + row.pending_followup_count;
    const operations: Array<"Suplementos" | "Fitness"> = [];
    if (row.purchase_count > 0) operations.push("Suplementos");
    if ((fitnessRow?.total_purchases ?? 0) > 0) operations.push("Fitness");
    const lastDates = [row.last_purchase_at, fitnessRow?.last_purchase_on].filter((value): value is string => Boolean(value)).sort().reverse();
    return { id: row.id, fitnessId: fitnessRow?.id ?? null, name: row.name, phone: row.phone ?? fitnessRow?.phone ?? null, city: row.city ?? fitnessRow?.city ?? null, operations, purchaseCount: row.purchase_count + (fitnessRow?.total_purchases ?? 0), totalSpent: row.total_spent + (fitnessRow?.total_spent ?? 0), lastPurchaseOn: lastDates[0] ?? null, activityCount: supplementActivity + (fitnessRow?.total_purchases ?? 0), activitySummary: [row.purchase_count ? `${row.purchase_count} venda(s) em Suplementos` : null, fitnessRow?.total_purchases ? `${fitnessRow.total_purchases} venda(s) em Fitness` : null, row.pending_followup_count ? `${row.pending_followup_count} retorno(s)` : null, row.interaction_count ? `${row.interaction_count} interação(ões)` : null].filter(Boolean).join(" · "), detailHref: `/company/clientes/${row.id}`, editHref: `/company/clientes/${row.id}` };
  });
  for (const row of fitness.filter((item) => !linkedFitnessIds.has(item.id))) customers.push({ id: row.id, fitnessId: row.id, name: row.name, phone: row.phone, city: row.city, operations: row.total_purchases > 0 ? ["Fitness"] : [], purchaseCount: row.total_purchases, totalSpent: row.total_spent, lastPurchaseOn: row.last_purchase_on, activityCount: row.total_purchases, activitySummary: row.total_purchases ? `${row.total_purchases} venda(s) em Fitness` : "Cadastro sem movimentações", detailHref: `/company/clientes/fitness/${row.id}`, editHref: `/fitness/clientes/${row.id}/editar` });
  customers.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return <CompanyCustomerRegistry customers={customers} canWriteSupplements={access.canWriteSupplements} canWriteFitness={access.canWriteFitness}/>;
}
