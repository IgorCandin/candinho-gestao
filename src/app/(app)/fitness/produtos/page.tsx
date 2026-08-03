import Link from "next/link";
import { Plus } from "lucide-react";
import {
  FitnessProductCatalog,
  type FitnessAvailabilityOption,
} from "@/components/fitness-product-catalog";
import { PageHeader } from "@/components/page-header";
import {
  getCurrentUserAccess,
  getFitnessProducts,
  getFitnessStock,
} from "@/lib/data";
import {
  applyFitnessCatalogPromotions,
  getActivePromotionRows,
} from "@/lib/active-promotion-data";

function sizeRank(size: string) {
  const normalized = size.trim().toLocaleUpperCase("pt-BR");
  const known = [
    "PP",
    "P",
    "PS",
    "M",
    "G",
    "GG",
    "G1",
    "G2",
    "G3",
    "ÚNICO",
    "UNICO",
  ];
  const index = known.indexOf(normalized);
  return index >= 0 ? index : 100;
}

function colorRank(color: string) {
  const normalized = color
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  return ["preto", "preta", "black"].includes(normalized) ? 0 : 1;
}

export default async function Page() {
  const [access, baseProducts, stockRows, promotionRows] =
    await Promise.all([
      getCurrentUserAccess(),
      getFitnessProducts(),
      getFitnessStock(),
      getActivePromotionRows(),
    ]);

  const optionsByProduct = new Map<
    string,
    FitnessAvailabilityOption[]
  >();

  for (const row of stockRows) {
    if (
      !row.product_active ||
      !row.variant_active ||
      row.available_quantity <= 0
    ) {
      continue;
    }

    const current = optionsByProduct.get(row.product_id) ?? [];

    current.push({
      size: row.size,
      color: row.color,
      available_quantity: row.available_quantity,
    });

    optionsByProduct.set(row.product_id, current);
  }

  for (const options of optionsByProduct.values()) {
    options.sort(
      (a, b) =>
        colorRank(a.color) - colorRank(b.color) ||
        a.color.localeCompare(b.color, "pt-BR") ||
        sizeRank(a.size) - sizeRank(b.size) ||
        a.size.localeCompare(b.size, "pt-BR"),
    );
  }

  const products = applyFitnessCatalogPromotions(
    baseProducts,
    promotionRows,
  ).map((product) => ({
    ...product,
    available_options: optionsByProduct.get(product.id) ?? [],
  }));

  const promotionCount = products.filter(
    (product) => product.promotion_variant_count > 0,
  ).length;
  const salesMode = access.role === "sales";

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Catálogo"
        title="Produtos"
        description="Consulta rápida de peças, fotos, preço, tamanhos, cores, disponibilidade e promoções. Abra um produto para ver todos os detalhes."
        action={
          !salesMode && access.canWriteFitness ? (
            <Link
              className="button gold"
              href="/fitness/produtos/novo"
            >
              <Plus size={16} />
              Novo produto
            </Link>
          ) : null
        }
      />

      {promotionCount > 0 && (
        <div className="operation-promotion-banner">
          <strong>
            {promotionCount} modelo(s) com promoção ativa
          </strong>
          <span>
            Os preços promocionais já aparecem no catálogo
            enquanto houver estoque.
          </span>
        </div>
      )}

      <FitnessProductCatalog
        products={products}
        salesMode={salesMode}
      />
    </>
  );
}
