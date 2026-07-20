import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  Gift,
  Handshake,
  MapPin,
  Store,
} from "lucide-react";
import type {
  PartnerOverview,
} from "@/lib/types";
import {
  formatCurrency,
  formatDateOnly,
} from "@/lib/format";

function daysSince(
  value: string | null,
) {
  if (!value) return null;

  const date =
    new Date(
      `${value.slice(0, 10)}T12:00:00`,
    );

  const now =
    new Date();

  return Math.max(
    0,
    Math.floor(
      (now.getTime() -
        date.getTime()) /
        86400000,
    ),
  );
}

export function PartnerNetworkSummary({
  partners,
}: {
  partners: PartnerOverview[];
}) {
  const active = partners.filter(
    (partner) =>
      partner.active &&
      partner.status !==
        "Pausado",
  );

  const pending =
    partners.filter(
      (partner) =>
        partner.settlement_pending,
    );

  const withStock =
    partners.filter(
      (partner) =>
        partner.linked_location_units >
        0,
    );

  const inactiveCommercial =
    active.filter((partner) => {
      const days =
        daysSince(
          partner.last_sale_on,
        );

      return (
        days === null ||
        days >= 30
      );
    });

  const incomplete =
    partners.filter(
      (partner) =>
        !partner.phone ||
        !partner.city ||
        !partner.contact_name,
    );

  const cycleRevenue =
    active.reduce(
      (sum, partner) =>
        sum +
        partner.current_cycle_revenue,
      0,
    );

  const cycleSales =
    active.reduce(
      (sum, partner) =>
        sum +
        partner.current_cycle_sales_count,
      0,
    );

  return (
    <section className="partner-network-summary">
      <div className="partner-network-kpis">
        <article>
          <Handshake
            size={19}
          />
          <span>
            Rede ativa
          </span>
          <strong>
            {active.length}
          </strong>
          <small>
            {partners.length} parceiro(s)
            cadastrados
          </small>
        </article>

        <article>
          <CircleDollarSign
            size={19}
          />
          <span>
            Vendas do ciclo
          </span>
          <strong>
            {cycleSales}
          </strong>
          <small>
            {formatCurrency(
              cycleRevenue,
            )}
          </small>
        </article>

        <article>
          <Gift size={19} />
          <span>
            Acertos pendentes
          </span>
          <strong>
            {pending.length}
          </strong>
          <small>
            metas ou valores a revisar
          </small>
        </article>

        <article>
          <Boxes size={19} />
          <span>
            Pontos com estoque
          </span>
          <strong>
            {withStock.length}
          </strong>
          <small>
            estoque físico nos parceiros
          </small>
        </article>
      </div>

      <div className="partner-network-attention-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>
                Parceiros sem movimento
              </h2>

              <p>
                Ativos sem venda há 30
                dias ou sem venda
                registrada.
              </p>
            </div>

            <span className="badge orange">
              <AlertTriangle
                size={13}
              />
              {
                inactiveCommercial.length
              }
            </span>
          </div>

          {inactiveCommercial.length ===
          0 ? (
            <div className="empty compact">
              <Handshake
                size={24}
              />
              <strong>
                Toda a rede teve
                movimento recente
              </strong>
              Nenhum parceiro ativo está
              parado há 30 dias.
            </div>
          ) : (
            <div className="partner-network-list">
              {inactiveCommercial
                .slice(0, 6)
                .map((partner) => (
                  <Link
                    href={`/parceiros/${partner.id}`}
                    key={partner.id}
                  >
                    <div>
                      <strong>
                        {partner.name}
                      </strong>

                      <span>
                        {partner.last_sale_on
                          ? `Última venda ${formatDateOnly(
                              partner.last_sale_on,
                            )}`
                          : "Sem venda vinculada"}
                      </span>
                    </div>

                    <ArrowRight
                      size={15}
                    />
                  </Link>
                ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>
                Cadastros para completar
              </h2>

              <p>
                Falta telefone, cidade ou
                responsável principal.
              </p>
            </div>

            <span className="badge red">
              <AlertTriangle
                size={13}
              />
              {incomplete.length}
            </span>
          </div>

          {incomplete.length ===
          0 ? (
            <div className="empty compact">
              <Store size={24} />
              <strong>
                Cadastros completos
              </strong>
              A rede ativa possui os
              dados essenciais.
            </div>
          ) : (
            <div className="partner-network-list">
              {incomplete
                .slice(0, 6)
                .map((partner) => (
                  <Link
                    href={`/parceiros/${partner.id}/editar`}
                    key={partner.id}
                  >
                    <div>
                      <strong>
                        {partner.name}
                      </strong>

                      <span>
                        {[
                          partner.city
                            ? null
                            : "cidade",
                          partner.phone
                            ? null
                            : "telefone",
                          partner.contact_name
                            ? null
                            : "responsável",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>

                    <ArrowRight
                      size={15}
                    />
                  </Link>
                ))}
            </div>
          )}
        </article>
      </div>

      {withStock.length > 0 && (
        <article className="panel partner-network-stock-panel">
          <div className="panel-head">
            <div>
              <h2>
                Estoque na rede
              </h2>

              <p>
                Pontos parceiros com
                unidades físicas
                vinculadas.
              </p>
            </div>

            <Link
              className="button ghost compact-button"
              href="/estoque"
            >
              Abrir estoque
            </Link>
          </div>

          <div className="partner-network-stock-grid">
            {withStock
              .slice(0, 8)
              .map((partner) => (
                <Link
                  href={`/parceiros/${partner.id}`}
                  key={partner.id}
                >
                  <span className="partner-network-stock-icon">
                    <MapPin
                      size={17}
                    />
                  </span>

                  <div>
                    <strong>
                      {partner.name}
                    </strong>

                    <small>
                      {partner.linked_location_code ??
                        partner.city ??
                        "Ponto parceiro"}
                    </small>
                  </div>

                  <b>
                    {
                      partner.linked_location_units
                    }{" "}
                    un.
                  </b>
                </Link>
              ))}
          </div>
        </article>
      )}
    </section>
  );
}
