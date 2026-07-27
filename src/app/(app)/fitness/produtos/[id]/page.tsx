import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgePercent } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EntitySwipeNavigator } from "@/components/entity-swipe-navigator";
import { FitnessProductImageViewer } from "@/components/fitness-product-image-viewer";
import { getEntitySwipeNavigation, getFitnessProduct } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import {
  getActivePromotionRows,
  getFitnessProductPromotions,
} from "@/lib/active-promotion-data";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, swipe, promotionRows] = await Promise.all([
    getFitnessProduct(id),
    getEntitySwipeNavigation("fitness_product", id),
    getActivePromotionRows(),
  ]);

  if (!data) notFound();
  const { product, variants } = data;
  const productPromotions = getFitnessProductPromotions(id, promotionRows);
  const promotionMap = new Map(
    productPromotions.map((row) => [row.fitness_variant_id, row]),
  );

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Produto"
        title={product.name}
        description={product.description || product.category}
        action={
          <Link className="button gold" href={`/fitness/produtos/${id}/editar`}>
            Editar produto
          </Link>
        }
      />

      <EntitySwipeNavigator previous={swipe.previous} next={swipe.next} />

      <FitnessProductImageViewer
        imageUrl={product.image_url}
        alt={product.name}
      />

      {productPromotions.length > 0 && (
        <article className="panel product-active-promotion-panel">
          <div>
            <span className="badge green">Promoção ativa</span>
            <strong>
              {productPromotions.length} variação(ões) com preço promocional
            </strong>
            <small>
              Enquanto durar o estoque
              {productPromotions[0]?.ends_on
                ? ` · até ${formatDateOnly(productPromotions[0].ends_on)}`
                : ""}
            </small>
          </div>
          <BadgePercent size={24} />
        </article>
      )}

      <section className="stats-grid">
        <div className="stat-card">
          <span>Disponível</span>
          <strong>{product.available_quantity}</strong>
          <small>{product.reserved_quantity} reservado(s)</small>
        </div>
        <div className="stat-card">
          <span>A caminho</span>
          <strong>{product.incoming_quantity}</strong>
          <small>Reposições pendentes</small>
        </div>
        <div className="stat-card">
          <span>Variações</span>
          <strong>{product.variant_count}</strong>
          <small>{product.attention_variants} pedindo atenção</small>
        </div>
      </section>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Tamanhos e cores</h2>
            <p>Informações principais para consultar a peça rapidamente.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tamanho</th>
                <th>Cor</th>
                <th>Disponível</th>
                <th>A caminho</th>
                <th>Venda</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => {
                const promotion = promotionMap.get(variant.variant_id);

                return (
                  <tr key={variant.variant_id}>
                    <td>
                      <strong>{variant.size}</strong>
                    </td>
                    <td>{variant.color}</td>
                    <td>
                      <strong>{variant.available_quantity}</strong>
                      {variant.reserved_quantity > 0 && (
                        <small className="crm-cell-note">
                          {variant.reserved_quantity} reservado(s)
                        </small>
                      )}
                    </td>
                    <td>{variant.incoming_quantity}</td>
                    <td>
                      {promotion ? (
                        <div className="operation-promotion-price">
                          <s>{formatCurrency(variant.sale_price)}</s>
                          <strong>
                            {formatCurrency(
                              promotion.effective_promotional_price,
                            )}
                          </strong>
                          <small>Promoção</small>
                        </div>
                      ) : (
                        <strong>{formatCurrency(variant.sale_price)}</strong>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <details className="panel">
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 800,
            listStylePosition: "inside",
          }}
        >
          Ver dados completos de estoque e custo
        </summary>

        <p style={{ color: "var(--muted)", marginTop: 8 }}>
          Use esta área quando precisar conferir SKU, estoque físico, reservas
          ou custo.
        </p>

        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Tamanho</th>
                <th>Cor</th>
                <th>SKU</th>
                <th>Físico</th>
                <th>Reservado</th>
                <th>Disponível</th>
                <th>A caminho</th>
                <th>Custo</th>
                <th>Venda</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => {
                const promotion = promotionMap.get(variant.variant_id);

                return (
                  <tr key={variant.variant_id}>
                    <td>{variant.size}</td>
                    <td>{variant.color}</td>
                    <td>{variant.sku || "—"}</td>
                    <td>{variant.physical_quantity}</td>
                    <td>{variant.reserved_quantity}</td>
                    <td>{variant.available_quantity}</td>
                    <td>{variant.incoming_quantity}</td>
                    <td>{formatCurrency(variant.cost_price)}</td>
                    <td>
                      {promotion ? (
                        <div className="operation-promotion-price">
                          <s>{formatCurrency(variant.sale_price)}</s>
                          <strong>
                            {formatCurrency(
                              promotion.effective_promotional_price,
                            )}
                          </strong>
                          <small>Promoção</small>
                        </div>
                      ) : (
                        formatCurrency(variant.sale_price)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
