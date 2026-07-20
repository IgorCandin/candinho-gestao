import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  ContactRound,
  History,
  MessageSquareText,
  RefreshCcw,
  Repeat2,
  Shirt,
  ShoppingBag,
  Sparkles,
  UserRoundCheck,
  WalletCards,
} from "lucide-react";
import {
  formatCurrency,
  formatDateTime,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Customer360Summary = {
  supplements_sales_count: number;
  supplements_spent: number;
  fitness_sales_count: number;
  fitness_spent: number;
  lead_count: number;
  interaction_count: number;
  post_sale_open_count: number;
  post_sale_total_count: number;
  return_cases_count: number;
  open_return_cases_count: number;
  consignments_count: number;
  open_consignments_count: number;
  total_company_spent: number;
  last_company_purchase_at: string | null;
  has_fitness_identity: boolean;
  fitness_identity_count: number;
};

type Customer360Event = {
  event_at: string;
  event_type: string;
  operation: string;
  title: string;
  subtitle: string | null;
  amount: number | null;
  status: string | null;
  href: string | null;
};

type FitnessMatch = {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
};

function number(
  value: unknown,
) {
  return Number(value ?? 0);
}

function nullableString(
  value: unknown,
) {
  return typeof value === "string"
    ? value
    : null;
}

function eventIcon(
  type: string,
) {
  if (
    type ===
    "supplements_sale"
  ) {
    return ShoppingBag;
  }

  if (type === "fitness_sale") {
    return Shirt;
  }

  if (type === "lead") {
    return Sparkles;
  }

  if (
    type === "post_sale"
  ) {
    return MessageSquareText;
  }

  if (
    type === "consignment"
  ) {
    return Repeat2;
  }

  if (
    type === "return_case"
  ) {
    return RefreshCcw;
  }

  return ContactRound;
}

function eventOperationLabel(
  operation: string,
) {
  if (
    operation === "fitness"
  ) {
    return "Fitness";
  }

  if (
    operation === "supplements"
  ) {
    return "Suplementos";
  }

  return "Company";
}

function eventOperationTone(
  operation: string,
) {
  if (
    operation === "fitness"
  ) {
    return "purple";
  }

  if (
    operation === "supplements"
  ) {
    return "gold";
  }

  return "gray";
}

export async function CustomerCompany360({
  customerId,
}: {
  customerId: string;
}) {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "customer_company_360_snapshot",
    {
      p_customer_id:
        customerId,
    },
  );

  if (error) {
    return (
      <article className="panel customer-company-360-error">
        <div className="panel-head">
          <div>
            <h2>
              Visão Company 360º
            </h2>

            <p>
              Não foi possível
              consolidar a visão
              corporativa deste cliente.
            </p>
          </div>

          <AlertTriangle
            size={18}
          />
        </div>
      </article>
    );
  }

  if (
    !data ||
    typeof data !== "object"
  ) {
    return null;
  }

  const source =
    data as Record<
      string,
      unknown
    >;

  const rawSummary =
    source.summary &&
    typeof source.summary ===
      "object"
      ? (source.summary as Record<
          string,
          unknown
        >)
      : {};

  const summary: Customer360Summary = {
    supplements_sales_count:
      number(
        rawSummary.supplements_sales_count,
      ),
    supplements_spent:
      number(
        rawSummary.supplements_spent,
      ),
    fitness_sales_count:
      number(
        rawSummary.fitness_sales_count,
      ),
    fitness_spent:
      number(
        rawSummary.fitness_spent,
      ),
    lead_count: number(
      rawSummary.lead_count,
    ),
    interaction_count:
      number(
        rawSummary.interaction_count,
      ),
    post_sale_open_count:
      number(
        rawSummary.post_sale_open_count,
      ),
    post_sale_total_count:
      number(
        rawSummary.post_sale_total_count,
      ),
    return_cases_count:
      number(
        rawSummary.return_cases_count,
      ),
    open_return_cases_count:
      number(
        rawSummary.open_return_cases_count,
      ),
    consignments_count:
      number(
        rawSummary.consignments_count,
      ),
    open_consignments_count:
      number(
        rawSummary.open_consignments_count,
      ),
    total_company_spent:
      number(
        rawSummary.total_company_spent,
      ),
    last_company_purchase_at:
      nullableString(
        rawSummary.last_company_purchase_at,
      ),
    has_fitness_identity:
      Boolean(
        rawSummary.has_fitness_identity,
      ),
    fitness_identity_count:
      number(
        rawSummary.fitness_identity_count,
      ),
  };

  const timeline: Customer360Event[] =
    (
      Array.isArray(
        source.timeline,
      )
        ? source.timeline
        : []
    ).map((entry) => {
      const row =
        entry as Record<
          string,
          unknown
        >;

      return {
        event_at: String(
          row.event_at ?? "",
        ),
        event_type: String(
          row.event_type ?? "",
        ),
        operation: String(
          row.operation ?? "",
        ),
        title: String(
          row.title ??
            "Evento",
        ),
        subtitle:
          nullableString(
            row.subtitle,
          ),
        amount:
          row.amount === null ||
          row.amount === undefined
            ? null
            : number(
                row.amount,
              ),
        status:
          nullableString(
            row.status,
          ),
        href:
          nullableString(
            row.href,
          ),
      };
    });

  const fitnessMatches: FitnessMatch[] =
    (
      Array.isArray(
        source.fitness_matches,
      )
        ? source.fitness_matches
        : []
    ).map((entry) => {
      const row =
        entry as Record<
          string,
          unknown
        >;

      return {
        id: String(
          row.id ?? "",
        ),
        name: String(
          row.name ??
            "Cliente Fitness",
        ),
        phone:
          nullableString(
            row.phone,
          ),
        city:
          nullableString(
            row.city,
          ),
      };
    });

  const totalPurchases =
    summary.supplements_sales_count +
    summary.fitness_sales_count;

  const averageTicket =
    totalPurchases > 0
      ? summary.total_company_spent /
        totalPurchases
      : 0;

  const activeRelationshipCount =
    summary.post_sale_open_count +
    summary.open_return_cases_count +
    summary.open_consignments_count;

  return (
    <section className="customer-company-360">
      <div className="customer-company-360-heading">
        <div>
          <span>
            Candinho Company
          </span>

          <h2>
            Visão 360º do cliente
          </h2>

          <p>
            Suplementos, Fitness,
            pós-venda, leads,
            consignações e
            trocas/devoluções em uma
            única leitura.
          </p>
        </div>

        <span className="badge blue">
          <UserRoundCheck
            size={13}
          />
          Identidade por cadastro e
          telefone
        </span>
      </div>

      <div className="customer-company-360-kpis">
        <article>
          <WalletCards
            size={19}
          />

          <span>
            Valor histórico Company
          </span>

          <strong>
            {formatCurrency(
              summary.total_company_spent,
            )}
          </strong>

          <small>
            Ticket médio observado{" "}
            {formatCurrency(
              averageTicket,
            )}
          </small>
        </article>

        <article>
          <ShoppingBag
            size={19}
          />

          <span>
            Suplementos
          </span>

          <strong>
            {
              summary.supplements_sales_count
            }{" "}
            compra(s)
          </strong>

          <small>
            {formatCurrency(
              summary.supplements_spent,
            )}
          </small>
        </article>

        <article>
          <Shirt size={19} />

          <span>Fitness</span>

          <strong>
            {
              summary.fitness_sales_count
            }{" "}
            compra(s)
          </strong>

          <small>
            {formatCurrency(
              summary.fitness_spent,
            )}
          </small>
        </article>

        <article>
          <ContactRound
            size={19}
          />

          <span>
            Relacionamento
          </span>

          <strong>
            {
              summary.interaction_count
            }{" "}
            interação(ões)
          </strong>

          <small>
            {summary.lead_count} lead(s)
            registrado(s)
          </small>
        </article>
      </div>

      <div className="customer-company-360-status-grid">
        <Link href="/pos-venda">
          <MessageSquareText
            size={17}
          />

          <div>
            <span>
              Pós-venda
            </span>

            <strong>
              {
                summary.post_sale_open_count
              }{" "}
              aberto(s)
            </strong>

            <small>
              {
                summary.post_sale_total_count
              }{" "}
              no histórico
            </small>
          </div>

          <ArrowRight
            size={15}
          />
        </Link>

        <Link href="/trocas">
          <RefreshCcw
            size={17}
          />

          <div>
            <span>
              Trocas / devoluções
            </span>

            <strong>
              {
                summary.open_return_cases_count
              }{" "}
              aberta(s)
            </strong>

            <small>
              {
                summary.return_cases_count
              }{" "}
              ocorrência(s)
            </small>
          </div>

          <ArrowRight
            size={15}
          />
        </Link>

        {summary.has_fitness_identity ? (
          <Link href="/fitness/consignacoes">
            <Repeat2
              size={17}
            />

            <div>
              <span>
                Consignações
              </span>

              <strong>
                {
                  summary.open_consignments_count
                }{" "}
                em aberto
              </strong>

              <small>
                {
                  summary.consignments_count
                }{" "}
                no histórico
              </small>
            </div>

            <ArrowRight
              size={15}
            />
          </Link>
        ) : (
          <div className="customer-company-360-status-static">
            <Repeat2
              size={17}
            />

            <div>
              <span>
                Consignações
              </span>

              <strong>
                Sem vínculo Fitness
              </strong>

              <small>
                Nenhuma identidade Fitness vinculada por telefone.
              </small>
            </div>
          </div>
        )}

        <div className="customer-company-360-status-static">
          <CalendarCheck2
            size={17}
          />

          <div>
            <span>
              Última compra Company
            </span>

            <strong>
              {summary.last_company_purchase_at
                ? formatDateTime(
                    summary.last_company_purchase_at,
                  )
                : "Sem compra"}
            </strong>

            <small>
              {activeRelationshipCount >
              0
                ? `${activeRelationshipCount} acompanhamento(s) ativo(s)`
                : "Sem ocorrência comercial aberta"}
            </small>
          </div>
        </div>
      </div>

      {fitnessMatches.length >
        0 && (
        <article className="customer-company-360-linkage">
          <div>
            <strong>
              Vínculo Fitness
              identificado
            </strong>

            <span>
              O sistema encontrou{" "}
              {
                fitnessMatches.length
              }{" "}
              cadastro(s) Fitness com
              o mesmo telefone
              normalizado. Nenhum
              vínculo foi criado apenas
              pelo nome.
            </span>
          </div>

          <div>
            {fitnessMatches.map(
              (match) => (
                <span
                  className="badge purple"
                  key={match.id}
                >
                  {match.name}
                  {match.city
                    ? ` · ${match.city}`
                    : ""}
                </span>
              ),
            )}
          </div>
        </article>
      )}

      <article className="panel customer-company-360-timeline-panel">
        <div className="panel-head">
          <div>
            <h2>
              Linha do tempo Company
            </h2>

            <p>
              Eventos mais recentes
              primeiro. A origem de
              cada evento permanece
              explícita.
            </p>
          </div>

          <span className="badge gray">
            <History size={13} />
            {timeline.length}
          </span>
        </div>

        {timeline.length ===
        0 ? (
          <div className="empty compact">
            <History size={26} />
            <strong>
              Sem histórico
              consolidado
            </strong>
            Os próximos eventos do
            cliente aparecerão aqui.
          </div>
        ) : (
          <div className="customer-company-360-timeline">
            {timeline
              .slice(0, 30)
              .map(
                (
                  event,
                  index,
                ) => {
                  const Icon =
                    eventIcon(
                      event.event_type,
                    );

                  const content = (
                    <>
                      <span className="customer-company-360-event-icon">
                        <Icon
                          size={16}
                        />
                      </span>

                      <div className="customer-company-360-event-main">
                        <div>
                          <span
                            className={`badge ${eventOperationTone(
                              event.operation,
                            )}`}
                          >
                            {eventOperationLabel(
                              event.operation,
                            )}
                          </span>

                          <time>
                            {event.event_at
                              ? formatDateTime(
                                  event.event_at,
                                )
                              : "Sem data"}
                          </time>
                        </div>

                        <strong>
                          {
                            event.title
                          }
                        </strong>

                        {event.subtitle && (
                          <small>
                            {
                              event.subtitle
                            }
                          </small>
                        )}
                      </div>

                      <div className="customer-company-360-event-side">
                        {event.amount !==
                          null &&
                          event.amount >
                            0 && (
                            <strong>
                              {formatCurrency(
                                event.amount,
                              )}
                            </strong>
                          )}

                        {event.status && (
                          <small>
                            {
                              event.status
                            }
                          </small>
                        )}

                        {event.href && (
                          <ArrowRight
                            size={14}
                          />
                        )}
                      </div>
                    </>
                  );

                  if (
                    event.href
                  ) {
                    return (
                      <Link
                        href={
                          event.href
                        }
                        key={`${event.event_type}-${event.event_at}-${index}`}
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={`${event.event_type}-${event.event_at}-${index}`}
                    >
                      {content}
                    </div>
                  );
                },
              )}
          </div>
        )}
      </article>
    </section>
  );
}
