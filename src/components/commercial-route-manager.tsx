"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Check,
  Clock3,
  ExternalLink,
  MapPin,
  MessageCircle,
  RotateCcw,
  SkipForward,
  Users,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./commercial-route-manager.module.css";

export type CommercialRouteSummary = {
  id: string;
  route_on: string;
  city: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  notes: string | null;
  prepared_at: string | null;
  customer_count: number;
  pending_count: number;
  notified_count: number;
  skipped_count: number;
};

export type CommercialRouteQueueRow = {
  route_id: string;
  route_on: string;
  route_city: string;
  route_status: string;
  route_customer_id: string;
  status: "pending" | "notified" | "skipped";
  prepared_at: string;
  notified_at: string | null;
  skipped_at: string | null;
  last_action_at: string | null;
  notes: string | null;
  customer_id: string;
  customer_name: string;
  phone: string | null;
  customer_city: string | null;
  reference: string | null;
  last_contact_at: string | null;
  last_contact_outcome: string | null;
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}`;
}

function statusLabel(status: CommercialRouteSummary["status"]) {
  if (status === "scheduled") return "Agendada";
  if (status === "in_progress") return "Em andamento";
  if (status === "completed") return "Concluída";
  return "Cancelada";
}

export function CommercialRouteManager({
  routes,
  selectedRouteId,
  queue,
  today,
}: {
  routes: CommercialRouteSummary[];
  selectedRouteId: string | null;
  queue: CommercialRouteQueueRow[];
  today: string;
}) {
  const router = useRouter();
  const [routeOn, setRouteOn] = useState(today);
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );

  const pending = queue.filter((row) => row.status === "pending");
  const done = queue.filter((row) => row.status !== "pending");

  async function scheduleRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("schedule");
    setMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("commercial_schedule_route_v1", {
      p_route_on: routeOn,
      p_city: city,
      p_notes: notes || null,
    });

    setBusy(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setCity("");
    setNotes("");
    router.push(`/vendas/rotas?route=${String(data)}`);
    router.refresh();
  }

  async function act(
    row: CommercialRouteQueueRow,
    action: "notified" | "skipped" | "pending",
  ) {
    setBusy(row.route_customer_id);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.rpc(
      "commercial_route_customer_action_v1",
      {
        p_route_customer_id: row.route_customer_id,
        p_action: action,
        p_notes: null,
      },
    );

    setBusy(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className={styles.shell}>
      <article className={`panel ${styles.scheduler}`}>
        <div className="panel-head">
          <div>
            <h2>Agendar rota</h2>
            <p>Uma data e uma cidade por visita.</p>
          </div>
          <CalendarPlus size={19} />
        </div>

        <form className={styles.form} onSubmit={scheduleRoute}>
          <label className="field">
            <span>Data da visita</span>
            <input
              className="input"
              type="date"
              required
              value={routeOn}
              onChange={(event) => setRouteOn(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Cidade</span>
            <input
              className="input"
              type="text"
              required
              maxLength={120}
              placeholder="Ex.: Carangola"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </label>

          <label className={`field ${styles.notesField}`}>
            <span>Observação (opcional)</span>
            <input
              className="input"
              type="text"
              maxLength={300}
              placeholder="Ex.: passar no período da tarde"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

          <button
            className="button gold"
            type="submit"
            disabled={busy === "schedule"}
          >
            <CalendarPlus size={16} />
            {busy === "schedule" ? "Salvando..." : "Agendar"}
          </button>
        </form>

        {message && <p className={styles.message}>{message}</p>}
      </article>

      <article className={`panel ${styles.routePicker}`}>
        <div className="panel-head">
          <div>
            <h2>Rotas</h2>
            <p>Escolha uma visita para abrir a fila temporária.</p>
          </div>
          <MapPin size={19} />
        </div>

        {routes.length === 0 ? (
          <div className="empty compact">
            <strong>Nenhuma rota agendada</strong>
            Cadastre a primeira visita acima.
          </div>
        ) : (
          <div className={styles.routeStrip}>
            {routes.map((route) => (
              <Link
                key={route.id}
                href={`/vendas/rotas?route=${route.id}`}
                className={`${styles.routeCard} ${
                  route.id === selectedRouteId ? styles.routeCardActive : ""
                }`}
              >
                <span>{formatDate(route.route_on)}</span>
                <strong>{route.city}</strong>
                <small>
                  {statusLabel(route.status)} · {route.pending_count} pendente(s)
                </small>
              </Link>
            ))}
          </div>
        )}
      </article>

      {selectedRoute && (
        <article className={`panel ${styles.queuePanel}`}>
          <div className={`panel-head ${styles.queueHead}`}>
            <div>
              <h2>
                {selectedRoute.city} · {formatDate(selectedRoute.route_on)}
              </h2>
              <p>
                Fila exclusiva da rota. A Fila Comercial continua separada.
              </p>
            </div>

            <div className={styles.counts}>
              <span>
                <Clock3 size={14} />
                {selectedRoute.pending_count} pendentes
              </span>
              <span>
                <Check size={14} />
                {selectedRoute.notified_count} avisados
              </span>
              <span>
                <Users size={14} />
                {selectedRoute.customer_count} clientes
              </span>
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="empty compact">
              <strong>Nenhum cliente encontrado nessa cidade</strong>
              Confira a cidade cadastrada no CRM. A preparação roda novamente
              ao reabrir a rota e não duplica clientes.
            </div>
          ) : (
            <div className={styles.queueSections}>
              <section>
                <div className={styles.sectionTitle}>
                  <strong>Pendentes</strong>
                  <span>{pending.length}</span>
                </div>

                {pending.length === 0 ? (
                  <div className={styles.doneState}>
                    <Check size={18} />
                    Todos os clientes desta rota já foram tratados.
                  </div>
                ) : (
                  <div className={styles.customerGrid}>
                    {pending.map((row) => (
                      <CustomerCard
                        key={row.route_customer_id}
                        row={row}
                        busy={busy === row.route_customer_id}
                        onAction={act}
                      />
                    ))}
                  </div>
                )}
              </section>

              {done.length > 0 && (
                <section>
                  <div className={styles.sectionTitle}>
                    <strong>Tratados</strong>
                    <span>{done.length}</span>
                  </div>

                  <div className={styles.customerGrid}>
                    {done.map((row) => (
                      <CustomerCard
                        key={row.route_customer_id}
                        row={row}
                        busy={busy === row.route_customer_id}
                        onAction={act}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </article>
      )}
    </div>
  );
}

function CustomerCard({
  row,
  busy,
  onAction,
}: {
  row: CommercialRouteQueueRow;
  busy: boolean;
  onAction: (
    row: CommercialRouteQueueRow,
    action: "notified" | "skipped" | "pending",
  ) => Promise<void>;
}) {
  return (
    <article className={styles.customerCard}>
      <div className={styles.customerTop}>
        <div>
          <strong>{row.customer_name}</strong>
          <span>
            {row.customer_city || row.route_city}
            {row.reference ? ` · ${row.reference}` : ""}
          </span>
        </div>

        <span
          className={`${styles.status} ${
            row.status === "notified"
              ? styles.statusNotified
              : row.status === "skipped"
                ? styles.statusSkipped
                : styles.statusPending
          }`}
        >
          {row.status === "notified"
            ? "Avisado"
            : row.status === "skipped"
              ? "Pulou"
              : "Pendente"}
        </span>
      </div>

      {row.last_contact_at && (
        <small className={styles.lastContact}>
          Último contato no CRM:{" "}
          {new Date(row.last_contact_at).toLocaleDateString("pt-BR")}
          {row.last_contact_outcome ? ` · ${row.last_contact_outcome}` : ""}
        </small>
      )}

      <div className={styles.actions}>
        {row.phone ? (
          <a
            className="button ghost"
            href={whatsappUrl(row.phone)}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
        ) : (
          <span className={styles.noPhone}>Sem telefone</span>
        )}

        <Link className="button ghost" href={`/clientes/${row.customer_id}`}>
          <ExternalLink size={16} />
          CRM
        </Link>

        {row.status === "pending" ? (
          <>
            <button
              className="button gold"
              type="button"
              disabled={busy}
              onClick={() => void onAction(row, "notified")}
            >
              <Check size={16} />
              Avisado
            </button>

            <button
              className="button ghost"
              type="button"
              disabled={busy}
              onClick={() => void onAction(row, "skipped")}
            >
              <SkipForward size={16} />
              Pular
            </button>
          </>
        ) : (
          <button
            className="button ghost"
            type="button"
            disabled={busy}
            onClick={() => void onAction(row, "pending")}
          >
            <RotateCcw size={16} />
            Voltar pendente
          </button>
        )}
      </div>
    </article>
  );
}
