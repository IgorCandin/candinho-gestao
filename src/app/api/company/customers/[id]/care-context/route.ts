import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

type TimelineEntry = { event_at?: string; event_type?: string; operation?: string; title?: string; subtitle?: string | null; amount?: number | null; status?: string | null };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("customer_company_360_snapshot", { p_customer_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const source = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const timeline = (Array.isArray(source.timeline) ? source.timeline : []).slice(0, 8) as TimelineEntry[];
  const recentInteraction = timeline.find((entry) => ["interaction", "post_sale"].includes(String(entry.event_type)));
  const recentSale = timeline.find((entry) => ["supplements_sale", "fitness_sale"].includes(String(entry.event_type)));
  const nexusSuggestion = recentInteraction
    ? `Retome pelo último registro: ${recentInteraction.title ?? "conversa anterior"}${recentInteraction.subtitle ? ` — ${recentInteraction.subtitle}` : ""}. Termine definindo uma próxima ação.`
    : recentSale
      ? `Comece perguntando como foi a experiência com ${recentSale.title ?? "a última compra"} e confirme se ainda possui o produto.`
      : "Faça um contato curto, confirme a necessidade atual e registre o próximo passo antes de encerrar.";
  return NextResponse.json({ timeline, nexusSuggestion });
}
