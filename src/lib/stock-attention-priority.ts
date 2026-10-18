export type StockAttention = { product_name: string; available_quantity: number; incoming_quantity: number; backlog_quantity: number; needs_replenishment: boolean };
export function stockPriority(row: StockAttention) {
  if (Number(row.backlog_quantity) > 0 && Number(row.available_quantity) <= 0) return { rank: 0, label: "Prioridade · demanda sem disponível" };
  if (Number(row.backlog_quantity) > 0) return { rank: 1, label: "Conferir reservas e demanda" };
  return { rank: 2, label: "Reposição a conferir" };
}
export function compareStockAttention(a: StockAttention, b: StockAttention) {
  return stockPriority(a).rank - stockPriority(b).rank || Number(b.backlog_quantity) - Number(a.backlog_quantity) || Number(a.available_quantity) - Number(b.available_quantity) || a.product_name.localeCompare(b.product_name, "pt-BR");
}
