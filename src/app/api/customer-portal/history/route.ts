import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SupplementSale = { id: string; quoted_at: string; payment_status: string; delivery_status: string; items: Array<{ quantity: number; product: { name: string } | null }> };
type FitnessSale = { id: string; quoted_on: string; payment_status: string; delivery_status: string; items: Array<{ quantity: number; variant: { size: string; color: string; product: { name: string } | null } | null }> };

function digits(value: string | null | undefined) {
  const normalized = (value ?? "").replace(/\D/g, "");
  return normalized.startsWith("55") && normalized.length > 11 ? normalized.slice(2) : normalized;
}

export async function GET() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  const verifiedEmail = user?.email?.trim().toLowerCase() ?? "";
  if (!user || !verifiedEmail) return NextResponse.json({ error: "Confirme seu e-mail para consultar suas compras." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return NextResponse.json({ error: "A consulta segura ainda não foi configurada." }, { status: 503 });
  const db = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  const [{ data: supplementCustomers, error: supplementCustomerError }, { data: fitnessCustomers, error: fitnessCustomerError }] = await Promise.all([
    db.from("customers").select("id,name,phone,email").eq("active", true),
    db.from("fitness_customers").select("id,name,phone").eq("active", true),
  ]);
  if (supplementCustomerError || fitnessCustomerError) return NextResponse.json({ error: "Não foi possível localizar seu cadastro agora." }, { status: 500 });

  const linkedSupplementCustomers = (supplementCustomers ?? []).filter((row) => row.email?.trim().toLowerCase() === verifiedEmail);
  const verifiedPhones = new Set(linkedSupplementCustomers.map((row) => digits(row.phone)).filter(Boolean));
  const linkedFitnessCustomers = (fitnessCustomers ?? []).filter((row) => verifiedPhones.has(digits(row.phone)));
  const supplementIds = linkedSupplementCustomers.map((row) => row.id);
  const fitnessIds = linkedFitnessCustomers.map((row) => row.id);
  const customerNames = [...linkedSupplementCustomers, ...linkedFitnessCustomers].map((row) => row.name);

  const supplementQuery = supplementIds.length
    ? db.from("sales").select("id,quoted_at,general_status,payment_status,delivery_status,items:sale_items(quantity,product:products(name))").in("customer_id", supplementIds).eq("record_type", "sale").neq("general_status", "cancelled").order("quoted_at", { ascending: false })
    : Promise.resolve({ data: [], error: null });
  const fitnessQuery = fitnessIds.length
    ? db.from("fitness_sales").select("id,quoted_on,general_status,payment_status,delivery_status,items:fitness_sale_items(quantity,variant:fitness_variants(size,color,product:fitness_products(name)))").in("customer_id", fitnessIds).neq("general_status", "cancelled").order("quoted_on", { ascending: false })
    : Promise.resolve({ data: [], error: null });
  const [supplements, fitness] = await Promise.all([supplementQuery, fitnessQuery]);
  if (supplements.error || fitness.error) return NextResponse.json({ error: "Não foi possível carregar suas compras agora." }, { status: 500 });

  const purchases = [
    ...((supplements.data ?? []) as unknown as SupplementSale[]).map((sale) => ({
      id: `supplements-${sale.id}`, operation: "Suplementos", date: sale.quoted_at,
      status: sale.delivery_status === "delivered" ? "Entregue" : sale.payment_status === "received" ? "Pagamento recebido" : "Em andamento",
      items: (sale.items ?? []).map((item) => ({ name: item.product?.name ?? "Produto", quantity: Number(item.quantity) })),
    })),
    ...((fitness.data ?? []) as unknown as FitnessSale[]).map((sale) => ({
      id: `fitness-${sale.id}`, operation: "Fitness", date: sale.quoted_on,
      status: sale.delivery_status === "delivered" ? "Entregue" : sale.payment_status === "received" ? "Pagamento recebido" : "Em andamento",
      items: (sale.items ?? []).map((item) => ({ name: [item.variant?.product?.name, item.variant?.color, item.variant?.size].filter(Boolean).join(" · ") || "Produto", quantity: Number(item.quantity) })),
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return NextResponse.json({ customerName: customerNames[0] ?? null, email: verifiedEmail, purchases });
}
