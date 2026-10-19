import type { PublicFitnessAvailabilityOption } from "./public-fitness-availability-data";
export type SavedSelectionChoice = { quantity: string; size: string; color: string };
export type SavedSelectionItem = { id: string; operation: string; name: string; available: boolean; path: string; options: PublicFitnessAvailabilityOption[]; choice: SavedSelectionChoice };
export const defaultSelectionChoice: SavedSelectionChoice = { quantity: "1", size: "", color: "" };
export function selectionItemError(item: SavedSelectionItem) {
  const quantity = Number(item.choice.quantity);
  if (!/^\d+$/.test(item.choice.quantity) || !Number.isSafeInteger(quantity) || quantity < 1) return "Informe uma quantidade inteira maior que zero.";
  if (item.operation !== "fitness" || !item.options.length) return null;
  const option = item.options.find(o => o.size === item.choice.size && o.color === item.choice.color && o.available_quantity > 0);
  if (!option) return "Escolha um tamanho e uma cor disponíveis.";
  if (quantity > option.available_quantity) return `Há ${option.available_quantity} unidade(s) nesta combinação. Ajuste a quantidade.`;
  return null;
}
// Atendimento público confirmado pelo responsável em 18/10/2026.
export const STOREFRONT_WHATSAPP = "5532998318385";
export function cleanStorefrontCoupon(value: string) { return value.replace(/\s/g, "").toUpperCase().slice(0, 64); }
export function validStorefrontCoupon(value: string) { return !value || /^[A-Z0-9-]{3,64}$/.test(value); }
export function selectionMessage(items: SavedSelectionItem[], coupon: string) {
  const sections = ["Olá! Salvei estes produtos na Vitrine Candinho e gostaria de atendimento:"];
  for (const operation of ["supplements", "fitness"]) {
    const selected = items.filter(item => item.operation === operation);
    if (!selected.length) continue;
    sections.push(operation === "fitness" ? "Fitness:" : "Suplementos:");
    sections.push(selected.map(item => [
      `• ${item.name}${item.available ? "" : " (consultar disponibilidade)"}`,
      `Quantidade: ${Number(item.choice.quantity)}`,
      ...(item.operation === "fitness" ? [item.options.length ? `Tamanho: ${item.choice.size} | Cor: ${item.choice.color}` : "Tamanho e cor: consultar no atendimento (sem opções disponíveis na vitrine)."] : []),
      new URL(item.path, "https://candinho.duckdns.org").href,
    ].join("\n")).join("\n\n"));
  }
  const code = cleanStorefrontCoupon(coupon);
  if (code) sections.push(`Meu cupom: ${code}`);
  sections.push(code ? "Podem confirmar a disponibilidade, as opções e as condições do meu cupom?" : "Podem confirmar a disponibilidade e as opções destes produtos?");
  return sections.join("\n\n");
}
export function selectionWhatsAppUrl(phone: string, items: SavedSelectionItem[], coupon: string) {
  const digits = phone.replace(/\D/g, "");
  if (!/^55\d{10,11}$/.test(digits) || !items.length || items.some(item => selectionItemError(item)) || !validStorefrontCoupon(cleanStorefrontCoupon(coupon))) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(selectionMessage(items, coupon))}`;
}
