import SupplierOrderDetailsPage from "../../../../pedidos-fornecedor/[id]/page";

export default function CompanySupplierOrderPage({ params }: { params: Promise<{ id: string }> }) {
  return <SupplierOrderDetailsPage params={params} companyMode />;
}
