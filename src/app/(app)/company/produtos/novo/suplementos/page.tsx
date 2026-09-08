import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { getProductCategories, getSupplierOptions } from "@/lib/data";

export default async function CompanyNewSupplementProductPage() {
  const [suppliers, categories] = await Promise.all([getSupplierOptions(), getProductCategories()]);
  return <><PageHeader eyebrow="Company · Produtos · Suplementos" title="Novo produto" description="Cadastro completo com pesquisa e preenchimento assistido pelo Nexus."/><ProductForm suppliers={suppliers} categories={categories} companyMode/></>;
}
