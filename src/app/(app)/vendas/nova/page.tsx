import { DemoBanner } from "@/components/demo-banner";
import { NewSaleForm } from "@/components/new-sale-form";
import { PageHeader } from "@/components/page-header";
import { getCustomerOptions, getSaleLocations, getSalePartners, getSaleStockOptions } from "@/lib/data";

export default async function NewSalePage() {
  const [customers, locations, partners, stock] = await Promise.all([
    getCustomerOptions(), getSaleLocations(), getSalePartners(), getSaleStockOptions(),
  ]);
  return <><DemoBanner/><PageHeader eyebrow="Comercial" title="Nova venda" description="Registre a venda, reserve o estoque quando necessário e configure pagamento, entrega e parceria."/><NewSaleForm customers={customers} locations={locations} partners={partners} stock={stock}/></>;
}
