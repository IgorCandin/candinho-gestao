import Link from "next/link";
import { ArrowLeft, BrainCircuit, Plus } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import {
  NextPurchasePlanner,
  type NextPurchasePlanRow,
} from "@/components/next-purchase-planner";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

function normalizeRows(source: Record<string, unknown>): NextPurchasePlanRow[] {
  const rowsSource = Array.isArray(source.rows) ? source.rows : [];

  return rowsSource
    .map((value) => {
      const row = value as Record<string, unknown>;

      return {
        product_id: String(row.product_id ?? ""),
        product_name: String(row.product_name ?? "Produto"),
        category: String(row.category ?? ""),
        brand: typeof row.brand === "string" ? row.brand : null,
        cost_price: Number(row.cost_price ?? 0),
        sale_price: Number(row.sale_price ?? 0),
        ideal_stock: Number(row.ideal_stock ?? 0),
        physical_quantity: Number(row.physical_quantity ?? 0),
        incoming_quantity: Number(row.incoming_quantity ?? 0),
        supplier_id: typeof row.supplier_id === "string" ? row.supplier_id : null,
        supplier_name:
          typeof row.supplier_name === "string" ? row.supplier_name : null,
        sold_90d: Number(row.sold_90d ?? 0),
        last_sale_at:
          typeof row.last_sale_at === "string" ? row.last_sale_at : null,
        flavor_tracking_enabled: Boolean(row.flavor_tracking_enabled),
      };
    })
    .filter(
      (row) =>
        row.product_id &&
        row.ideal_stock > 0 &&
        row.physical_quantity <= 0 &&
        row.incoming_quantity <= 0,
    );
}

export default async function NextPurchaseOrderPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("purchase_planning_snapshot");

  if (error) throw error;

  const source =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  const rows = normalizeRows(source);

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Compras · Reposição"
        title="Planejar próximo pedido"
        description="Lista direta do que zerou e precisa voltar ao estoque: ideal maior que zero, físico zerado e nada a caminho."
        action={
          <div className="page-header-actions">
            <Link className="button ghost" href="/pedidos-fornecedor/planejamento">
              <BrainCircuit size={16} />
              Inteligência de reposição
            </Link>

            <Link className="button gold" href="/pedidos-fornecedor/novo">
              <Plus size={16} />
              Novo pedido
            </Link>

            <Link className="button ghost" href="/pedidos-fornecedor">
              <ArrowLeft size={16} />
              Pedidos
            </Link>
          </div>
        }
      />

      <NextPurchasePlanner rows={rows} />
    </>
  );
}
