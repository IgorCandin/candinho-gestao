import Link from "next/link";
import {
  ArrowLeft,
  ClipboardCheck,
  TriangleAlert,
} from "lucide-react";
import { InventoryActions } from "@/components/inventory-actions";
import { InventoryZeroBaselineButton } from "@/components/inventory-zero-baseline-button";
import { PageHeader } from "@/components/page-header";
import {
  getInventoryLocationOverview,
  getInventoryOverview,
  getSaleLocations,
} from "@/lib/data";

export default async function ReconciliationCountPage({
  searchParams,
}: {
  searchParams: Promise<{
    local?: string;
  }>;
}) {
  const params =
    await searchParams;

  const [
    products,
    locations,
    locationRows,
  ] = await Promise.all([
    getInventoryOverview(),
    getSaleLocations(),
    getInventoryLocationOverview(),
  ]);

  const selectedLocation =
    locations.find(
      (location) =>
        location.id === params.local,
    ) ??
    locations[0] ??
    null;

  if (!selectedLocation) {
    return (
      <>
        <PageHeader
          eyebrow="Estoque · Reconciliação"
          title="Contagem física"
          description="Nenhum ponto de estoque está disponível para conferência."
          action={
            <Link
              className="button ghost"
              href="/estoque/reconciliacao"
            >
              <ArrowLeft
                size={16}
              />
              Voltar
            </Link>
          }
        />
      </>
    );
  }

  const currentRows =
    locationRows.filter(
      (row) =>
        row.location_id ===
        selectedLocation.id,
    );

  const physicalTotal =
    currentRows.reduce(
      (sum, row) =>
        sum +
        Number(
          row.physical_quantity ??
            0,
        ),
      0,
    );

  return (
    <>
      <PageHeader
        eyebrow="Estoque · Reconciliação"
        title={`Conferir ${selectedLocation.name}`}
        description="Aqui você define o saldo físico real do ponto. Se houver produtos, conte-os. Se o ponto estiver completamente vazio, confirme o zero sem criar uma movimentação falsa."
        action={
          <Link
            className="button ghost"
            href="/estoque/reconciliacao"
          >
            <ArrowLeft
              size={16}
            />
            Voltar à reconciliação
          </Link>
        }
      />

      <article className="panel">
        <div className="panel-body">
          <div
            style={{
              display: "flex",
              alignItems:
                "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span className="badge orange">
              <TriangleAlert
                size={13}
              />
              Validação do saldo
            </span>

            <div
              style={{
                display: "grid",
                gap: 5,
                flex: "1 1 320px",
              }}
            >
              <strong>
                {
                  selectedLocation.code
                }{" "}
                ·{" "}
                {
                  selectedLocation.name
                }
              </strong>

              <span
                style={{
                  color:
                    "var(--muted)",
                  lineHeight: 1.5,
                }}
              >
                “Contagem inicial” significa apenas que o sistema novo ainda não
                recebeu uma confirmação física deste ponto. Ele não quer
                inventar estoque: precisa saber se o zero mostrado é real ou se
                existem unidades que ainda não foram registradas.
              </span>

              <small
                style={{
                  color:
                    "var(--muted)",
                }}
              >
                Saldo físico registrado agora:{" "}
                {physicalTotal}
              </small>
            </div>
          </div>
        </div>
      </article>

      {physicalTotal === 0 && (
        <InventoryZeroBaselineButton
          locationId={
            selectedLocation.id
          }
          locationName={
            selectedLocation.name
          }
        />
      )}

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>
              Contar um produto
            </h2>
            <p>
              Use quando existe produto fisicamente no ponto ou quando a
              quantidade registrada está diferente do que você encontrou.
            </p>
          </div>

          <ClipboardCheck
            size={20}
          />
        </div>

        <div className="panel-body">
          <InventoryActions
            products={products}
            locations={locations}
            locationRows={
              locationRows
            }
            initialLocationId={
              selectedLocation.id
            }
            initialMode="count"
            successHref="/estoque/reconciliacao"
          />
        </div>
      </article>
    </>
  );
}
