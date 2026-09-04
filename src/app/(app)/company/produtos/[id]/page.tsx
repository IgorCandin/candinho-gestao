/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import LegacyProductPage from "../../../produtos/[id]/page";
import { createClient } from "@/lib/supabase/server";
import { CompanyNutritionLightbox } from "@/components/company-nutrition-lightbox";

export const dynamic = "force-dynamic";

export default async function CompanyProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: media, error } = await supabase.from("products").select("name,image_url,banner_image_url,secondary_image_url").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!media) notFound();

  return <>
    <CompanyNutritionLightbox />
    <section className="company-product-detail-media">
      {media.banner_image_url ? <div className="company-product-detail-banner"><img src={media.banner_image_url} alt={`Banner de ${media.name}`}/></div> : null}
    </section>
    <LegacyProductPage params={Promise.resolve({ id })}/>
  </>;
}
