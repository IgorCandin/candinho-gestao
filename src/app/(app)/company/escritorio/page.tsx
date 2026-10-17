import { CompanyOfficeScene, type OfficeRoom } from "@/components/company-office-scene";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getBankMonthHomeDataV2 } from "@/lib/bank-home-data-v2";
import { getFitnessSizeOpportunities } from "@/lib/fitness-size-opportunities-data";

export const dynamic = "force-dynamic";

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
  // Same operational sources as Concluir/Acompanhar; no new business rules or mutations.
  const operational = async (operation: "Suplementos" | "Fitness", allowed: boolean) => {
    if (!allowed) return [];
    const table = operation === "Fitness" ? "fitness_sales_operational" : "pending_orders";
    const postSale = operation === "Fitness" ? "fitness_post_sale_overview" : "post_sale_batch_overview";
    const [payments, deliveries, care] = await Promise.all([
      count(db.from(table).select("id", { count: "exact", head: true }).neq("general_status", "cancelled").eq("payment_status", "receivable")),
      count(db.from(table).select("id", { count: "exact", head: true }).neq("general_status", "cancelled").eq("delivery_status", "to_deliver")),
      count(db.from(postSale).select("id", { count: "exact", head: true }).eq("status", "planned")),
    ]);
    return [
      { label: "Vendas com recebimento pendente", count: payments, href: "/company/concluir", description: `Vendas de ${operation}. Recebimento e entrega são independentes; confira a operação na fila.` },
      { label: "Vendas com entrega pendente", count: deliveries, href: "/company/concluir", description: "Pode incluir venda também pendente de recebimento. As contagens não devem ser somadas." },
      { label: "Pós-vendas planejados", count: care, href: "/company/acompanhar", description: "Inclui contatos futuros. Consulte a data antes de entrar em contato." },
    ];
  };
  const [missingSupplementPhone, missingFitnessPhone, stockAttention, fitnessIdeas, bankMonth, doctor, supplementOperations, fitnessOperations] = await Promise.all([
    supplements ? count(db.from("customers").select("id", { count: "exact", head: true }).eq("active", true).or("phone.is.null,phone.eq.")) : null,
    fitness ? count(db.from("fitness_customers").select("id", { count: "exact", head: true }).or("phone.is.null,phone.eq.")) : null,
    supplements ? count(db.from("replenishment_overview").select("product_id", { count: "exact", head: true }).or("needs_replenishment.eq.true,backlog_quantity.gt.0")) : null,
    fitness ? getFitnessSizeOpportunities().then(result => result.opportunities.length).catch(() => null) : null,
    bank ? getBankMonthHomeDataV2().catch(() => null) : null,
    (async () => { try { const result = await db.rpc("nexus_ux_doctor_snapshot_v1"); return result.error ? null : result.data as { auto_active?: number; manual_pending?: number } | null; } catch { return null; } })(),
    operational("Suplementos", supplements),
    operational("Fitness", fitness),
  ]);
  const rooms: OfficeRoom[] = [];
  rooms.push({ name: "Company · Clientes", color: "#d5b27b", signals: [
    ...(supplements ? [{ label: "Cadastros Suplementos ativos sem telefone", count: missingSupplementPhone, href: "/company/clientes/telefones?operacao=Suplementos", description: "Preencha o telefone diretamente na fila, sem abrir a ficha." }] : []),
    ...(fitness ? [{ label: "Cadastros Fitness sem telefone", count: missingFitnessPhone, href: "/company/clientes/telefones?operacao=Fitness", description: "Preencha o telefone diretamente na fila, sem abrir a ficha." }] : []),
    { label: "Doctor · sinais automáticos ativos", count: typeof doctor?.auto_active === "number" ? doctor.auto_active : null, href: "/company/qualidade" },
    { label: "Doctor · relatos manuais pendentes", count: typeof doctor?.manual_pending === "number" ? doctor.manual_pending : null, href: "/company/qualidade" },
  ], unmonitored: ["Retornos combinados no CRM", "Leads e orçamentos aguardando decisão", "Agenda operacional e tarefas manuais"] });
  if (supplements) rooms.push({ name: "Suplementos", color: "#79c8b4", signals: [...supplementOperations, { label: "Produtos com demanda sem estoque ou reposição a conferir", count: stockAttention, href: "/company/estoque/atencao", description: "Demanda sem estoque e reposição. Não equivale à fila de entregas pendentes." }], unmonitored: ["Compras de fornecedor aguardando recebimento", "Lotes, validade e quarentena", "Acertos com parceiros"] });
  if (fitness) rooms.push({ name: "Fitness", color: "#bda2e8", signals: [...fitnessOperations, { label: "Possibilidades de venda por tamanho observado · amostra recente", count: fitnessIdeas, href: "/company/fitness/oportunidades", kind: "opportunity", description: "Preferência provável, não certeza. Confirme tamanho e interesse com a cliente." }], unmonitored: ["Consignações e acertos", "Compras e recebimentos", "Estoque por variante e reservas sem cobertura"] });
  if (bank) rooms.push({ name: "Bank", color: "#8abde3", signals: [
    { label: "Compromissos vencidos do mês consultado", count: bankMonth?.overdue.length ?? null, href: "/bank/planejamento" },
    { label: "Compromissos com vencimento hoje", count: bankMonth?.dueToday.length ?? null, href: "/bank/planejamento" },
    { label: "Próximos compromissos do mês", count: bankMonth?.upcoming.length ?? null, href: "/bank/planejamento", kind: "agenda", description: "Agenda do mês atual; não representa toda a dívida nem confirma saldo para pagamento." },
  ], unmonitored: ["Compromissos de outros meses", "Conciliação e entradas a confirmar", "Reservas e previsões financeiras"] });
  const consulted = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date());
  return <CompanyOfficeScene rooms={rooms} consulted={consulted}/>;
}
