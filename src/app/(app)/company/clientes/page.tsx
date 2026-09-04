import { redirect } from "next/navigation";
import { CompanyCustomerRegistry } from "@/components/company-customer-registry";
import type { CompanyCustomerRow } from "@/components/company-customer-registry";
import { getCurrentUserAccess, getCustomers, getFitnessCustomers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CompanyCustomersPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const [supplements, fitness] = await Promise.all([
    access.role === "admin" || access.canAccessSupplements ? getCustomers() : Promise.resolve([]),
    access.role === "admin" || access.canAccessFitness ? getFitnessCustomers() : Promise.resolve([]),
  ]);
  const customers: CompanyCustomerRow[] = [
    ...supplements.map((row) => ({ id: row.id, name: row.name, phone: row.phone, city: row.city, operation: "Suplementos" as const, purchaseCount: row.purchase_count, totalSpent: row.total_spent, lastPurchaseOn: row.last_purchase_at, activityCount: row.purchase_count + row.lead_count + row.interaction_count + row.pending_followup_count, detailHref: `/company/clientes/${row.id}`, editHref: `/company/clientes/${row.id}` })),
    ...fitness.map((row) => ({ id: row.id, name: row.name, phone: row.phone, city: row.city, operation: "Fitness" as const, purchaseCount: row.total_purchases, totalSpent: row.total_spent, lastPurchaseOn: row.last_purchase_on, activityCount: row.total_purchases, detailHref: `/company/clientes/fitness/${row.id}`, editHref: `/fitness/clientes/${row.id}/editar` })),
  ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR") || a.operation.localeCompare(b.operation));
  return <CompanyCustomerRegistry customers={customers} canWriteSupplements={access.canWriteSupplements} canWriteFitness={access.canWriteFitness}/>;
}
