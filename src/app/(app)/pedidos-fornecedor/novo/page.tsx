import { DemoBanner } from "@/components/demo-banner";
import { NewSupplierOrderForm } from "@/components/new-supplier-order-form";
import { PageHeader } from "@/components/page-header";
import {
  getPurchaseProductOptions,
  getSaleLocations,
  getSupplierOptions,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function NewSupplierOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ produtos?: string }>;
}) {
  const params = await searchParams;
  const initialProductIds = (params.produtos ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const supabase = await createClient();

  const [suppliers, products, locations, lastCostResult] =
    await Promise.all([
      getSupplierOptions(),
      getPurchaseProductOptions(),
      getSaleLocations(),
      supabase
        .from("products")
        .select("id,last_purchase_cost,last_purchase_on")
        .eq("active", true),
    ]);

  if (lastCostResult.error) throw lastCostResult.error;

  const lastPurchaseCosts = Object.fromEntries(
    (lastCostResult.data ?? []).map((row) => [
      String(row.id),
      {
        cost:
          row.last_purchase_cost === null
            ? null
            : Number(row.last_purchase_cost),
        purchasedOn:
          row.last_purchase_on === null
            ? null
            : String(row.last_purchase_on),
      },
    ]),
  );

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Compras"
        title="Novo pedido de fornecedor"
        description="Escolha onde comprar depois de comparar a condição do dia com o último custo. O estoque só será atualizado no recebimento."
      />
      <NewSupplierOrderForm
        initialSuppliers={suppliers}
        products={products}
        locations={locations}
        lastPurchaseCosts={lastPurchaseCosts}
        initialProductIds={initialProductIds}
      />
    </>
  );
}
