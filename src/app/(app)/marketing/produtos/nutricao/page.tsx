import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { MarketingNutritionWorkbenchV4545 } from "@/components/marketing-nutrition-workbench-v45-45";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MarketingNutritionPage() {
  const access = await getCurrentUserAccess();

  if (
    !access.active ||
    !(access.role === "admin" || access.canAccessMarketing)
  ) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_nutrition_enrichment_queue")
    .select("*")
    .eq("active", true)
    .order("priority_rank", { ascending: false })
    .order("name");

  if (error) throw error;

  return (
    <>
      <PageHeader
        eyebrow="Central · Marketing · Produtos"
        title="Foto 03 · Nutrição IA"
        description="O Nexus pesquisa a fonte oficial, estrutura os dados e o ERP monta a arte nutricional. Você revisa antes de salvar."
      />

      <section
        className="panel"
        style={{ marginBottom: 16 }}
      >
        <div
          className="panel-body"
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Sparkles size={18} />
            <div>
              <strong>Pesquisa com Nexus</strong>
              <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 11 }}>
                Prioriza marca, fabricante ou documento oficial e registra a fonte consultada.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <ShieldCheck size={18} />
            <div>
              <strong>Revisão antes de publicar</strong>
              <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 11 }}>
                A IA pesquisa os dados; a tabela é renderizada pelo ERP para não inventar números no desenho.
              </p>
            </div>
          </div>

          <Link
            href="/central/marketing/produtos"
            className="button ghost"
            style={{ alignSelf: "center", justifySelf: "start" }}
          >
            <ArrowLeft size={15} />
            Voltar ao banco de fotos
          </Link>
        </div>
      </section>

      <MarketingNutritionWorkbenchV4545 rows={data ?? []} />
    </>
  );
}
