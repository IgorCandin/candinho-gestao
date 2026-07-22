import { notFound } from "next/navigation";
import { EntitySwipeNavigator } from "@/components/entity-swipe-navigator";
import { SaleDetailsView } from "@/components/sale-details-view";
import { getEntitySwipeNavigation, getSaleDetails } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function SaleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [sale, swipe, flavorResult] = await Promise.all([
    getSaleDetails(id),
    getEntitySwipeNavigation("sale", id),
    supabase
      .from("sale_item_flavor_display")
      .select("sale_item_id,flavor_summary,flavor_status")
      .eq("sale_id", id),
  ]);

  if (!sale) notFound();
  if (flavorResult.error) throw flavorResult.error;

  const flavorByItem = Object.fromEntries(
    (flavorResult.data ?? [])
      .filter((row) => typeof row.flavor_summary === "string" && row.flavor_summary)
      .map((row) => [String(row.sale_item_id), String(row.flavor_summary)]),
  );

  return (
    <>
      <EntitySwipeNavigator previous={swipe.previous} next={swipe.next}/>
      <SaleDetailsView
        sale={sale}
        backHref="/vendas"
        backLabel="Voltar às vendas"
        flavorByItem={flavorByItem}
      />
    </>
  );
}
