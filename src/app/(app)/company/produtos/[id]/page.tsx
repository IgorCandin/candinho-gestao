/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import Link from "next/link";
import { Boxes } from "lucide-react";
import LegacyProductPage from "../../../produtos/[id]/page";
import { CompanyNutritionLightbox } from "@/components/company-nutrition-lightbox";
import { CompanyProductPhotoPanel } from "@/components/company-product-photo-panel";
import { getCompanyProductPhotos } from "@/lib/company-product-photos";
import { getCurrentUserAccess } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CompanyProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [media, access] = await Promise.all([getCompanyProductPhotos("supplements", id), getCurrentUserAccess()]);
  if (!media) notFound();

  return <>
    <CompanyNutritionLightbox />
    <div className="company-product-detail-stock-link"><CompanyProductPhotoPanel module="supplements" productId={id} productName={media.name} initialSlots={media.slots} canEdit={access.active && (access.role === "admin" || access.canWriteSupplements)}/><Link className="button ghost" href="/company/estoque?operacao=supplements"><Boxes size={16}/>Abrir estoque</Link></div>
    <section className="company-product-detail-media">
      {media.slots[1]?.url ? <div className="company-product-detail-banner"><img src={media.slots[1].url} alt={`Banner de ${media.name}`}/></div> : null}
    </section>
    <LegacyProductPage params={Promise.resolve({ id })} companyMode/>
  </>;
}
