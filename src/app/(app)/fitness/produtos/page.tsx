import Link from "next/link";
import { Plus } from "lucide-react";
import { FitnessProductCatalog } from "@/components/fitness-product-catalog";
import { PageHeader } from "@/components/page-header";
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
  const promotionCount = products.filter(
    (product) => product.promotion_variant_count > 0,
  ).length;
  const salesMode = access.role === "sales";

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Catálogo"
        title="Produtos"
        description="Consulta rápida de peças, fotos, preço, disponibilidade e promoções. Abra um produto para ver tamanhos, cores e ampliar a foto."
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
          <span>
            Os preços promocionais já aparecem no catálogo enquanto houver estoque.
          </span>
        </div>
      )}

      <FitnessProductCatalog products={products} salesMode={salesMode} />
    </>
  );
}
