import Link from "next/link";
import { Boxes, Image, PackageCheck, PackagePlus, Plus } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { ProductCatalogTable } from "@/components/product-catalog-table";
import { StatCard } from "@/components/stat-card";
import { getProductCatalog, getProductCategories } from "@/lib/data";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProductCatalog(), getProductCategories()]);
  const active = products.filter((product) => product.active);
  const availableUnits = active.reduce((sum, product) => sum + product.available_quantity, 0);
  const incomingUnits = active.reduce((sum, product) => sum + product.incoming_quantity, 0);
  const missingPhotos = active.filter((product) => !product.thumbnail_url).length;

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Catálogo"
        title="Produtos"
        description="Catálogo comercial seguro, estoque disponível e gestão completa de cada produto."
        action={<Link className="button gold" href="/produtos/novo"><Plus size={16} />Novo produto</Link>}
      />

      <section className="stats-grid product-stats-grid">
        <StatCard label="Produtos ativos" value={String(active.length)} note={`${products.length} cadastrados`} icon={Boxes} />
        <StatCard label="Unidades disponíveis" value={String(availableUnits)} note="Saldo livre para vendas" icon={PackageCheck} />
        <StatCard label="Unidades a caminho" value={String(incomingUnits)} note="Pedidos de fornecedor" icon={PackagePlus} />
        <StatCard label="Sem miniatura" value={String(missingPhotos)} note="Não carregam foto nas listas" icon={Image} />
      </section>

      <ProductCatalogTable products={products} categories={categories} />
    </>
  );
}
