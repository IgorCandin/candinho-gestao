import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { PartnerPageActions } from "@/components/partner-page-actions";
import { PartnersTable } from "@/components/partners-table";
import { getPartnersOverview } from "@/lib/data";

export default async function PartnersPage() {
  const partners=await getPartnersOverview();
  return <>
    <DemoBanner/>
    <PageHeader eyebrow="Rede Candinho" title="Parceiros" description="Lista operacional das parcerias. Indicadores, vínculos antigos e conferências ficam separados na Área Gerencial." action={<PartnerPageActions/>}/>
    <PartnersTable partners={partners}/>
  </>;
}
