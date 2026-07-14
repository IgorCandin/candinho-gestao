import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { PartnerForm } from "@/components/partner-form";
import { getPartnerDetails, getSaleLocations } from "@/lib/data";

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [details, locations] = await Promise.all([getPartnerDetails(id), getSaleLocations()]);
  if (!details) notFound();
  return <><DemoBanner /><PageHeader eyebrow="Rede Candinho" title={`Editar ${details.overview.name}`} description="Atualize regra, contato, operação e status da parceria." /><PartnerForm partner={details.overview} locations={locations} /></>;
}
