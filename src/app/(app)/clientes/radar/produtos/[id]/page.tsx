import Link from "next/link";
import { ArrowLeft, PackageSearch } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProductCustomerTargets } from "@/components/product-customer-targets";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProductCustomersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [productResult, opportunityResult] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,sale_price,category,brand")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("customer_sales_opportunities_actionable_v2")
      .select("*")
      .eq("recommended_product_id", id)
      .in("priority", ["Alta", "Média"])
      .order("opportunity_score", { ascending: false })
      .limit(300),
  ]);

  if (productResult.error) throw new Error(productResult.error.message);
  if (opportunityResult.error) throw new Error(opportunityResult.error.message);

  const product = productResult.data;
  const rows = (opportunityResult.data ?? []) as SalesOpportunity[];

  return (
    <>
      <PageHeader
        eyebrow="Produto → clientes"
        title={product?.name ?? "Produto"}
        description={`${rows.length} cliente(s) com contexto para abordagem${
          product?.sale_price != null
            ? ` · ${formatCurrency(Number(product.sale_price))}`
            : ""
        }.`}
        action={
          <Link className="button ghost" href="/clientes/radar/produtos">
            <ArrowLeft size={15} /> Trocar produto
          </Link>
        }
      />

      {rows.length ? (
        <ProductCustomerTargets rows={rows} />
      ) : (
        <div className="empty">
          <PackageSearch size={28} />
          <strong>Nenhum cliente recomendado agora</strong>
          Isso é bom: o ERP não precisa inventar público só porque você escolheu um produto.
        </div>
      )}
    </>
  );
}
