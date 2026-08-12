import { CommercialInboxPanel } from "@/components/commercial-inbox-panel";
import { CommercialNav } from "@/components/commercial-nav";
import { CommercialPagination } from "@/components/commercial-pagination";
import { CommercialSearchForm } from "@/components/commercial-search-form";
import { DemoBanner } from "@/components/demo-banner";
import { LeadsTable } from "@/components/leads-table";
import { NexusLeadQueue } from "@/components/nexus-lead-queue";
import { PageHeader } from "@/components/page-header";
import { getCommercialInboxItems } from "@/lib/commercial-inbox-data";
import { getLeadsPage } from "@/lib/commercial-scale-data";
import { formatMonthYear } from "@/lib/format";
import { getNexusBrief } from "@/lib/nexus-operating-context";
import type { LeadRow } from "@/lib/types";

function groupByMonth(
  leads: LeadRow[],
) {
  const groups =
    new Map<
      string,
      LeadRow[]
    >();

  for (const lead of leads) {
    const key =
      lead.lead_month ||
      "sem-mes";

    groups.set(key, [
      ...(groups.get(key) ?? []),
      lead,
    ]);
  }

  return Array.from(
    groups.entries(),
  );
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    month?: string;
  }>;
}) {
  const params =
    await searchParams;
  const page = Number(
    params.page ?? 1,
  );
  const q =
    params.q?.trim() ?? "";
  const month =
    params.month?.trim() ?? "";

  const [
    result,
    nexus,
    inbox,
  ] = await Promise.all([
    getLeadsPage({
      page,
      pageSize: 30,
      search: q,
      month,
    }),
    getNexusBrief({
      refresh: true,
      signalLimit: 45,
    }),
    getCommercialInboxItems(),
  ]);

  const groups =
    groupByMonth(result.rows);

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Comercial"
        title="Leads + Inbox"
        description="A Inbox mostra o que chegou da vitrine e ainda pede ação. O Nexus prioriza retomadas; a lista completa continua como histórico comercial."
      />

      <CommercialNav active="leads" />

      <CommercialInboxPanel
        initialItems={inbox}
      />

      <NexusLeadQueue
        signals={nexus.signals}
      />

      <div className="commercial-scale-toolbar commercial-scale-toolbar-leads">
        <CommercialSearchForm
          action="/leads"
          defaultValue={q}
          hidden={{ month }}
          placeholder="Buscar cliente, produto, cidade ou telefone..."
        />

        <form
          className="commercial-month-filter"
          action="/leads"
          method="get"
        >
          {q && (
            <input
              type="hidden"
              name="q"
              value={q}
            />
          )}

          <select
            name="month"
            defaultValue={month}
          >
            <option value="">
              Todos os meses
            </option>

            {result.availableMonths.map(
              (item) => (
                <option
                  value={item}
                  key={item}
                >
                  {formatMonthYear(
                    item,
                  )}
                </option>
              ),
            )}
          </select>

          <button
            className="button ghost compact-button"
            type="submit"
          >
            Filtrar
          </button>
        </form>
      </div>

      {groups.length === 0 ? (
        <article className="panel">
          <div className="empty">
            <strong>
              Nenhum lead encontrado
            </strong>
            Ajuste a busca ou o mês
            selecionado.
          </div>

          <CommercialPagination
            pathname="/leads"
            page={result.page}
            totalPages={
              result.totalPages
            }
            total={result.total}
            pageSize={
              result.pageSize
            }
            params={{
              q,
              month,
            }}
          />
        </article>
      ) : (
        <>
          <div className="lead-groups">
            {groups.map(
              ([
                groupMonth,
                rows,
              ]) => {
                const leadCount =
                  new Set(
                    rows.map(
                      (row) =>
                        row.id,
                    ),
                  ).size;

                return (
                  <section
                    className="lead-group"
                    key={
                      groupMonth
                    }
                  >
                    <div className="lead-group-title">
                      <div>
                        <span>
                          Histórico
                          de leads do
                          mês
                        </span>
                        <h2>
                          {formatMonthYear(
                            groupMonth,
                          )}
                        </h2>
                      </div>

                      <strong>
                        {leadCount}{" "}
                        lead
                        {leadCount ===
                        1
                          ? ""
                          : "s"}{" "}
                        ·{" "}
                        {
                          rows.length
                        }{" "}
                        produto
                        {rows.length ===
                        1
                          ? ""
                          : "s"}
                      </strong>
                    </div>

                    <article className="panel">
                      <LeadsTable
                        leads={
                          rows
                        }
                      />
                    </article>
                  </section>
                );
              },
            )}
          </div>

          <CommercialPagination
            pathname="/leads"
            page={result.page}
            totalPages={
              result.totalPages
            }
            total={result.total}
            pageSize={
              result.pageSize
            }
            params={{
              q,
              month,
            }}
          />
        </>
      )}
    </>
  );
}
