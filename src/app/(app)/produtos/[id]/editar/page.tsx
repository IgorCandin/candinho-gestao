import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { getProductCategories, getProductManagementDetails, getSupplierOptions } from "@/lib/data";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, suppliers, categories] = await Promise.all([
    getProductManagementDetails(id),
    getSupplierOptions(),
    getProductCategories(),
  ]);
  if (!product) notFound();
  return (
    <>
      <DemoBanner />
      <PageHeader eyebrow="Gestão do produto" title={`Editar ${product.name}`} description="Os dados internos ficam separados da tela comercial do produto." />
      <ProductForm product={product} suppliers={suppliers} categories={categories} />
    </>
  );
}
