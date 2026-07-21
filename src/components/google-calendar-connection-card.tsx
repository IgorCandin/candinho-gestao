"use client";

import {
  CalendarDays,
  Link2,
  LoaderCircle,
  RefreshCcw,
  Unplug,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GoogleCalendarStatus } from "@/lib/google-calendar-data";

function formatSync(value: string | null) {
  if (!value) return "Ainda não sincronizado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function GoogleCalendarConnectionCard({
  status,
}: {
  status: GoogleCalendarStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<
    "connect" | "sync" | "disconnect" | null
  >(null);
  const [message, setMessage] = useState<string | null>(
    null,
  );

  async function connect() {
    setLoading("connect");
    setMessage(null);

    try {
      const supabase = createClient();
      const { data, error } =
        await supabase.functions.invoke(
          "google-calendar-oauth",
          {
            body: { action: "start" },
          },
        );

      if (error) throw error;

      const url =
        typeof data?.authorization_url === "string"
          ? data.authorization_url
          : null;

      if (!url) {
        throw new Error(
          data?.error ??
            "Não foi possível iniciar a conexão com o Google.",
        );
      }

      window.location.assign(url);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao conectar o Google Calendar.",
      );
      setLoading(null);
    }
  }

  async function syncNow() {
    setLoading("sync");
    setMessage(null);

    try {
      const supabase = createClient();
      const { data, error } =
        await supabase.functions.invoke(
          "google-calendar-sync",
          {
            body: { limit: 100 },
          },
        );

      if (error) throw error;

      setMessage(
        data?.connected === false
          ? "Conecte uma conta Google antes de sincronizar."
          : `${Number(data?.processed ?? 0)} item(ns) sincronizado(s).`,
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao sincronizar o Google Calendar.",
      );
    } finally {
      setLoading(null);
    }
  }

  async function disconnect() {
    if (
      !window.confirm(
        "Desconectar o Google Calendar da Candinho? Os eventos que já estão no Google não serão apagados automaticamente.",
      )
    ) {
      return;
    }

    setLoading("disconnect");
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } =
        await supabase.functions.invoke(
          "google-calendar-oauth",
          {
            body: { action: "disconnect" },
          },
        );

      if (error) throw error;

      setMessage("Google Calendar desconectado.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao desconectar.",
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <article
      className={`google-calendar-card ${
        status.connected ? "connected" : ""
      }`}
    >
      <div className="google-calendar-card-icon">
        <CalendarDays size={22} />
      </div>

      <div className="google-calendar-card-copy">
        <span>Integração de rotina</span>
        <h2>Google Calendar</h2>

        {status.connected ? (
          <p>
            Pós-vendas e tarefas estratégicas pendentes são
            espelhados no calendário. Ao concluir na Candinho,
            o evento é removido automaticamente.
          </p>
        ) : (
          <p>
            Conecte seu calendário principal para enxergar
            pós-vendas e Agenda Estratégica no widget do
            celular.
          </p>
        )}

        {status.connected && (
          <div className="google-calendar-card-meta">
            <small>
              Conta:{" "}
              <strong>
                {status.email ??
                  "Google conectado"}
              </strong>
            </small>

            <small>
              Última sincronização:{" "}
              <strong>
                {formatSync(status.last_sync_at)}
              </strong>
            </small>

            <small>
              Fila:{" "}
              <strong>
                {status.pending_jobs} pendente(s)
                {status.error_jobs > 0
                  ? ` · ${status.error_jobs} erro(s)`
                  : ""}
              </strong>
            </small>
          </div>
        )}

        {status.last_error && (
          <p className="google-calendar-error">
            {status.last_error}
          </p>
        )}

        {message && (
          <p className="google-calendar-message">
            {message}
          </p>
        )}
      </div>

      <div className="google-calendar-card-actions">
        {!status.connected ? (
          <button
            className="button gold"
            type="button"
            onClick={connect}
            disabled={loading !== null}
          >
            {loading === "connect" ? (
              <LoaderCircle
                className="spin"
                size={16}
              />
            ) : (
              <Link2 size={16} />
            )}
            Conectar Google
          </button>
        ) : (
          <>
            <button
              className="button gold"
              type="button"
              onClick={syncNow}
              disabled={loading !== null}
            >
              {loading === "sync" ? (
                <LoaderCircle
                  className="spin"
                  size={16}
                />
              ) : (
                <RefreshCcw size={16} />
              )}
              Sincronizar agora
            </button>

            <button
              className="button ghost"
              type="button"
              onClick={connect}
              disabled={loading !== null}
            >
              <Link2 size={16} />
              Reconectar
            </button>

            <button
              className="button ghost"
              type="button"
              onClick={disconnect}
              disabled={loading !== null}
            >
              {loading === "disconnect" ? (
                <LoaderCircle
                  className="spin"
                  size={16}
                />
              ) : (
                <Unplug size={16} />
              )}
              Desconectar
            </button>
          </>
        )}
      </div>
    </article>
  );
}
