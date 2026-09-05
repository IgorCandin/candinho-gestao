import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { getProductCategories, getProductManagementDetails, getSupplierOptions } from "@/lib/data";

export default async function CompanyEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, suppliers, categories] = await Promise.all([
    getProductManagementDetails(id),
    getSupplierOptions(),
    getProductCategories(),
  ]);
  if (!product) notFound();
  return <><PageHeader eyebrow="Company · Produtos" title={`Editar ${product.name}`} description="Cadastro completo de Suplementos, com pesquisa e preenchimento assistido pelo Nexus."/><ProductForm product={product} suppliers={suppliers} categories={categories}/></>;
}
