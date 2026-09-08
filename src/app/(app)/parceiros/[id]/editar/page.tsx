import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { PartnerForm } from "@/components/partner-form";
import { getPartnerDetails, getSaleLocations } from "@/lib/data";

export async function EditPartnerPage({ params, companyMode=false }: { params: Promise<{ id: string }>; companyMode?:boolean }) {
  const { id } = await params;
  const [details, locations] = await Promise.all([getPartnerDetails(id), getSaleLocations()]);
  if (!details) notFound();
  return <><DemoBanner /><PageHeader eyebrow={companyMode?"Candinho Company · Gestão":"Rede Candinho"} title={`Editar ${details.overview.name}`} description="Atualize regra, contato, operação e status da parceria." /><PartnerForm partner={details.overview} locations={locations} companyMode={companyMode} /></>;
}

export default function LegacyEditPartnerPage({params}:{params:Promise<{id:string}>}){return <EditPartnerPage params={params}/>;}
