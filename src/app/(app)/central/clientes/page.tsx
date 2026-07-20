import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ContactRound,
  Search,
  ShoppingBag,
  UserRoundCheck,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDateTime,
} from "@/lib/format";

type DirectoryCustomer = {
  identity_key: string;
  display_name: string;
  phone: string | null;
  city: string | null;
  operations: string[];
  supplements_customer_id: string | null;
  fitness_customer_id: string | null;
  purchase_count: number;
  total_spent: number;
  last_purchase_at: string | null;
};

export default async function CentralClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
  }>;
}) {
  const access =
    await getCurrentUserAccess();

  if (
    !(
      access.role === "admin" ||
      access.canAccessSupplements ||
      access.canAccessFitness
    )
  ) {
    redirect("/dashboard");
  }

  const params =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "central_customer_directory_snapshot",
    {
      p_query:
        params.q?.trim() ||
        null,
    },
  );

  if (error) throw error;

  const source =
    data &&
    typeof data === "object"
      ? (data as Record<
          string,
          unknown
        >)
      : {};

  const summary =
    source.summary &&
    typeof source.summary ===
      "object"
      ? (source.summary as Record<
          string,
          unknown
        >)
      : {};

  const customers = (
    Array.isArray(
      source.customers,
    )
      ? source.customers
      : []
  ).map((value) => {
    const row =
      value as Record<
        string,
        unknown
      >;

    return {
      identity_key: String(
        row.identity_key ?? "",
      ),
      display_name: String(
        row.display_name ??
          "Cliente",
      ),
      phone:
        typeof row.phone ===
        "string"
          ? row.phone
          : null,
      city:
        typeof row.city ===
        "string"
          ? row.city
          : null,
      operations: Array.isArray(
        row.operations,
      )
        ? row.operations.map(
            String,
          )
        : [],
      supplements_customer_id:
        typeof row.supplements_customer_id ===
        "string"
          ? row.supplements_customer_id
          : null,
      fitness_customer_id:
        typeof row.fitness_customer_id ===
        "string"
          ? row.fitness_customer_id
          : null,
      purchase_count: Number(
        row.purchase_count ?? 0,
      ),
      total_spent: Number(
        row.total_spent ?? 0,
      ),
      last_purchase_at:
        typeof row.last_purchase_at ===
        "string"
          ? row.last_purchase_at
          : null,
    } satisfies DirectoryCustomer;
  });

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central"
        title="Clientes da Company"
        description="Aqui aparecem somente pessoas com compras registradas em Suplementos ou Fitness. Contatos aleatórios de WhatsApp não entram mais nesta visão."
      />

      <section className="central-contact-summary">
        <div>
          <span>
            Clientes compradores
          </span>
          <strong>
            {Number(
              summary.total ?? 0,
            )}
          </strong>
        </div>

        <div>
          <span>Suplementos</span>
          <strong>
            {Number(
              summary.supplements ??
                0,
            )}
          </strong>
        </div>

        <div>
          <span>Fitness</span>
          <strong>
            {Number(
              summary.fitness ?? 0,
            )}
          </strong>
        </div>

        <div>
          <span>
            Nas duas operações
          </span>
          <strong>
            {Number(
              summary.both_operations ??
                0,
            )}
          </strong>
        </div>
      </section>

      <form
        className="central-contact-search"
        method="get"
      >
        <label>
          <Search size={15} />

          <input
            name="q"
            defaultValue={
              params.q ?? ""
            }
            placeholder="Buscar cliente, telefone ou cidade..."
          />
        </label>

        <button
          className="button ghost compact-button"
          type="submit"
        >
          Filtrar
        </button>
      </form>

      <article className="panel central-contact-panel">
        <div className="panel-head">
          <div>
            <h2>
              Base comercial real
            </h2>

            <p>
              O vínculo com cada
              operação é inferido pelas
              vendas já registradas.
            </p>
          </div>

          <strong>
            {customers.length}
          </strong>
        </div>

        {customers.length ===
        0 ? (
          <div className="empty">
            <ContactRound
              size={28}
            />

            <strong>
              Nenhum cliente comprador
              encontrado
            </strong>

            Ajuste a busca ou aguarde
            novas vendas registradas.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="central-contact-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Operação</th>
                  <th>Compras</th>
                  <th>Total comprado</th>
                  <th>
                    Última compra
                  </th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {customers.map(
                  (customer) => (
                    <tr
                      key={
                        customer.identity_key
                      }
                    >
                      <td>
                        <div className="central-contact-name">
                          <strong>
                            {
                              customer.display_name
                            }
                          </strong>

                          <small>
                            {[
                              customer.phone,
                              customer.city,
                            ]
                              .filter(
                                Boolean,
                              )
                              .join(
                                " · ",
                              ) ||
                              "Sem contato principal"}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div
                          style={{
                            display:
                              "flex",
                            gap: 6,
                            flexWrap:
                              "wrap",
                          }}
                        >
                          {customer.operations.includes(
                            "supplements",
                          ) && (
                            <span className="badge blue">
                              Suplementos
                            </span>
                          )}

                          {customer.operations.includes(
                            "fitness",
                          ) && (
                            <span className="badge purple">
                              Fitness
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <strong>
                          {
                            customer.purchase_count
                          }
                        </strong>

                        <small>
                          compra(s)
                        </small>
                      </td>

                      <td>
                        {formatCurrency(
                          customer.total_spent,
                        )}
                      </td>

                      <td>
                        {customer.last_purchase_at
                          ? formatDateTime(
                              customer.last_purchase_at,
                            )
                          : "—"}
                      </td>

                      <td>
                        <div
                          style={{
                            display:
                              "flex",
                            gap: 6,
                            flexWrap:
                              "wrap",
                          }}
                        >
                          {customer.supplements_customer_id && (
                            <Link
                              className="button ghost compact-button"
                              href={`/clientes/${customer.supplements_customer_id}`}
                            >
                              <UserRoundCheck
                                size={13}
                              />
                              CRM
                            </Link>
                          )}

                          {!customer.supplements_customer_id &&
                            customer.fitness_customer_id && (
                              <Link
                                className="button ghost compact-button"
                                href="/fitness/clientes"
                              >
                                <ShoppingBag
                                  size={13}
                                />
                                Fitness
                              </Link>
                            )}
                        </div>
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
