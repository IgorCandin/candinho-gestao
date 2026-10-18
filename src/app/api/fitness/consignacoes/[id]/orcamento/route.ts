import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { buildConsignmentProposalPdf } from "@/lib/fitness-consignment-proposal-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.active || !access.canAccessFitness) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Consignação inválida" }, { status: 400 });
  const db = await createClient();
  const [consignment, items] = await Promise.all([
    db.from("fitness_consignments_overview").select("id,customer_name,started_on").eq("id", id).maybeSingle(),
    db.from("fitness_consignment_items_overview").select("product_name,size,color,quantity_sent,unit_price").eq("consignment_id", id).order("created_at"),
  ]);
  if (consignment.error || items.error) return NextResponse.json({ error: "Não foi possível carregar o orçamento da consignação." }, { status: 500 });
  if (!consignment.data) return NextResponse.json({ error: "Consignação não encontrada" }, { status: 404 });
  if (!items.data?.length) return NextResponse.json({ error: "Esta consignação não tem peças para gerar o orçamento." }, { status: 422 });
  let logo: Uint8Array | undefined;
  try { logo = await readFile(path.join(process.cwd(), "public", "candinho-fitness-logo.png")); } catch { /* Text branding remains available. */ }
  const bytes = await buildConsignmentProposalPdf({
    id, customerName: consignment.data.customer_name, startedOn: consignment.data.started_on,
    items: items.data.map(item => ({ name: item.product_name, size: item.size, color: item.color, quantity: Number(item.quantity_sent), unitPrice: Number(item.unit_price) })),
  }, logo);
  return new Response(Buffer.from(bytes), { headers: {
    "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="orcamento-consignacao-${id.slice(0, 8)}.pdf"`, "Cache-Control": "private, no-store",
  } });
}
