import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { PartnerNetworkSummary } from "@/components/partner-network-summary";
import { PartnerPageActions } from "@/components/partner-page-actions";
import { PartnersTable } from "@/components/partners-table";
import { getPartnersOverview } from "@/lib/data";

export default async function PartnersPage() {
  const partners =
    await getPartnersOverview();

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Rede Candinho"
        title="Parceiros"
        description="Lista operacional das parcerias, com movimento comercial, estoque nos pontos, acertos e saúde da rede."
        action={
          <PartnerPageActions />
        }
      />

      <PartnerNetworkSummary
        partners={partners}
      />

      <PartnersTable
        partners={partners}
      />
    </>
  );
}
