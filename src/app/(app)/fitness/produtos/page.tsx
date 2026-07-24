import Link from "next/link";
import {
  Boxes,
  PackageCheck,
  PackagePlus,
  Plus,
} from "lucide-react";
import { FitnessProductCatalog } from "@/components/fitness-product-catalog";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess, getFitnessProducts } from "@/lib/data";
import {
  applyFitnessCatalogPromotions,
  getActivePromotionRows,
} from "@/lib/active-promotion-data";

export default async function Page() {
  const [access, baseProducts, promotionRows] = await Promise.all([
    getCurrentUserAccess(),
    getFitnessProducts(),
    getActivePromotionRows(),
  ]);

  const products = applyFitnessCatalogPromotions(
    baseProducts,
    promotionRows,
  );
  const active = products.filter((product) => product.active);
  const promotionCount = products.filter((product) => product.promotion_variant_count > 0).length;
  const available = active.reduce(
    (sum, product) => sum + product.available_quantity,
    0,
  );
  const incoming = active.reduce(
    (sum, product) => sum + product.incoming_quantity,
    0,
  );
  const salesMode = access.role === "sales";

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Catálogo"
        title="Produtos"
        description={
          salesMode
            ? "Consulta comercial de preço promocional, estoque e reposição prevista."
            : "Modelos, tamanhos, cores, promoções ativas e disponibilidade. O cadastro é completado individualmente na edição de cada produto."
        }
        action={
          !salesMode && access.canWriteFitness ? (
            <Link className="button gold" href="/fitness/produtos/novo">
              <Plus size={16} />
              Novo produto
            </Link>
          ) : null
        }
      />

      {promotionCount > 0 && (
        <div className="operation-promotion-banner">
          <strong>{promotionCount} modelo(s) com promoção ativa</strong>
          <span>As variações promocionais já entram com o preço correto no catálogo, em novos orçamentos e em novas vendas, enquanto houver estoque.</span>
        </div>
      )}

      <section className="stats-grid">
        <StatCard
          href="/fitness/produtos"
          icon={Boxes}
          label="Produtos ativos"
          value={String(active.length)}
          note={`${products.length} cadastrados`}
        />
        <StatCard
          href="/fitness/estoque"
          icon={PackageCheck}
          label="Disponível"
          value={String(available)}
          note="Unidades livres para venda"
        />
        <StatCard
          href="/fitness/estoque"
          icon={PackagePlus}
          label="A caminho"
          value={String(incoming)}
          note="Pedidos ainda não recebidos"
        />
      </section>

      <FitnessProductCatalog products={products} salesMode={salesMode} />
    </>
  );
}
