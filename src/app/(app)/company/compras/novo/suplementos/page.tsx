import NewSupplierOrderPage from "../../../../pedidos-fornecedor/novo/page";

export default function CompanyNewSupplierOrderPage({ searchParams }: { searchParams: Promise<{ produtos?: string }> }) {
  return <NewSupplierOrderPage searchParams={searchParams} companyMode />;
}
