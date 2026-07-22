import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  MapPin,
  ScanBarcode,
  ShoppingBag,
  Truck,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDateOnly,
  formatDateTime,
} from "@/lib/format";

export default async function LotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: lot, error: lotError },
    { data: trace, error: traceError },
  ] = await Promise.all([
    supabase
      .from("inventory_lot_overview")
      .select("*")
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("inventory_lot_traceability")
      .select("*")
      .eq("lot_id", id)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (lotError) throw lotError;
  if (traceError) throw traceError;
  if (!lot) notFound();

  const sales = (trace ?? []).filter(
    (row) =>
      row.sale_id &&
      Number(row.quantity_delta ?? 0) < 0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Estoque · Lote"
        title={`${lot.product_name} · ${lot.lot_number}`}
        description="Rastreabilidade completa deste lote no estoque e nas vendas."
        action={
          <Link
            className="button ghost"
            href="/estoque/lotes"
          >
            <ArrowLeft size={16} />
            Voltar aos lotes
          </Link>
        }
      />

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon">
            <ScanBarcode size={19} />
          </span>

          <div>
            <span>Lote</span>
            <strong>
              {lot.lot_number}
            </strong>
            <small>
              {lot.flavor_name ??
                "Sem divisão por sabor"}
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <CalendarClock size={19} />
          </span>

          <div>
            <span>Validade</span>
            <strong>
              {lot.expires_on
                ? formatDateOnly(
                    lot.expires_on,
                  )
                : "Não informada"}
            </strong>
            <small>
              {lot.days_to_expiry === null
                ? "Sem cálculo"
                : `${lot.days_to_expiry} dia(s)`}
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <MapPin size={19} />
          </span>

          <div>
            <span>Local</span>
            <strong>
              {lot.location_code}
            </strong>
            <small>
              {lot.location_name}
            </small>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-icon">
            <ShoppingBag size={19} />
          </span>

          <div>
            <span>Saldo do lote</span>
            <strong>
              {Number(
                lot.quantity_on_hand ?? 0,
              )}
            </strong>
            <small>
              Status: {lot.expiry_status}
            </small>
          </div>
        </article>
      </section>

      <div className="partner-portal-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Origem do lote</h2>
              <p>
                Informações registradas no recebimento ou
                classificação.
              </p>
            </div>

            <Truck size={20} />
          </div>

          <div className="panel-body sale-detail-list">
            <div className="sale-detail-line">
              <span>Fornecedor</span>
              <strong>
                {lot.supplier_name ?? "Não informado"}
              </strong>
            </div>

            <div className="sale-detail-line">
              <span>Recebido em</span>
              <strong>
                {lot.received_on
                  ? formatDateOnly(
                      lot.received_on,
                    )
                  : "Não informado"}
              </strong>
            </div>

            <div className="sale-detail-line">
              <span>Custo unitário</span>
              <strong>
                {lot.unit_cost === null
                  ? "—"
                  : formatCurrency(
                      Number(lot.unit_cost),
                    )}
              </strong>
            </div>

            <div className="sale-detail-line">
              <span>Situação</span>
              <strong>
                {lot.status}
              </strong>
            </div>

            <div className="sale-detail-line">
              <span>Observação</span>
              <strong>
                {lot.notes ?? "—"}
              </strong>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Clientes atingidos</h2>
              <p>
                Em caso de recolhimento, esta lista mostra as
                vendas rastreadas deste lote.
              </p>
            </div>

            <UserRound size={20} />
          </div>

          {sales.length === 0 ? (
            <div className="empty">
              <UserRound size={25} />
              <strong>
                Nenhuma venda rastreada neste lote
              </strong>
              O lote ainda pode estar em estoque ou ter sido
              classificado recentemente.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Telefone</th>
                    <th>Data</th>
                    <th>Qtd.</th>
                    <th>Venda</th>
                  </tr>
                </thead>

                <tbody>
                  {sales.map((row) => (
                    <tr
                      key={row.lot_movement_id}
                    >
                      <td>
                        <strong>
                          {row.customer_name ??
                            "Cliente não identificado"}
                        </strong>
                      </td>

                      <td>
                        {row.customer_phone ??
                          "—"}
                      </td>

                      <td>
                        {row.sale_at
                          ? formatDateTime(
                              row.sale_at,
                            )
                          : "—"}
                      </td>

                      <td>
                        {Math.abs(
                          Number(
                            row.quantity_delta ??
                              0,
                          ),
                        )}
                      </td>

                      <td>
                        <Link
                          className="table-link"
                          href={`/vendas/${row.sale_id}`}
                        >
                          Abrir venda
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Movimentações do lote</h2>
            <p>
              Entradas, saídas, transferências, cancelamentos
              e classificações registradas.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Local</th>
                <th>Quantidade</th>
                <th>Rastreio</th>
              </tr>
            </thead>

            <tbody>
              {(trace ?? []).map((row) => (
                <tr
                  key={row.lot_movement_id}
                >
                  <td>
                    {formatDateTime(
                      row.created_at,
                    )}
                  </td>

                  <td>
                    {row.movement_type}
                  </td>

                  <td>
                    {row.location_code}
                  </td>

                  <td
                    className={
                      Number(
                        row.quantity_delta,
                      ) > 0
                        ? "positive"
                        : "warning-text"
                    }
                  >
                    {Number(
                      row.quantity_delta,
                    ) > 0
                      ? "+"
                      : ""}
                    {Number(
                      row.quantity_delta,
                    )}
                  </td>

                  <td>
                    {row.allocation_kind ===
                    "tracked"
                      ? "Lote rastreado"
                      : "Estoque legado"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
