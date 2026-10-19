export type SavedSelectionItem = { operation: string; name: string; available: boolean; path: string; sizes: string[] };
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
      ...(item.sizes.length ? [`Tamanhos disponíveis na vitrine: ${item.sizes.join(", ")} (a confirmar).`] : []),
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
  if (!/^55\d{10,11}$/.test(digits) || !items.length || !validStorefrontCoupon(cleanStorefrontCoupon(coupon))) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(selectionMessage(items, coupon))}`;
}
