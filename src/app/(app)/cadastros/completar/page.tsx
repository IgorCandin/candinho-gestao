import { redirect } from "next/navigation";
import { CatalogCompletionCenter } from "@/components/catalog-completion-center";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CompleteCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ modulo?: string }>;
}) {
  const access = await getCurrentUserAccess();

  if (!access.canWriteSupplements && !access.canWriteFitness) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const initialModule =
    params.modulo === "fitness"
      ? "fitness"
      : params.modulo === "supplements"
        ? "supplements"
        : "all";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_catalog_completion_queue");

  if (error) throw error;

  return (
    <>
      <PageHeader
        eyebrow="Catálogo · Qualidade de dados"
        title="Completar cadastros"
        description="Uma fila única para Suplementos e Fitness. A tela mostra somente produtos incompletos e somente os campos que ainda precisam de atenção."
      />
      <CatalogCompletionCenter initialRows={data ?? []} initialModule={initialModule} />
    </>
  );
}
