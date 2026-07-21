"use client";

import {
  CalendarCheck2,
  CalendarDays,
  LoaderCircle,
  RefreshCcw,
  ShieldCheck,
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    null,
  );

  async function syncNow() {
    setLoading(true);
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

      if (data?.connected === false) {
        setMessage(
          "A ponte Apps Script ainda não está configurada no servidor.",
        );
      } else {
        const processed = Number(data?.processed ?? 0);
        const failed = Number(data?.failed ?? 0);

        setMessage(
          failed > 0
            ? `${processed} sincronizado(s) · ${failed} falha(s) serão tentadas novamente.`
            : `${processed} item(ns) sincronizado(s). Fila atualizada.`,
        );
      }

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao sincronizar o Google Agenda.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <article
      className={`google-calendar-card ${
        status.connected ? "connected" : ""
      }`}
    >
      <div className="google-calendar-card-icon">
        {status.connected ? (
          <CalendarCheck2 size={22} />
        ) : (
          <CalendarDays size={22} />
        )}
      </div>

      <div className="google-calendar-card-copy">
        <span>Integração de rotina</span>
        <h2>Google Agenda</h2>

        {status.connected ? (
          <p>
            Ponte gratuita via Google Apps Script ativa. Pós-vendas
            e tarefas estratégicas pendentes são espelhados no
            calendário; ao concluir na Candinho, o evento é removido
            automaticamente.
          </p>
        ) : (
          <p>
            A ponte Google Apps Script ainda não está configurada.
            A Candinho continua funcionando normalmente e mantém a
            fila de sincronização até a integração ser ativada.
          </p>
        )}

        <div className="google-calendar-card-meta">
          <small>
            Integração:{" "}
            <strong>
              {status.connected
                ? "Apps Script Bridge"
                : "Pendente"}
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

          <small>
            Processados:{" "}
            <strong>{status.done_jobs}</strong>
          </small>
        </div>

        {status.connected && (
          <div className="google-calendar-bridge-security">
            <ShieldCheck size={14} />
            <span>
              Candinho é a fonte oficial; o Google Agenda funciona
              como espelho para o widget do celular.
            </span>
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
        <button
          className="button gold"
          type="button"
          onClick={syncNow}
          disabled={loading || !status.connected}
        >
          {loading ? (
            <LoaderCircle
              className="spin"
              size={16}
            />
          ) : (
            <RefreshCcw size={16} />
          )}
          Sincronizar agora
        </button>
      </div>
    </article>
  );
}
