import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { getProductCategories, getSupplierOptions } from "@/lib/data";

export default async function NewProductPage() {
  const [suppliers, categories] = await Promise.all([getSupplierOptions(), getProductCategories()]);
  return (
    <>
      <DemoBanner />
      <PageHeader eyebrow="Catálogo" title="Novo produto" description="Cadastre preços, estoque mínimo e informações usadas no atendimento." />
      <ProductForm suppliers={suppliers} categories={categories} />
    </>
  );
}
