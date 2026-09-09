import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductComboForm } from "@/components/product-combo-form";
import { getProductComboDetails, getProductOptions } from "@/lib/data";

export default async function CompanyEditComboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [combo, products] = await Promise.all([getProductComboDetails(id), getProductOptions()]);
  if (!combo) notFound();
  return <><PageHeader eyebrow="Company · Produtos · Combos" title={combo.name} description="Edite composição, preço e disponibilidade sem voltar ao ERP antigo."/><ProductComboForm combo={combo} products={products} companyMode/></>;
}
