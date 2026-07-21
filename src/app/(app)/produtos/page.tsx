import Link from "next/link";
import { CheckSquare, Sparkles } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { ProductCatalogTable } from "@/components/product-catalog-table";
import { ProductCatalogActions } from "@/components/product-catalog-actions";
import {
  getCurrentUserAccess,
  getInventoryLocationOverview,
  getProductCatalog,
  getProductCategories,
} from "@/lib/data";

export default async function ProductsPage() {
  const [access, products, categories, locations] = await Promise.all([
    getCurrentUserAccess(),
    getProductCatalog(),
    getProductCategories(),
    getInventoryLocationOverview(),
  ]);

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Catálogo"
        title="Produtos"
        description="Consulta rápida de preço, disponibilidade e reposição. Gere um PDF automático ou selecione somente os produtos que o cliente pediu."
        action={
          <div className="page-header-action-group">
            {access.canWriteSupplements && (
              <Link
                className="button ghost"
                href="/cadastros/completar?modulo=supplements"
              >
                <CheckSquare size={16} />
                Completar cadastros
              </Link>
            )}

            {access.canWriteSupplements && (
              <Link className="button ghost" href="/produtos/nutricao">
                <Sparkles size={16} />
                Nutrição IA
              </Link>
            )}

            <ProductCatalogActions
              canWrite={access.canWriteSupplements}
              products={products}
            />
          </div>
        }
      />

      <ProductCatalogTable
        products={products}
        categories={categories}
        salesMode={access.role === "sales"}
      />

      {access.role === "sales" && (
        <article className="panel sales-location-panel">
          <div className="panel-head">
            <div>
              <h2>Disponibilidade por filial / parceiro</h2>
              <p>Onde existe estoque livre ou reposição prevista.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Local</th>
                  <th>Disponível</th>
                  <th>A caminho</th>
                </tr>
              </thead>

              <tbody>
                {locations
                  .filter(
                    (row) =>
                      row.available_quantity > 0 ||
                      row.incoming_quantity > 0,
                  )
                  .map((row) => (
                    <tr key={`${row.product_id}-${row.location_id}`}>
                      <td><strong>{row.product_name}</strong></td>
                      <td>
                        {row.location_name}
                        <small className="crm-cell-note">
                          {row.location_code}
                        </small>
                      </td>
                      <td>{row.available_quantity}</td>
                      <td>{row.incoming_quantity}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </>
  );
}
