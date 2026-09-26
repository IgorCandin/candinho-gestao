/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import Link from "next/link";
import { Boxes } from "lucide-react";
import LegacyProductPage from "../../../produtos/[id]/page";
import { CompanyNutritionLightbox } from "@/components/company-nutrition-lightbox";
import { CompanyProductPhotoPanel } from "@/components/company-product-photo-panel";
import { getCompanyProductPhotos } from "@/lib/company-product-photos";
import { getCurrentUserAccess } from "@/lib/data";
import { CompanyContextTabs } from "@/components/company-context-tabs";

export const dynamic = "force-dynamic";

export default async function CompanyProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [media, access] = await Promise.all([getCompanyProductPhotos("supplements", id), getCurrentUserAccess()]);
  if (!media) notFound();

  return <>
    <CompanyNutritionLightbox />
    <CompanyContextTabs label="Navegação da ficha do produto" items={[{label:"Visão geral",href:"#visao-geral",note:"preço e cadastro"},{label:"Fotos",href:"#fotos",note:"galeria"},{label:"Estoque",href:"#estoque",note:"saldo e locais"},{label:"Histórico",href:"#historico-produto",note:"movimentações"}]}/>
    <div className="company-product-detail-stock-link" id="fotos"><CompanyProductPhotoPanel module="supplements" productId={id} productName={media.name} initialSlots={media.slots} canEdit={access.active && (access.role === "admin" || access.canWriteSupplements)}/><Link className="button ghost" href="/company/estoque?operacao=supplements"><Boxes size={16}/>Abrir estoque</Link></div>
    <section className="company-product-detail-media" id="visao-geral">
      {media.slots[1]?.url ? <div className="company-product-detail-banner"><img src={media.slots[1].url} alt={`Banner de ${media.name}`}/></div> : null}
    </section>
    <LegacyProductPage params={Promise.resolve({ id })} companyMode/>
  </>;
}
