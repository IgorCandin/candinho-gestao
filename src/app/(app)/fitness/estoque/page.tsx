/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import {
  Boxes,
  Handshake,
  History,
  ImageOff,
  PackageOpen,
  PackageSearch,
  Sparkles,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FitnessConversionForm } from "@/components/fitness-conversion-form";
import { FitnessOperationalOutflowForm } from "@/components/fitness-operational-outflow-form";
import { StatCard } from "@/components/stat-card";
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
  const [access, stock, consignedRows] =
    await Promise.all([
      getCurrentUserAccess(),
      getFitnessStock(),
      getConsignedStock(),
    ]);

  const salesMode = access.role === "sales";
  const orderedStock = sortFitnessStock(stock);

  const consignedByVariant =
    new Map<string, number>(
      (consignedRows ?? []).map(
        (row: {
          variant_id: unknown;
          consigned_quantity: unknown;
        }) =>
          [
            String(row.variant_id),
            Number(row.consigned_quantity ?? 0),
          ] as [string, number],
      ),
    );

  const availableUnits = orderedStock.reduce(
    (sum, item) => sum + item.available_quantity,
    0,
  );
  const incomingUnits = orderedStock.reduce(
    (sum, item) => sum + item.incoming_quantity,
    0,
  );
  const consignedUnits = Array.from(
    consignedByVariant.values(),
  ).reduce((sum, value) => sum + value, 0);
  const unavailableVariants = orderedStock.filter(
    (item) =>
      item.available_quantity === 0 &&
      item.incoming_quantity === 0,
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Setor Operacional"
        title="Estoque, mix & compras"
        description={
          salesMode
            ? "Consulte disponibilidade, peças em prova e itens a caminho."
            : "Use o histórico para decidir o perfil da próxima compra. Roupa não é reposição automática do mesmo modelo: revise tamanho, cor, categoria e fornecedor."
        }
        action={
          !salesMode && access.canWriteFitness ? (
            <div className="panel-actions">
              <Link
                className="button ghost"
                href="/fitness/nexus"
              >
                <Sparkles size={16} />
                Nexus de compra
              </Link>
              <Link
                className="button gold"
                href="/fitness/pedidos/novo"
              >
                <Truck size={16} />
                Novo pedido
              </Link>
            </div>
          ) : undefined
        }
      />

      {!salesMode && (
        <div className="fitness-sector-intro">
          <strong>Comprar por demanda, não por repetição de modelo</strong>
          <span>
            Um produto antigo que vendeu continua no histórico como evidência. O Nexus usa esse sinal para apontar família, tamanho e cor; a escolha do novo modelo e do fornecedor continua sendo da operação.
          </span>
        </div>
      )}

      <section className="stats-grid">
        <StatCard
          href="#estoque-fitness"
          icon={Boxes}
          label="Disponível"
          value={String(availableUnits)}
          note="peças prontas para venda"
        />
        <StatCard
          href="/fitness/consignacoes"
          icon={PackageOpen}
          label="Em prova"
          value={String(consignedUnits)}
          note="peças fora da loja com cliente"
        />
        <StatCard
          href="/fitness/pedidos"
          icon={Truck}
          label="A caminho"
          value={String(incomingUnits)}
          note="peças já compradas"
        />
        <StatCard
          href="/fitness/nexus"
          icon={Sparkles}
          label="Sem disponibilidade"
          value={String(unavailableVariants)}
          note="variações para revisar, não comprar no automático"
        />
      </section>

      {!salesMode && (
        <section className="fitness-sector-action-grid">
          <Link
            className="fitness-sector-action"
            href="/fitness/produtos"
          >
            <PackageSearch size={20} />
            <span>
              <strong>Produtos & variações</strong>
              <small>Modelos, tamanhos, cores, custos e preços.</small>
            </span>
          </Link>

          <Link
            className="fitness-sector-action"
            href="/fitness/pedidos"
          >
            <Truck size={20} />
            <span>
              <strong>Compras & pedidos</strong>
              <small>Pedidos abertos, recebimento e itens a caminho.</small>
            </span>
          </Link>

          <Link
            className="fitness-sector-action"
            href="/fitness/fornecedores"
          >
            <Handshake size={20} />
            <span>
              <strong>Fornecedores</strong>
              <small>Compare onde encontrar o próximo mix, sem ficar presa a um único modelo.</small>
            </span>
          </Link>

          <Link
            className="fitness-sector-action"
            href="/fitness/movimentacoes"
          >
            <History size={20} />
            <span>
              <strong>Movimentações</strong>
              <small>Histórico de entrada, saída, ajuste e conversão.</small>
            </span>
          </Link>
          <Link className="fitness-sector-action" href="/fitness/estoque/conferencia">
            <Boxes size={20} />
            <span><strong>Conferir estoque</strong><small>Conte o físico e ajuste apenas as diferenças.</small></span>
          </Link>

          <Link
            className="fitness-sector-action"
            href="/fitness/consignacoes"
          >
            <PackageOpen size={20} />
            <span>
              <strong>Peças em prova</strong>
              <small>O que está temporariamente com clientes e ainda pertence ao estoque.</small>
            </span>
          </Link>

          <Link
            className="fitness-sector-action"
            href="/fitness/nexus"
          >
            <Sparkles size={20} />
            <span>
              <strong>Nexus de compra</strong>
              <small>Veja demanda por família, tamanho e cor antes de procurar o próximo modelo.</small>
            </span>
          </Link>
        </section>
      )}

      {salesMode && (
        <div className="sales-profile-note">
          <strong>Perfil Vendas</strong>
          <span>Custos e ações de ajuste estão ocultos.</span>
        </div>
      )}

      <article className="panel" id="estoque-fitness">
        <div className="panel-head">
          <div>
            <h2>Estoque por variação</h2>
            <p>
              Saldo físico, reservado, em prova, disponível e a caminho. O histórico continua mesmo quando um modelo sai do mix atual.
            </p>
          </div>
        </div>

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
                {!salesMode && <th>Custo</th>}
                <th>Status</th>
                {!salesMode && <th>Ação</th>}
              </tr>
            </thead>

            <tbody>
              {orderedStock.map((variant) => {
                const consigned =
                  consignedByVariant.get(
                    variant.variant_id,
                  ) ?? 0;

                return (
                  <tr key={variant.variant_id}>
                    <td>
                      <div className="product-cell">
                        {variant.image_url ? (
                          <img
                            className="product-thumb"
                            src={variant.image_url}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span className="product-avatar">
                            <ImageOff size={17} />
                          </span>
                        )}

                        <div>
                          <div className="cell-main">
                            {variant.product_name}
                          </div>
                          <div className="cell-sub">
                            {variant.category}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{variant.size}</td>
                    <td>{variant.color}</td>
                    <td>{variant.physical_quantity}</td>
                    <td>{variant.reserved_quantity}</td>
                    <td>
                      {consigned > 0 ? (
                        <strong>{consigned}</strong>
                      ) : (
                        0
                      )}
                    </td>
                    <td>{variant.available_quantity}</td>
                    <td>{variant.incoming_quantity}</td>
                    <td>{variant.minimum_stock}</td>
                    {!salesMode && (
                      <td>
                        {formatCurrency(
                          variant.stock_cost_value,
                        )}
                      </td>
                    )}
                    <td>
                      {consigned > 0 &&
                      variant.available_quantity === 0
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
              })}

              {orderedStock.length === 0 && (
                <tr>
                  <td colSpan={salesMode ? 10 : 12}>
                    Nenhuma variação cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {!salesMode && access.canWriteFitness && (
        <><FitnessOperationalOutflowForm stock={orderedStock} /><FitnessConversionForm stock={orderedStock} /></>
      )}
    </>
  );
}

async function getConsignedStock() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fitness_stock_operational")
    .select("variant_id,consigned_quantity");

  return data ?? [];
}
