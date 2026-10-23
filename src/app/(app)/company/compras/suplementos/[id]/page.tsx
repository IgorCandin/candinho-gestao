import SupplierOrderDetailsPage from "@/components/operational-pages/supplier-order-details-page";

export default function CompanySupplierOrderPage({ params }: { params: Promise<{ id: string }> }) {
  return <SupplierOrderDetailsPage params={params} companyMode />;
}
