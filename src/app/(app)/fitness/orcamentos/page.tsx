import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { FitnessQuotesTable } from "@/components/fitness-quotes-table";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const access = await getCurrentUserAccess();
  if (!access.canAccessFitness) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fitness_quotes_overview")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Comercial"
        title="Orçamentos"
        description="Clique na linha para abrir o orçamento. Cliente e produto continuam levando diretamente aos respectivos cadastros."
        action={access.canWriteFitness ? (
          <Link className="button gold" href="/fitness/orcamentos/novo">
            <Plus size={16}/> Novo orçamento
          </Link>
        ) : undefined}
      />
      <article className="panel">
        <FitnessQuotesTable rows={data ?? []}/>
      </article>
    </>
  );
}
