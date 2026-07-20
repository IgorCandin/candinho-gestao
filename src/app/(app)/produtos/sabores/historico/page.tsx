import Link from "next/link";
import { ArrowLeft, Tags } from "lucide-react";
import { redirect } from "next/navigation";
import { HistoricalFlavorClassifier } from "@/components/historical-flavor-classifier";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function HistoricalFlavorPage({
  searchParams,
}: {
  searchParams: Promise<{ produto?: string }>;
}) {
  const access = await getCurrentUserAccess();
  if (!access.canAccessSupplements) redirect("/dashboard");

  const { produto } = await searchParams;
  const supabase = await createClient();

  let pendingQuery = supabase
    .from("product_flavor_history_pending")
    .select("sale_item_id,sale_id,product_id,product_name,quantity,allocated_quantity,pending_quantity,allocation_summary,customer_name,sale_date")
    .order("sale_date", { ascending: false });

  let flavorQuery = supabase
    .from("product_flavors")
    .select("id,product_id,name")
    .eq("active", true)
    .order("display_order")
    .order("name");

  if (produto) {
    pendingQuery = pendingQuery.eq("product_id", produto);
    flavorQuery = flavorQuery.eq("product_id", produto);
  }

  const [{ data: pending, error: pendingError }, { data: flavors, error: flavorError }] = await Promise.all([
    pendingQuery,
    flavorQuery,
  ]);

  if (pendingError) throw pendingError;
  if (flavorError) throw flavorError;

  const rows = (pending ?? []).map((row) => ({
    sale_item_id: String(row.sale_item_id),
    sale_id: String(row.sale_id),
    product_id: String(row.product_id),
    product_name: String(row.product_name ?? "Produto"),
    quantity: Number(row.quantity ?? 0),
    allocated_quantity: Number(row.allocated_quantity ?? 0),
    pending_quantity: Number(row.pending_quantity ?? 0),
    allocation_summary: typeof row.allocation_summary === "string" ? row.allocation_summary : null,
    customer_name: String(row.customer_name ?? "Cliente"),
    sale_date: String(row.sale_date ?? ""),
  }));

  const flavorRows = (flavors ?? []).map((row) => ({
    id: String(row.id),
    product_id: String(row.product_id),
    name: String(row.name ?? ""),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Candinho Suplementos · Sabores"
        title="Classificar histórico sem sabor"
        description="Reconstrua o sabor das vendas antigas sem movimentar o estoque novamente. Uma venda de várias unidades pode ser dividida entre sabores diferentes."
        action={
          produto
            ? <Link className="button ghost" href={`/produtos/${produto}`}><ArrowLeft size={16} />Voltar ao produto</Link>
            : <Link className="button ghost" href="/produtos"><ArrowLeft size={16} />Voltar aos produtos</Link>
        }
      />

      <article className="panel">
        <div className="panel-body">
          <div className="sale-stock-strip">
            <span><Tags size={15} /> Pendências <strong>{rows.length}</strong></span>
            <span>Regra <strong>somar exatamente a quantidade vendida</strong></span>
            <span>Impacto no estoque <strong>nenhum</strong></span>
          </div>
          <p className="form-help">
            Esta área serve apenas para vendas realizadas antes da ativação do controle por sabor. O histórico financeiro, valor da venda e movimentações antigas permanecem intactos.
          </p>
        </div>
      </article>

      <HistoricalFlavorClassifier rows={rows} flavors={flavorRows} />
    </>
  );
}
