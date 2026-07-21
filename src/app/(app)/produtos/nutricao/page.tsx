import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductNutritionWorkbench } from "@/components/product-nutrition-workbench";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProductNutritionPage() {
  const access = await getCurrentUserAccess();

  if (!access.canWriteSupplements) {
    redirect("/produtos");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from(
      "product_nutrition_enrichment_queue",
    )
    .select("*")
    .eq("active", true)
    .order("priority_rank", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (error) throw error;

  return (
    <>
      <PageHeader
        eyebrow="Produtos · Enriquecimento"
        title="Nutrição IA"
        description="Fila de pesquisa e revisão da Imagem 2 nutricional. Priorize fontes oficiais da marca/fabricante e aprove somente depois de conferir se a versão pesquisada corresponde ao produto real."
      />

      <ProductNutritionWorkbench
        initialRows={data ?? []}
      />
    </>
  );
}
