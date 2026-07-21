import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  PackageX,
} from "lucide-react";
import type { InventoryOverviewRow } from "@/lib/types";

function sortByNeed(a: InventoryOverviewRow, b: InventoryOverviewRow) {
  return (
    a.available_quantity - b.available_quantity ||
    b.min_stock - a.min_stock ||
    a.product_name.localeCompare(b.product_name, "pt-BR")
  );
}

export function ManagerialStockHealthPanel({
  products,
}: {
  products: InventoryOverviewRow[];
}) {
  const lowStock = products
    .filter((product) => product.stock_status === "below_minimum")
    .sort(sortByNeed);

  const outOfStock = products
    .filter((product) =>
      ["out_of_stock", "incoming_only", "fully_reserved"].includes(
        product.stock_status,
      ),
    )
    .sort((a, b) => {
      const aIncoming = a.incoming_quantity > 0 ? 1 : 0;
      const bIncoming = b.incoming_quantity > 0 ? 1 : 0;

      return (
        aIncoming - bIncoming ||
        b.min_stock - a.min_stock ||
        a.product_name.localeCompare(b.product_name, "pt-BR")
      );
    });

  return (
    <section className="product-stock-health-grid managerial-stock-health-grid">
      <article className="panel product-stock-health-card low">
        <div className="panel-head">
          <div>
            <h2>Estoque baixo</h2>
            <p>
              Curva A que chegou ao estoque mínimo. Curvas C e Z não geram
              alerta; curva B só entra quando zera.
            </p>
          </div>

          <span className="product-stock-health-count orange">
            <AlertTriangle size={17} />
            {lowStock.length}
          </span>
        </div>

        {lowStock.length === 0 ? (
          <div className="empty compact">
            <Boxes size={24} />
            <strong>Nenhum produto em estoque baixo</strong>
            Os produtos monitorados preventivamente estão acima do mínimo.
          </div>
        ) : (
          <div className="product-stock-health-list">
            {lowStock.slice(0, 8).map((product) => (
              <Link
                href={`/estoque/${product.product_id}`}
                key={product.product_id}
              >
                <div>
                  <strong>{product.product_name}</strong>
                  <span>
                    Disponível <b>{product.available_quantity}</b> · mínimo{" "}
                    <b>{product.min_stock}</b>
                  </span>
                </div>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        )}

        <div className="product-stock-health-footer">
          <Link
            className="button ghost compact-button"
            href="/estoque/inteligencia"
          >
            Abrir inteligência de estoque
          </Link>
        </div>
      </article>

      <article className="panel product-stock-health-card zero">
        <div className="panel-head">
          <div>
            <h2>Produtos zerados para repor</h2>
            <p>
              Somente produtos A/B que precisam ser mantidos em estoque.
              Sob encomenda (C) e alternativos (Z) ficam fora do alerta.
            </p>
          </div>

          <span className="product-stock-health-count red">
            <PackageX size={17} />
            {outOfStock.length}
          </span>
        </div>

        {outOfStock.length === 0 ? (
          <div className="empty compact">
            <Boxes size={24} />
            <strong>Nenhuma ruptura para repor</strong>
            Nenhum produto A/B exige compra por falta de estoque agora.
          </div>
        ) : (
          <div className="product-stock-health-list">
            {outOfStock.slice(0, 8).map((product) => (
              <Link
                href={`/estoque/${product.product_id}`}
                key={product.product_id}
              >
                <div>
                  <strong>{product.product_name}</strong>
                  <span>
                    {product.incoming_quantity > 0
                      ? `${product.incoming_quantity} un. a caminho`
                      : product.stock_status === "fully_reserved"
                        ? "Saldo disponível totalmente reservado"
                        : "Sem reposição a caminho"}
                  </span>
                </div>

                <span
                  className={`badge ${
                    product.incoming_quantity > 0 ? "orange" : "red"
                  }`}
                >
                  {product.incoming_quantity > 0 ? "Repondo" : "Repor"}
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="product-stock-health-footer">
          <Link
            className="button ghost compact-button"
            href="/pedidos-fornecedor/planejamento"
          >
            Planejar reposição
          </Link>
        </div>
      </article>
    </section>
  );
}
