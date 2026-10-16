import { CompanyOfficeScene } from "@/components/company-office-scene";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getBankMonthHomeDataV2 } from "@/lib/bank-home-data-v2";

export const dynamic = "force-dynamic";

type Signal = { label: string; count: number | null; href: string };
type Room = { name: string; color: string; signals: Signal[] };

export default async function CompanyOfficePage() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const db = await createClient();
  const supplements = access.role === "admin" || access.canAccessSupplements;
  const fitness = access.role === "admin" || access.canAccessFitness;
  const bank = access.role === "admin" || access.canAccessBank;
  async function count(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> {
    try {
      const result = await query;
      if (result.error) return null;
      return result.count;
    } catch { return null; }
  }
  const [missingSupplementPhone, missingFitnessPhone, supplementDelivery, fitnessDelivery, bankMonth] = await Promise.all([
    supplements ? count(db.from("customers").select("id", { count: "exact", head: true }).eq("active", true).or("phone.is.null,phone.eq.")) : null,
    fitness ? count(db.from("fitness_customers").select("id", { count: "exact", head: true }).or("phone.is.null,phone.eq.")) : null,
    supplements ? count(db.from("sales").select("id", { count: "exact", head: true }).eq("record_type", "sale").neq("general_status", "cancelled").neq("delivery_status", "delivered")) : null,
    fitness ? count(db.from("fitness_sales").select("id", { count: "exact", head: true }).neq("general_status", "cancelled").neq("delivery_status", "delivered")) : null,
    bank ? getBankMonthHomeDataV2().catch(() => null) : null,
  ]);
  const rooms: Room[] = [];
  if (supplements || fitness) rooms.push({ name: "Company · Clientes", color: "#d5b27b", signals: [
    ...(supplements ? [{ label: "Cadastros Suplementos ativos sem telefone", count: missingSupplementPhone, href: "/company/clientes" }] : []),
    ...(fitness ? [{ label: "Cadastros Fitness sem telefone", count: missingFitnessPhone, href: "/company/clientes" }] : []),
  ] });
  if (supplements) rooms.push({ name: "Suplementos", color: "#79c8b4", signals: [{ label: "Vendas não canceladas aguardando entrega", count: supplementDelivery, href: "/company/concluir?operacao=Suplementos" }] });
  if (fitness) rooms.push({ name: "Fitness", color: "#bda2e8", signals: [{ label: "Vendas não canceladas aguardando entrega", count: fitnessDelivery, href: "/company/concluir?operacao=Fitness" }] });
  if (bank) rooms.push({ name: "Bank", color: "#8abde3", signals: [
    { label: "Compromissos vencidos do mês consultado", count: bankMonth?.overdue.length ?? null, href: "/bank/planejamento" },
    { label: "Compromissos com vencimento hoje", count: bankMonth?.dueToday.length ?? null, href: "/bank/planejamento" },
    { label: "Próximos compromissos do mês", count: bankMonth?.upcoming.length ?? null, href: "/bank/planejamento" },
  ] });
  const consulted = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date());
  return <CompanyOfficeScene rooms={rooms} consulted={consulted}/>;
}
