export type PurchaseOperation = "Suplementos" | "Fitness";
export type PurchaseStage = "buy" | "incoming" | "receive" | "all";
export type CompanyWorkflowOrder = {
  id: string; operation: PurchaseOperation; supplierName: string; summary: string;
  orderedOn: string; expectedOn: string | null; orderedUnits: number; receivedUnits: number;
  pendingUnits: number; total: number; status: string; waitingSales: number; href: string;
};

/** Existing purchase statuses describe receipts, not carrier tracking. */
export function purchaseStage(order: Pick<CompanyWorkflowOrder, "status" | "pendingUnits" | "receivedUnits">): "incoming" | "receive" | null {
  if (!["pending", "partial"].includes(order.status) || order.pendingUnits <= 0) return null;
  return order.receivedUnits > 0 || order.status === "partial" ? "receive" : "incoming";
}

/** The old overview stopped at 20 orders. Load every page with a stable id order. */
export async function loadOpenPurchasePages<T extends { id: string }>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [], seen = new Set<string>();
  const size = 100;
  for (let from = 0; ; from += size) {
    const result = await fetchPage(from, from + size - 1);
    if (result.error) throw result.error;
    const page = result.data ?? [];
    if (page.length && page.every(row => seen.has(row.id))) throw new Error("Não foi possível avançar a lista de pedidos.");
    for (const row of page) if (!seen.has(row.id)) { rows.push(row); seen.add(row.id); }
    if (page.length < size) return rows;
  }
}
