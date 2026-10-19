import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getGoogleBusinessReviews } from "./google-business-reviews";
import type { StorefrontTestimonial } from "@/components/storefront-testimonials";

export async function getStorefrontTestimonials(): Promise<StorefrontTestimonial[]> {
  const google = await getGoogleBusinessReviews();
  // A successful response replaces copied testimonials; never present manual copies as verified Google reviews.
  if (google.status === "connected") return google.items;
  const db = await createClient();
  const { data } = await db.from("storefront_testimonials")
    .select("id,customer_name,comment,profession,photo_url").eq("active", true)
    .order("display_order").order("created_at");
  return (data ?? []) as StorefrontTestimonial[];
}
