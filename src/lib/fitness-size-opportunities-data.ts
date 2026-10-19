import { cache } from "react";
import { applyFitnessStockPromotions, getActivePromotionRows } from "@/lib/active-promotion-data";
import { getCurrentUserAccess, getFitnessStock } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { buildSizeOpportunities, type SizeEvidence } from "./fitness-size-opportunities";

const one = (value: unknown): Record<string, unknown> => (Array.isArray(value) ? value[0] : value) as Record<string, unknown> ?? {};

export const getFitnessSizeOpportunities = cache(async () => {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner" || (access.role !== "admin" && !access.canAccessFitness)) throw new Error("Sem acesso à Fitness.");
  const db = await createClient();
  const [sales, stock, promotions] = await Promise.all([
    db.from("fitness_sales").select("id,customer_id,quoted_on,customer:fitness_customers!inner(name,active),items:fitness_sale_items(variant_id,variant:fitness_variants(size,product:fitness_products(name,category)))").in("general_status", ["active", "finalized"]).eq("customer.active", true).order("quoted_on", { ascending: false }).order("id").limit(500),
    getFitnessStock(),
    getActivePromotionRows(),
  ]);
  if (sales.error) throw sales.error;
  const evidence: SizeEvidence[] = [];
  for (const raw of sales.data ?? []) {
    const row = raw as unknown as Record<string, unknown>;
    const customer = one(row.customer);
    for (const rawItem of Array.isArray(row.items) ? row.items : []) {
      const item = rawItem as Record<string, unknown>;
      const variant = one(item.variant); const product = one(variant.product);
      if (!row.customer_id) continue;
      evidence.push({ customerId: String(row.customer_id), customerName: String(customer.name ?? "Cliente"), category: String(product.category ?? ""), size: String(variant.size ?? ""), productName: String(product.name ?? "Produto"), variantId: String(item.variant_id), date: String(row.quoted_on) });
    }
  }
  return { opportunities: buildSizeOpportunities(evidence, applyFitnessStockPromotions(stock, promotions)), sampledSales: sales.data?.length ?? 0 };
});
