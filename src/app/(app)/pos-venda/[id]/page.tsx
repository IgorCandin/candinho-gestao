import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  History,
  MessageSquareText,
  ShoppingBag,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PostSaleNexusCard } from "@/components/post-sale-nexus-card";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDateOnly,
  formatDateTime,
} from "@/lib/format";

export default async function PostSaleDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const access =
    await getCurrentUserAccess();

  if (
    !access.canAccessSupplements
  ) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const supabase =
    await createClient();

  const {
    data: batch,
    error: batchError,
  } = await supabase
    .from(
      "post_sale_batch_overview",
    )
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (batchError) throw batchError;
  if (!batch) notFound();

  const {
    data: links,
    error: linksError,
  } = await supabase
    .from(
      "post_sale_batch_sales",
    )
    .select("sale_id")
    .eq("batch_id", id);

  if (linksError) throw linksError;

  const ids = (links ?? []).map(
    (row) => row.sale_id,
  );

  const {
    data: sales,
    error: salesError,
  } = ids.length
    ? await supabase
        .from("sales")
        .select(
          "id,quoted_at,delivered_at,total_amount,notes,sale_items(quantity,unit_price,products(name,category))",
        )
        .in("id", ids)
        .order("quoted_at", {
          ascending: false,
        })
    : {
        data: [],
        error: null,
      };

  if (salesError) throw salesError;

  const {
    data: interactions,
    error: interactionsError,
  } = await supabase
    .from(
      "customer_interactions",
    )
    .select(
      "interaction_type,occurred_at,due_at,completed_at,outcome,notes,status",
    )
    .eq(
      "customer_id",
      batch.customer_id,
    )
    .order("occurred_at", {
      ascending: false,
      nullsFirst: false,
    })
    .limit(8);

  if (interactionsError) {
    throw interactionsError;
  }

  return (
    <>
      <PageHeader
        eyebrow="Candinho Suplementos · Pós-venda"
        title={batch.customer_name}
        description={`${batch.sale_count} compra(s) reunida(s) · contato previsto para ${formatDateOnly(
          batch.due_on,
        )}`}
        action={
          <Link
            className="button ghost"
            href="/pos-venda"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        }
      />

      <section className="stats-grid">
        <StatCard
          label="Compras agrupadas"
          value={String(
            batch.sale_count,
          )}
          note={
            batch.product_summary ??
            "Produtos do acompanhamento"
          }
          icon={ShoppingBag}
        />

        <StatCard
          label="Total comprado"
          value={formatCurrency(
            Number(
              batch.total_amount ??
                0,
            ),
          )}
          note="janela atual de acompanhamento"
          icon={MessageSquareText}
        />

        <StatCard
          label="Contato previsto"
          value={formatDateOnly(
            batch.due_on,
          )}
          note={
            batch.customer_phone ??
            "Sem telefone cadastrado"
          }
          icon={CalendarDays}
        />
      </section>

      <div className="partner-portal-grid">
        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>
                  Compras deste
                  pós-venda
                </h2>

                <p>
                  Tudo que está sendo
                  considerado no contato
                  atual.
                </p>
              </div>

              <ShoppingBag
                size={20}
              />
            </div>

            <div className="panel-body">
              {(sales ?? []).map(
                (sale) => (
                  <div
                    key={sale.id}
                    style={{
                      padding:
                        "12px 0",
                      borderBottom:
                        "1px solid var(--border)",
                    }}
                  >
                    <strong>
                      {formatDateOnly(
                        sale.delivered_at ??
                          sale.quoted_at,
                      )}{" "}
                      ·{" "}
                      {formatCurrency(
                        Number(
                          sale.total_amount ??
                            0,
                        ),
                      )}
                    </strong>

                    <p>
                      {(
                        sale.sale_items ??
                        []
                      )
                        .map(
                          (item) =>
                            `${item.products?.name ?? "Produto"}${
                              item.quantity >
                              1
                                ? ` ×${item.quantity}`
                                : ""
                            }`,
                        )
                        .join(", ")}
                    </p>

                    {sale.notes && (
                      <small>
                        {sale.notes}
                      </small>
                    )}
                  </div>
                ),
              )}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>
                  Últimas interações
                </h2>

                <p>
                  Histórico real já
                  registrado no CRM.
                </p>
              </div>

              <History size={20} />
            </div>

            <div className="panel-body">
              {(interactions ?? [])
                .length ? (
                (interactions ?? []).map(
                  (
                    interaction,
                    index,
                  ) => (
                    <div
                      key={`${interaction.occurred_at ?? interaction.due_at ?? "interaction"}-${index}`}
                      style={{
                        padding:
                          "10px 0",
                        borderBottom:
                          "1px solid var(--border)",
                      }}
                    >
                      <strong>
                        {interaction.occurred_at
                          ? formatDateTime(
                              interaction.occurred_at,
                            )
                          : interaction.due_at
                            ? formatDateTime(
                                interaction.due_at,
                              )
                            : "Sem data"}{" "}
                        ·{" "}
                        {interaction.outcome ??
                          interaction.interaction_type}
                      </strong>

                      {interaction.notes && (
                        <p>
                          {
                            interaction.notes
                          }
                        </p>
                      )}
                    </div>
                  ),
                )
              ) : (
                <div className="empty">
                  <History
                    size={26}
                  />
                  <strong>
                    Sem interações
                    anteriores
                  </strong>
                  O histórico começa a
                  aparecer conforme os
                  contatos forem
                  registrados.
                </div>
              )}
            </div>
          </article>
        </div>

        <PostSaleNexusCard
          batchId={id}
          phone={
            batch.customer_phone
          }
          initialMessage={
            batch.ai_last_message
          }
          initialMeta={
            batch.ai_metadata
          }
          status={batch.status}
          dueOn={batch.due_on}
        />
      </div>
    </>
  );
}
