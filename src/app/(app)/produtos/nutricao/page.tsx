import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductNutritionWorkbench } from "@/components/product-nutrition-workbench";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProductNutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ produto?: string }>;
}) {
  const access = await getCurrentUserAccess();

  if (!access.canWriteSupplements) {
    redirect("/produtos");
  }

  const params = await searchParams;
  const productId = params.produto?.trim() || null;
  const supabase = await createClient();

  let query = supabase
    .from("product_nutrition_enrichment_queue")
    .select("*")
    .eq("active", true);

  if (productId) {
    query = query.eq("id", productId);
  }

  const { data, error } = await query
    .order("priority_rank", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  return (
    <>
      <PageHeader
        eyebrow="Produtos · Enriquecimento"
        title={productId ? "Nutrição IA · Produto selecionado" : "Nutrição IA"}
        description={
          productId
            ? "Pesquise primeiro a fonte oficial. Quando a correspondência for segura, o botão Gerar Imagem 2 será liberado no card abaixo."
            : "Fila de pesquisa e revisão da Imagem 2 nutricional. Priorize fontes oficiais da marca/fabricante e aprove somente depois de conferir se a versão pesquisada corresponde ao produto real."
        }
        action={
          productId ? (
            <Link className="button ghost" href="/produtos">
              <ArrowLeft size={16} />
              Voltar aos produtos
            </Link>
          ) : null
        }
      />

      <ProductNutritionWorkbench initialRows={data ?? []} />

      {productId && (data ?? []).length === 0 && (
        <article className="panel">
          <div className="panel-body">
            <p>O produto não foi encontrado na fila de Nutrição IA.</p>
          </div>
        </article>
      )}
    </>
  );
}
