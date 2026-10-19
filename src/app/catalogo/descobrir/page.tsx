import { StorefrontDiscovery } from "@/components/storefront-discovery";
import { getPublicStorefrontSnapshot } from "@/lib/public-storefront-data";
import { getCachedPublicStorefrontSlugMap } from "@/lib/public-storefront-slug-map-v45-36";
import { getPublicFitnessAvailabilityMap } from "@/lib/public-fitness-availability-data";
import { getPublicSupplementBackorders } from "@/lib/public-backorder-data";
import { createClient } from "@/lib/supabase/server";
import { getStorefrontTestimonials } from "@/lib/storefront-testimonial-data";

export const revalidate = 10;
export const metadata = { title: "Descobrir | Vitrine Candinho", robots: { index: false, follow: true } };

export default async function DiscoveryPage() {
  const supabase = await createClient();
  const [snapshot, links, availability, backorders, testimonialResult, campaignResult] = await Promise.all([
    getPublicStorefrontSnapshot(), getCachedPublicStorefrontSlugMap(), getPublicFitnessAvailabilityMap(), getPublicSupplementBackorders(),
    getStorefrontTestimonials(),
    supabase.rpc("get_storefront_campaign_summary_v1"),
  ]);
  const existing = new Set(snapshot.products.supplements.map(p => p.id));
  const supplements = [...snapshot.products.supplements, ...backorders.filter(p => !existing.has(p.product_id) && p.available_quantity <= 0).map(p => ({
    id: p.product_id, operation: "supplements" as const, name: p.name, category: p.category,
    image_url: p.image_url, price_from: p.sale_price, price_to: p.sale_price, cash_price: p.sale_price,
    installment_price: null, installments_max: null, installment_value: null, available: false, notes: null, images: [],
  }))];
  const summary = Array.isArray(campaignResult.data) ? campaignResult.data[0] : campaignResult.data;
  return <StorefrontDiscovery snapshot={{ ...snapshot, products: { ...snapshot.products, supplements } }} links={links} availability={availability} testimonials={testimonialResult} remaining={summary ? Number(summary.remaining) : null} />;
}
