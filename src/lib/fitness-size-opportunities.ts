import type { FitnessStockRow } from "./types";

export type SizeEvidence = { customerId: string; customerName: string; category: string; size: string; date: string; variantId: string; productName: string };
export type SizeOpportunity = { evidence: SizeEvidence; products: FitnessStockRow[] };
const normalize = (value: string) => value.trim().toLocaleUpperCase("pt-BR");

/** A purchase is evidence, not a declaration of the customer's body size. */
export function buildSizeOpportunities(history: SizeEvidence[], stock: FitnessStockRow[]): SizeOpportunity[] {
  const latest = new Map<string, SizeEvidence>();
  const purchased = new Map<string, Set<string>>();
  for (const row of [...history].sort((a, b) => b.date.localeCompare(a.date))) {
    if (!row.customerId || !normalize(row.size) || !normalize(row.category)) continue;
    const key = `${row.customerId}:${normalize(row.category)}`;
    if (!latest.has(key)) latest.set(key, row);
    const ids = purchased.get(row.customerId) ?? new Set<string>();
    ids.add(row.variantId); purchased.set(row.customerId, ids);
  }
  return [...latest.values()].flatMap(evidence => {
    const products = stock.filter(row => row.product_active && row.variant_active && row.available_quantity > 0
      && normalize(row.category) === normalize(evidence.category) && normalize(row.size) === normalize(evidence.size)
      && !purchased.get(evidence.customerId)?.has(row.variant_id)).sort((a, b) => b.available_quantity - a.available_quantity || a.product_name.localeCompare(b.product_name)).slice(0, 4);
    return products.length ? [{ evidence, products }] : [];
  });
}
