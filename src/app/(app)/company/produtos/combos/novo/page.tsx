import { PageHeader } from "@/components/page-header";
import { ProductComboForm } from "@/components/product-combo-form";
import { getProductOptions } from "@/lib/data";

export default async function CompanyNewComboPage() {
  const products = await getProductOptions();
  return <><PageHeader eyebrow="Company · Produtos · Combos" title="Novo combo" description="Monte a oferta sem sair da Company."/><ProductComboForm products={products} companyMode/></>;
}
