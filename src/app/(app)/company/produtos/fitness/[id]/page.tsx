import FitnessProductPage from "../../../../fitness/produtos/[id]/page";
import Link from "next/link";
import { Boxes } from "lucide-react";
import { notFound } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";
import { getCompanyProductPhotos } from "@/lib/company-product-photos";
import { CompanyProductPhotoPanel } from "@/components/company-product-photo-panel";
import { CompanyContextTabs } from "@/components/company-context-tabs";

export default async function CompanyFitnessProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [media, access] = await Promise.all([getCompanyProductPhotos("fitness", id), getCurrentUserAccess()]);
  if (!media) notFound();
  return <><CompanyContextTabs label="Navegação da ficha Fitness" items={[{label:"Produto",href:"#produto",note:"resumo"},{label:"Fotos",href:"#fotos",note:"galeria"},{label:"Variações",href:"#variacoes",note:"tamanho e cor"},{label:"Estoque",href:"/company/estoque?operacao=fitness",note:"todos os locais"}]}/><div className="company-product-detail-stock-link" id="fotos"><CompanyProductPhotoPanel module="fitness" productId={id} productName={media.name} initialSlots={media.slots} canEdit={access.active && (access.role === "admin" || access.canWriteFitness)}/><Link className="button ghost" href="/company/estoque?operacao=fitness"><Boxes size={16}/>Abrir estoque</Link></div><div id="produto"><FitnessProductPage params={Promise.resolve({ id })} companyMode /></div></>;
}

export const dynamic = "force-dynamic";
