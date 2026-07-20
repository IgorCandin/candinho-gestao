import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  PackageX,
} from "lucide-react";
import type {
  InventoryOverviewRow,
} from "@/lib/types";

function sortByNeed(
  a: InventoryOverviewRow,
  b: InventoryOverviewRow,
) {
  return (
    a.available_quantity -
      b.available_quantity ||
    b.min_stock - a.min_stock ||
    a.product_name.localeCompare(
      b.product_name,
      "pt-BR",
    )
  );
}

export function ProductStockHealthPanel({
  products,
}: {
  products: InventoryOverviewRow[];
}) {
  const lowStock = products
    .filter(
      (product) =>
        product.available_quantity >
          0 &&
        product.min_stock > 0 &&
        product.available_quantity <=
          product.min_stock,
    )
    .sort(sortByNeed);

  const outOfStock = products
    .filter(
      (product) =>
        product.available_quantity <=
        0,
    )
    .sort((a, b) => {
      const aIncoming =
        a.incoming_quantity > 0
          ? 1
          : 0;
      const bIncoming =
        b.incoming_quantity > 0
          ? 1
          : 0;

      return (
        aIncoming -
          bIncoming ||
        b.min_stock - a.min_stock ||
        a.product_name.localeCompare(
          b.product_name,
          "pt-BR",
        )
      );
    });

  return (
    <section className="product-stock-health-grid">
      <article className="panel product-stock-health-card low">
        <div className="panel-head">
          <div>
            <h2>
              Estoque baixo
            </h2>

            <p>
              Ainda existe produto
              disponível, mas o saldo
              já chegou ao mínimo.
            </p>
          </div>

          <span className="product-stock-health-count orange">
            <AlertTriangle
              size={17}
            />
            {lowStock.length}
          </span>
        </div>

        {lowStock.length ===
        0 ? (
          <div className="empty compact">
            <Boxes size={24} />
            <strong>
              Nenhum produto em
              estoque baixo
            </strong>
            Os saldos com mínimo
            configurado estão acima
            da faixa de atenção.
          </div>
        ) : (
          <div className="product-stock-health-list">
            {lowStock
              .slice(0, 6)
              .map(
                (product) => (
                  <Link
                    href={`/estoque/${product.product_id}`}
                    key={
                      product.product_id
                    }
                  >
                    <div>
                      <strong>
                        {
                          product.product_name
                        }
                      </strong>

                      <span>
                        Disponível{" "}
                        <b>
                          {
                            product.available_quantity
                          }
                        </b>{" "}
                        · mínimo{" "}
                        <b>
                          {
                            product.min_stock
                          }
                        </b>
                      </span>
                    </div>

                    <ArrowRight
                      size={15}
                    />
                  </Link>
                ),
              )}
          </div>
        )}

        <div className="product-stock-health-footer">
          <Link
            className="button ghost compact-button"
            href="/estoque/inteligencia"
          >
            Abrir inteligência de
            estoque
          </Link>
        </div>
      </article>

      <article className="panel product-stock-health-card zero">
        <div className="panel-head">
          <div>
            <h2>
              Estoque zerado
            </h2>

            <p>
              Produtos sem unidade
              disponível para uma nova
              venda agora.
            </p>
          </div>

          <span className="product-stock-health-count red">
            <PackageX
              size={17}
            />
            {outOfStock.length}
          </span>
        </div>

        {outOfStock.length ===
        0 ? (
          <div className="empty compact">
            <Boxes size={24} />
            <strong>
              Nenhum produto
              zerado
            </strong>
            Todos os produtos
            monitorados possuem saldo
            disponível.
          </div>
        ) : (
          <div className="product-stock-health-list">
            {outOfStock
              .slice(0, 6)
              .map(
                (product) => (
                  <Link
                    href={`/estoque/${product.product_id}`}
                    key={
                      product.product_id
                    }
                  >
                    <div>
                      <strong>
                        {
                          product.product_name
                        }
                      </strong>

                      <span>
                        {product.incoming_quantity >
                        0
                          ? `${product.incoming_quantity} un. a caminho`
                          : "Sem reposição a caminho"}
                      </span>
                    </div>

                    <span
                      className={`badge ${
                        product.incoming_quantity >
                        0
                          ? "orange"
                          : "red"
                      }`}
                    >
                      {product.incoming_quantity >
                      0
                        ? "Repondo"
                        : "Zerado"}
                    </span>
                  </Link>
                ),
              )}
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
