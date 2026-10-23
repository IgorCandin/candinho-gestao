import SupplierOrderDetailsPage from "@/components/operational-pages/supplier-order-details-page";

export default function SupplierOrderPage({ params }: { params: Promise<{ id: string }> }) {
  return <SupplierOrderDetailsPage params={params} />;
}
