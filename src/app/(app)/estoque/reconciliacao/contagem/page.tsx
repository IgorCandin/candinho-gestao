import Link from "next/link";
import { ArrowLeft, ClipboardCheck, TriangleAlert } from "lucide-react";
import { InventoryActions } from "@/components/inventory-actions";
import { PageHeader } from "@/components/page-header";
import {
  getInventoryLocationOverview,
  getInventoryOverview,
  getSaleLocations,
} from "@/lib/data";

export default async function ReconciliationCountPage({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const params = await searchParams;

  const [products, locations, locationRows] = await Promise.all([
    getInventoryOverview(),
    getSaleLocations(),
    getInventoryLocationOverview(),
  ]);

  const selectedLocation =
    locations.find((location) => location.id === params.local) ??
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
            <Link className="button ghost" href="/estoque/reconciliacao">
              <ArrowLeft size={16} />
              Voltar
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Estoque · Reconciliação"
        title={`Recontar ${selectedLocation.name}`}
        description="A pendência agora leva direto para a ferramenta que realmente corrige o saldo. Escolha o produto, informe a quantidade física encontrada e confirme."
        action={
          <Link className="button ghost" href="/estoque/reconciliacao">
            <ArrowLeft size={16} />
            Voltar à reconciliação
          </Link>
        }
      />

      <article className="panel">
        <div className="panel-body">
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span className="badge orange">
              <TriangleAlert size={13} />
              Conferência necessária
            </span>

            <div style={{ display: "grid", gap: 5, flex: "1 1 320px" }}>
              <strong>
                {selectedLocation.code} · {selectedLocation.name}
              </strong>
              <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
                O local fica travado durante a contagem para evitar corrigir o
                ponto errado. Se houver mais de um produto para conferir, repita
                a contagem para cada produto necessário.
              </span>
            </div>
          </div>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Corrigir pela contagem real</h2>
            <p>
              Não marque a pendência como resolvida antes de conferir o estoque
              físico.
            </p>
          </div>
          <ClipboardCheck size={20} />
        </div>

        <div className="panel-body">
          <InventoryActions
            products={products}
            locations={locations}
            locationRows={locationRows}
            initialLocationId={selectedLocation.id}
            initialMode="count"
            successHref="/estoque/reconciliacao"
          />
        </div>
      </article>
    </>
  );
}
