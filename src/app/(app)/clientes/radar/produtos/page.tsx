import Link from "next/link";
import { ArrowLeft, PackageSearch, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import type { ProductSalesTarget } from "@/lib/commercial-opportunity-types";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProductTargetsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_sales_targets_v2")
    .select("*")
    .order("candidate_customers", { ascending: false })
    .order("best_score", { ascending: false });

  if (error) throw new Error(error.message);

  const products = (data ?? []) as ProductSalesTarget[];

  return (
    <>
      <PageHeader
        eyebrow="Nexus Comercial"
        title="Quero vender este produto"
        description="Escolha um produto e o ERP mostra os clientes com melhor contexto comercial para ele."
        action={
          <Link className="button ghost" href="/clientes/radar">
            <ArrowLeft size={15} /> Voltar ao Radar
          </Link>
        }
      />

      <div className="product-target-grid-v45">
        {products.map((product) => (
          <Link
            className="product-target-card-v45"
            href={`/clientes/radar/produtos/${product.product_id}`}
            key={product.product_id}
          >
            <PackageSearch size={21} />
            <div>
              <strong>{product.product_name}</strong>
              <small>
                {product.product_price != null
                  ? formatCurrency(Number(product.product_price))
                  : "Preço não informado"}
              </small>
            </div>
            <div className="product-target-metrics-v45">
              <span><b>{product.candidate_customers}</b> candidatos</span>
              <span><b>{product.high_priority_customers}</b> alta</span>
              <span><b>{product.medium_priority_customers}</b> média</span>
            </div>
            <span className="product-target-cta-v45">
              <UsersRound size={14} /> Encontrar clientes
            </span>
          </Link>
        ))}

        {products.length === 0 && (
          <div className="empty">
            <PackageSearch size={28} />
            <strong>Nenhum produto com público-alvo identificado</strong>
            O motor comercial só sugere produtos com oportunidade coerente.
          </div>
        )}
      </div>
    </>
  );
}
