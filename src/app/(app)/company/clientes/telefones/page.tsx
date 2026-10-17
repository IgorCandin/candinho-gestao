import { redirect } from "next/navigation";
import { CompanyMissingPhones, type PhoneOperation } from "@/components/company-missing-phones";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MissingPhonesPage({ searchParams }: { searchParams: Promise<{ operacao?: string; pagina?: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const allowedOperations: PhoneOperation[] = [];
  if (access.role === "admin" || access.canAccessSupplements) allowedOperations.push("Suplementos");
  if (access.role === "admin" || access.canAccessFitness) allowedOperations.push("Fitness");
  const query = await searchParams;
  const operation = query.operacao ?? allowedOperations[0];
  if (!allowedOperations.includes(operation as PhoneOperation)) redirect("/company/escritorio");
  const page = Math.max(1, Math.min(10000, Number.parseInt(query.pagina ?? "1", 10) || 1));
  const pageSize = 50;
  const db = await createClient();
  let pending = db.from(operation === "Fitness" ? "fitness_customers" : "customers").select("id,name,city", { count: "exact" }).or("phone.is.null,phone.eq.");
  if (operation === "Suplementos") pending = pending.eq("active", true);
  const { data, count, error } = await pending.order("name").order("id").range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error("Não foi possível consultar os telefones pendentes. Tente atualizar a página.");
  return <CompanyMissingPhones key={`${operation}:${page}`} customers={data ?? []} operation={operation as PhoneOperation} total={count ?? 0} page={page} pageSize={pageSize} canWrite={operation === "Fitness" ? access.canWriteFitness : access.canWriteSupplements} allowedOperations={allowedOperations}/>;
}
