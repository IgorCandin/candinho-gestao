import Link from "next/link";
import { Plus } from "lucide-react";
import { CommercialNav } from "@/components/commercial-nav";
import { CommercialPagination } from "@/components/commercial-pagination";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { SalesTable } from "@/components/sales-table";
import {
  getSalesOperationalPage,
  type SalesOperationalView,
} from "@/lib/sales-operational-data";
import { createClient } from "@/lib/supabase/server";

function normalizeView(
  value: string | undefined,
): SalesOperationalView {
  if (
    value === "finalized" ||
    value === "all"
  ) {
    return value;
  }

  return "pending";
}

function statusHref({
  nextView,
  q,
  city,
  month,
}: {
  nextView: SalesOperationalView;
  q: string;
  city: string;
  month: string;
}) {
  const params =
    new URLSearchParams();

  params.set("view", nextView);

  if (q) params.set("q", q);
  if (city) {
    params.set("city", city);
  }
  if (month) {
    params.set("month", month);
  }

  return `/vendas?${params.toString()}`;
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    view?: string;
    city?: string;
    month?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(
    params.page ?? 1,
  );
  const q =
    params.q?.trim() ?? "";
  const view = normalizeView(
    params.view,
  );
  const city =
    params.city?.trim() ?? "";
  const month =
    params.month?.trim() ?? "";

  const supabase =
    await createClient();

  const [result, cityResult] =
    await Promise.all([
      getSalesOperationalPage({
        page,
        pageSize: 30,
        search: q,
        view,
        city,
        month,
      }),
      supabase
        .from("sales_history_v2")
        .select("city")
        .not("city", "is", null)
        .order("city")
        .limit(3000),
    ]);

  if (cityResult.error) {
    throw cityResult.error;
  }

  const cities = Array.from(
    new Set(
      (cityResult.data ?? [])
        .map((row) =>
          typeof row.city === "string"
            ? row.city.trim()
            : "",
        )
        .filter(Boolean),
    ),
  );

  const description =
    view === "pending"
      ? "Vendas que ainda precisam receber pagamento ou concluir a entrega."
      : view === "finalized"
        ? "Vendas totalmente pagas e entregues."
        : "Histórico completo de vendas, incluindo pendências e registros encerrados.";

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Comercial"
        title="Vendas"
        description={description}
        action={
          <Link
            className="button gold"
            href="/vendas/nova"
          >
            <Plus size={16} />
            Novo Orçamento
          </Link>
        }
      />

      <CommercialNav active="sales" />

      <nav
        className="period-tabs"
        aria-label="Situação das vendas"
      >
        <Link
          className={`period-tab ${
            view === "pending"
              ? "active"
              : ""
          }`}
          href={statusHref({
            nextView: "pending",
            q,
            city,
            month,
          })}
        >
          Pendências
        </Link>

        <Link
          className={`period-tab ${
            view === "finalized"
              ? "active"
              : ""
          }`}
          href={statusHref({
            nextView: "finalized",
            q,
            city,
            month,
          })}
        >
          Finalizadas
        </Link>

        <Link
          className={`period-tab ${
            view === "all"
              ? "active"
              : ""
          }`}
          href={statusHref({
            nextView: "all",
            q,
            city,
            month,
          })}
        >
          Todas
        </Link>
      </nav>

      <div className="commercial-scale-toolbar">
        <form
          action="/vendas"
          method="get"
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns:
              "minmax(220px,1.35fr) minmax(160px,.65fr) minmax(150px,.55fr) auto",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            type="hidden"
            name="view"
            value={view}
          />

          <input
            className="input"
            name="q"
            defaultValue={q}
            placeholder="Buscar cliente, produto, cidade ou local..."
          />

          <select
            className="select"
            name="city"
            defaultValue={city}
          >
            <option value="">
              Todas as cidades
            </option>
            {cities.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          <input
            className="input"
            type="month"
            name="month"
            defaultValue={month}
            aria-label="Filtrar mês"
          />

          <button
            className="button gold"
            type="submit"
          >
            Filtrar
          </button>
        </form>
      </div>

      <article className="panel">
        {result.rows.length === 0 ? (
          <div className="empty">
            <strong>
              {view === "pending"
                ? "Nenhuma pendência encontrada"
                : "Nenhuma venda encontrada"}
            </strong>
            {q || city || month
              ? "Ajuste a busca, a cidade ou o mês para localizar outros registros."
              : view === "pending"
                ? "Quando uma venda ficar totalmente paga e entregue, ela sai automaticamente desta visão."
                : "As vendas aparecerão aqui quando forem cadastradas."}
          </div>
        ) : (
          <SalesTable
            sales={result.rows}
          />
        )}

        <CommercialPagination
          pathname="/vendas"
          page={result.page}
          totalPages={
            result.totalPages
          }
          total={result.total}
          pageSize={result.pageSize}
          params={{
            q,
            view,
            city,
            month,
          }}
        />
      </article>
    </>
  );
}
