import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { PartnerForm } from "@/components/partner-form";
import { getSaleLocations } from "@/lib/data";

export default async function NewPartnerPage<T extends object>(props: T) {
  const companyMode = Boolean((props as T & { companyMode?: boolean }).companyMode);
  const locations = await getSaleLocations();
  return <><DemoBanner /><PageHeader eyebrow={companyMode?"Candinho Company · Gestão":"Rede Candinho"} title="Novo parceiro" description="Cadastre a operação, a regra de recompensa e o ponto físico relacionado." /><PartnerForm locations={locations} companyMode={companyMode} /></>;
}
