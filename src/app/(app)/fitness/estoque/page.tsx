/* eslint-disable @next/next/no-img-element */

import { ImageOff } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FitnessConversionForm } from "@/components/fitness-conversion-form";
import { getCurrentUserAccess, getFitnessStock } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { FitnessStockRow } from "@/lib/types";

const APPSHEET_CATEGORY_ORDER = [
  "Legging",
  "Short",
  "Top",
  "Camiseta",
  "Conjunto",
  "Macacão",
  "Meia",
  "Faixa",
  "Acessório",
] as const;

const SIZE_ORDER = [
  "PP",
  "P",
  "M",
  "G",
  "GG",
  "XG",
  "Único",
] as const;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function categoryRank(category: string) {
  const normalized = normalize(category);
  const index = APPSHEET_CATEGORY_ORDER.findIndex(
    (item) => normalize(item) === normalized,
  );

  return index === -1
    ? APPSHEET_CATEGORY_ORDER.length + 1
    : index;
}

function sizeRank(size: string) {
  const normalized = normalize(size);
  const index = SIZE_ORDER.findIndex(
    (item) => normalize(item) === normalized,
  );

  return index === -1
    ? SIZE_ORDER.length + 1
    : index;
}

function variantAvailabilityRank(
  row: FitnessStockRow,
) {
  if (row.available_quantity > 0) return 0;
  if (row.incoming_quantity > 0) return 1;
  return 2;
}

function sortFitnessStock(
  rows: FitnessStockRow[],
) {
  return [...rows].sort((a, b) => {
    const category =
      categoryRank(a.category) -
      categoryRank(b.category);

    if (category !== 0) return category;

    const product =
      a.product_name.localeCompare(
        b.product_name,
        "pt-BR",
      );

    if (product !== 0) return product;

    const availability =
      variantAvailabilityRank(a) -
      variantAvailabilityRank(b);

    if (availability !== 0) {
      return availability;
    }

    const size =
      sizeRank(a.size) -
      sizeRank(b.size);

    if (size !== 0) return size;

    return a.color.localeCompare(
      b.color,
      "pt-BR",
    );
  });
}

export default async function Page() {
  const [access, stock] =
    await Promise.all([
      getCurrentUserAccess(),
      getFitnessStock(),
    ]);

  const salesMode =
    access.role === "sales";

  const orderedStock =
    sortFitnessStock(stock);

  const supabase =
    await createClient();

  const { data: consignedRows } =
    await supabase
      .from(
        "fitness_stock_operational",
      )
      .select(
        "variant_id,consigned_quantity",
      );

  const consignedByVariant =
    new Map<string, number>(
      (consignedRows ?? []).map(
        (row) =>
          [
            String(
              row.variant_id,
            ),
            Number(
              row.consigned_quantity ??
                0,
            ),
          ] as [string, number],
      ),
    );

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness"
        title="Estoque"
        description={
          salesMode
            ? "Consulta de disponibilidade, peças em prova e produtos a caminho."
            : "Saldo físico, reservado, em prova, disponível, a caminho e necessidade de reposição."
        }
      />

      {salesMode && (
        <div className="sales-profile-note">
          <strong>
            Perfil Vendas
          </strong>
          <span>
            Custos e ações de ajuste estão ocultos.
          </span>
        </div>
      )}

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Tamanho</th>
                <th>Cor</th>
                <th>Físico</th>
                <th>Reservado</th>
                <th>Em prova</th>
                <th>Disponível</th>
                <th>A caminho</th>
                <th>Mínimo</th>
                {!salesMode && (
                  <th>Custo</th>
                )}
                <th>Status</th>
                {!salesMode && (
                  <th>Ação</th>
                )}
              </tr>
            </thead>

            <tbody>
              {orderedStock.map(
                (variant) => {
                  const consigned =
                    consignedByVariant.get(
                      variant.variant_id,
                    ) ?? 0;

                  return (
                    <tr
                      key={
                        variant.variant_id
                      }
                    >
                      <td>
                        <div className="product-cell">
                          {variant.image_url ? (
                            <img
                              className="product-thumb"
                              src={
                                variant.image_url
                              }
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span className="product-avatar">
                              <ImageOff
                                size={17}
                              />
                            </span>
                          )}

                          <div>
                            <div className="cell-main">
                              {
                                variant.product_name
                              }
                            </div>
                            <div className="cell-sub">
                              {
                                variant.category
                              }
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        {variant.size}
                      </td>

                      <td>
                        {variant.color}
                      </td>

                      <td>
                        {
                          variant.physical_quantity
                        }
                      </td>

                      <td>
                        {
                          variant.reserved_quantity
                        }
                      </td>

                      <td>
                        {consigned > 0 ? (
                          <strong>
                            {consigned}
                          </strong>
                        ) : (
                          0
                        )}
                      </td>

                      <td>
                        {
                          variant.available_quantity
                        }
                      </td>

                      <td>
                        {
                          variant.incoming_quantity
                        }
                      </td>

                      <td>
                        {
                          variant.minimum_stock
                        }
                      </td>

                      {!salesMode && (
                        <td>
                          {formatCurrency(
                            variant.stock_cost_value,
                          )}
                        </td>
                      )}

                      <td>
                        {consigned > 0 &&
                        variant.available_quantity ===
                          0
                          ? "em prova"
                          : variant.operational_status}
                      </td>

                      {!salesMode && (
                        <td>
                          <a
                            className="table-link"
                            href={`/fitness/estoque/${variant.variant_id}`}
                          >
                            Ajustar
                          </a>
                        </td>
                      )}
                    </tr>
                  );
                },
              )}

              {orderedStock.length ===
                0 && (
                <tr>
                  <td
                    colSpan={
                      salesMode
                        ? 10
                        : 12
                    }
                  >
                    Nenhuma variação cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {!salesMode &&
        access.canWriteFitness && (
          <FitnessConversionForm
            stock={orderedStock}
          />
        )}
    </>
  );
}
