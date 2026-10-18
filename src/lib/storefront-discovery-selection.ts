import type { PublicStorefrontProduct } from "./public-storefront-data";
import type { PublicFitnessAvailabilityMap } from "./public-fitness-availability-data";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const sizeOrder = ["PP", "P", "M", "G", "GG", "XG", "XGG", "Único"];
export function availableSizes(product: PublicStorefrontProduct, availability: PublicFitnessAvailabilityMap) {
  if (product.operation !== "fitness" || !product.available) return [];
  return [...new Set((availability[product.id] ?? []).filter(option => option.available_quantity > 0).map(option => option.size.trim()).filter(Boolean))].sort((a,b) => {
    const rank = (size: string) => { const i = sizeOrder.findIndex(value => normalize(value) === normalize(size)); return i < 0 ? sizeOrder.length : i; };
    return rank(a) - rank(b) || a.localeCompare(b, "pt-BR", { numeric: true });
  });
}
export function discoveryCollections(products: PublicStorefrontProduct[]) {
  const sorted = [...products].sort((a,b) => {
    const flagship = (p: PublicStorefrontProduct) => p.operation === "supplements" && /creatina.*candinho/i.test(p.name) ? 0 : 1;
    return flagship(a) - flagship(b) || a.name.localeCompare(b.name, "pt-BR");
  });
  const groups = new Map<string, PublicStorefrontProduct[]>();
  for (const product of sorted) {
    const group = product.category || "Outros";
    groups.set(group, [...(groups.get(group) ?? []), product]);
  }
  return [...groups].sort(([a],[b]) => (normalize(a) === "forca" ? 0 : 1) - (normalize(b) === "forca" ? 0 : 1) || a.localeCompare(b,"pt-BR"));
}

export function carouselTime(time: number, duration: number) {
  return duration > 0 ? ((time % duration) + duration) % duration : 0;
}
