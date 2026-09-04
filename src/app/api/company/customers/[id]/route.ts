import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getCurrentUserAccess();
  const operation = new URL(request.url).searchParams.get("operation");
  const { id } = await params;
  if (!access.active || (operation === "fitness" ? !access.canWriteFitness : !access.canWriteSupplements)) return NextResponse.json({ error: "Sem permissão para excluir este cadastro." }, { status: 403 });
  const supabase = await createClient();
  if (operation !== "fitness") {
    const { data: linkedFitness, error: linkedError } = await supabase.from("fitness_customers").select("id").eq("core_customer_id", id).maybeSingle();
    if (linkedError) return NextResponse.json({ error: linkedError.message }, { status: 400 });
    const supplementChecks = [["sales", "customer_id"], ["sales_quotes", "customer_id"], ["customer_interactions", "customer_id"], ["post_sale_batches", "customer_id"], ["sale_replenishment_reminders", "customer_id"], ["customer_relationships", "customer_id"], ["customer_relationships", "related_customer_id"]] as const;
    const fitnessChecks = [["fitness_sales", "customer_id"], ["fitness_quotes", "customer_id"], ["fitness_consignments", "customer_id"], ["fitness_post_sale_state", "customer_id"], ["fitness_post_sale_history", "customer_id"]] as const;
    for (const [table, column] of supplementChecks) { const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq(column, id); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); if ((count ?? 0) > 0) return NextResponse.json({ error: "Este cadastro possui movimentações ou histórico e não pode ser excluído." }, { status: 409 }); }
    if (linkedFitness?.id) for (const [table, column] of fitnessChecks) { const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq(column, linkedFitness.id); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); if ((count ?? 0) > 0) return NextResponse.json({ error: "Este cadastro possui movimentações ou histórico e não pode ser excluído." }, { status: 409 }); }
    if (linkedFitness?.id) { const { error } = await supabase.from("fitness_customers").delete().eq("id", linkedFitness.id); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); }
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  const checks = operation === "fitness"
    ? [["fitness_sales", "customer_id"], ["fitness_quotes", "customer_id"], ["fitness_consignments", "customer_id"], ["fitness_post_sale_state", "customer_id"], ["fitness_post_sale_history", "customer_id"]] as const
    : [["sales", "customer_id"], ["sales_quotes", "customer_id"], ["customer_interactions", "customer_id"], ["post_sale_batches", "customer_id"], ["sale_replenishment_reminders", "customer_id"], ["customer_relationships", "customer_id"], ["customer_relationships", "related_customer_id"]] as const;
  for (const [table, column] of checks) { const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq(column, id); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); if ((count ?? 0) > 0) return NextResponse.json({ error: "Este cadastro possui movimentações ou histórico e não pode ser excluído." }, { status: 409 }); }
  const table = operation === "fitness" ? "fitness_customers" : "customers";
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
