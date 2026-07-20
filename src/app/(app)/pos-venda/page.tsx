import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  MessageSquareText,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDateOnly,
} from "@/lib/format";

function statusLabel(value: unknown) {
  const status = String(
    value ?? "planned",
  );

  if (status === "completed")
    return "Concluído";

  if (status === "cancelled")
    return "Cancelado";

  return "Planejado";
}

function statusClass(value: unknown) {
  const status = String(
    value ?? "planned",
  );

  if (status === "completed")
    return "green";

  if (status === "cancelled")
    return "gray";

  return "blue";
}

export default async function PostSalePage() {
  const access =
    await getCurrentUserAccess();

  if (
    !access.canAccessSupplements
  ) {
    redirect("/dashboard");
  }

  const supabase =
    await createClient();

  const [
    { data: summary },
    { data: rows, error },
  ] = await Promise.all([
    supabase
      .from(
        "post_sale_batch_summary",
      )
      .select("*")
      .maybeSingle(),

    supabase
      .from(
        "post_sale_batch_overview",
      )
      .select("*")
      .order("status")
      .order("due_on"),
  ]);

  if (error) throw error;

  const list = rows ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Candinho Suplementos · Relacionamento"
        title="Pós-venda"
        description="Um único acompanhamento por cliente e janela de compras. O Nexus reúne o contexto e prepara a mensagem sem você precisar montar tudo manualmente."
      />

      <section className="stats-grid">
        <StatCard
          label="Em aberto"
          value={String(
            Number(
              summary?.open_count ??
                0,
            ),
          )}
          note="acompanhamentos consolidados"
          icon={MessageSquareText}
        />

        <StatCard
          label="Vencidos"
          value={String(
            Number(
              summary?.overdue_count ??
                0,
            ),
          )}
          note="precisam de atenção"
          icon={CalendarClock}
        />

        <StatCard
          label="Hoje"
          value={String(
            Number(
              summary?.today_count ??
                0,
            ),
          )}
          note="contatos previstos"
          icon={CalendarDays}
        />

        <StatCard
          label="Próximos 7 dias"
          value={String(
            Number(
              summary?.next_seven_days_count ??
                0,
            ),
          )}
          note="agenda futura"
          icon={CheckCircle2}
        />
      </section>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>
              Acompanhamentos
            </h2>

            <p>
              Abra um cliente para gerar
              a mensagem do Nexus, copiar
              para o WhatsApp, reagendar
              ou concluir.
            </p>
          </div>

          <strong>
            {list.length}
          </strong>
        </div>

        {list.length === 0 ? (
          <div className="empty">
            <CheckCircle2
              size={28}
            />
            <strong>
              Nenhum pós-venda pendente
            </strong>
            Novas compras elegíveis
            aparecerão aqui conforme a
            agenda consolidada.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Compras</th>
                  <th>Produtos</th>
                  <th>Valor</th>
                  <th>Nexus</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {list.map(
                  (row) => (
                    <tr key={row.id}>
                      <td>
                        {formatDateOnly(
                          row.due_on,
                        )}
                      </td>

                      <td>
                        <Link
                          className="table-link"
                          href={`/pos-venda/${row.id}`}
                        >
                          <strong>
                            {
                              row.customer_name
                            }
                          </strong>
                        </Link>

                        <small>
                          {row.customer_phone ??
                            row.city ??
                            "Sem telefone"}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {
                            row.sale_count
                          }
                        </strong>

                        <small>
                          compra(s)
                          agrupada(s)
                        </small>
                      </td>

                      <td>
                        {row.product_summary ??
                          "—"}
                      </td>

                      <td>
                        {formatCurrency(
                          Number(
                            row.total_amount ??
                              0,
                          ),
                        )}
                      </td>

                      <td>
                        {row.ai_last_message ? (
                          <span className="badge green">
                            <Bot
                              size={13}
                            />
                            Pronta
                          </span>
                        ) : (
                          <span className="badge gray">
                            Gerar
                          </span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`badge ${statusClass(
                            row.status,
                          )}`}
                        >
                          {statusLabel(
                            row.status,
                          )}
                        </span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </>
  );
}
