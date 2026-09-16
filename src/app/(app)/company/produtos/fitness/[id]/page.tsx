import FitnessProductPage from "../../../../fitness/produtos/[id]/page";
import Link from "next/link";
import { Boxes } from "lucide-react";
import { notFound } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";
import { getCompanyProductPhotos } from "@/lib/company-product-photos";
import { CompanyProductPhotoPanel } from "@/components/company-product-photo-panel";

export default async function CompanyFitnessProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [media, access] = await Promise.all([getCompanyProductPhotos("fitness", id), getCurrentUserAccess()]);
  if (!media) notFound();
  return <><div className="company-product-detail-stock-link"><CompanyProductPhotoPanel module="fitness" productId={id} productName={media.name} initialSlots={media.slots} canEdit={access.active && (access.role === "admin" || access.canWriteFitness)}/><Link className="button ghost" href="/company/estoque?operacao=fitness"><Boxes size={16}/>Abrir estoque</Link></div><FitnessProductPage params={Promise.resolve({ id })} companyMode /></>;
}

export const dynamic = "force-dynamic";
