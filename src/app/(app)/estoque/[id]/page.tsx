import InventoryProductPage from "@/components/operational-pages/inventory-product-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <InventoryProductPage params={params} />;
}
