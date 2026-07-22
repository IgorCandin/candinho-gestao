import { DemoBanner } from "@/components/demo-banner";
import { NewSupplierOrderForm } from "@/components/new-supplier-order-form";
import { PageHeader } from "@/components/page-header";
import { getPurchaseProductOptions, getSaleLocations, getSupplierOptions } from "@/lib/data";

export default async function NewSupplierOrderPage() {
  const [suppliers, products, locations] = await Promise.all([
    getSupplierOptions(),
    getPurchaseProductOptions(),
    getSaleLocations(),
  ]);

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Compras"
        title="Novo pedido de fornecedor"
        description="Escolha entre pedido unitário ou em lote. O estoque só será atualizado no recebimento."
      />
      <NewSupplierOrderForm initialSuppliers={suppliers} products={products} locations={locations} />
    </>
  );
}
