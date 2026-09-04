/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import LegacyProductPage from "../../../produtos/[id]/page";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CompanyProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: media, error } = await supabase.from("products").select("name,image_url,banner_image_url,secondary_image_url").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!media) notFound();

  return <>
    <section className="company-product-detail-media">
      {media.banner_image_url ? <div className="company-product-detail-banner"><img src={media.banner_image_url} alt={`Banner de ${media.name}`}/></div> : null}
      <div className="company-product-detail-gallery">
        {media.image_url ? <figure><img src={media.image_url} alt={`Foto principal de ${media.name}`}/><figcaption>Foto do produto</figcaption></figure> : null}
        {media.secondary_image_url ? <figure><img src={media.secondary_image_url} alt={`Tabela nutricional de ${media.name}`}/><figcaption>Tabela nutricional</figcaption></figure> : null}
      </div>
    </section>
    <LegacyProductPage params={Promise.resolve({ id })}/>
  </>;
}
