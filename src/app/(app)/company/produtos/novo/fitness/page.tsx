import { redirect } from "next/navigation";
import { FitnessProductForm } from "@/components/fitness-product-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess, getFitnessSuppliers } from "@/lib/data";

export default async function CompanyNewFitnessProductPage() {
  const access = await getCurrentUserAccess();
  if (!access.canWriteFitness && access.role !== "admin") redirect("/company/produtos");
  const suppliers = await getFitnessSuppliers();
  return <><PageHeader eyebrow="Company · Produtos · Fitness" title="Novo produto" description="Cadastre a peça, as imagens e as variações de tamanho e cor."/><FitnessProductForm suppliers={suppliers} companyMode/></>;
}
