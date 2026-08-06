"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  Bug,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  Send,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const CATEGORY_OPTIONS = [
  ["layout", "Layout / menu cortado"],
  ["broken_action", "Botão / função quebrada"],
  ["wrong_data", "Informação errada"],
  ["confusing_flow", "Fluxo confuso"],
  ["slow_screen", "Tela lenta"],
  ["integration", "Integração"],
  ["other", "Outro"],
] as const;

function viewportClass() {
  if (typeof window === "undefined") return "unknown";
  if (window.innerWidth <= 720) return "mobile";
  if (window.innerWidth <= 1100) return "tablet";
  return "desktop";
}

function nexusSessionId() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("candinho:nexus-session");
}

function lastClientError() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("candinho:last-client-error");
}

export function UxIssueReporter({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number][0]>("layout");
  const [description, setDescription] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const store = (value: string) => {
      try {
        window.sessionStorage.setItem(
          "candinho:last-client-error",
          value.slice(0, 1500),
        );
      } catch {
        // O coletor nunca deve atrapalhar a operação.
      }
    };

    const onError = (event: ErrorEvent) => {
      store(
        [event.message, event.filename, event.lineno ? `linha ${event.lineno}` : ""]
          .filter(Boolean)
          .join(" · "),
      );
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === "string"
            ? event.reason
            : "Promise rejeitada sem mensagem.";
      store(reason);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [enabled]);

  const technicalContext = useMemo(() => {
    if (!mounted || typeof window === "undefined") return null;
    return {
      route: pathname ?? window.location.pathname,
      viewport: viewportClass(),
      inner_width: window.innerWidth,
      inner_height: window.innerHeight,
      outer_width: window.outerWidth,
      outer_height: window.outerHeight,
      screen_width: window.screen?.width ?? null,
      screen_height: window.screen?.height ?? null,
      device_pixel_ratio: window.devicePixelRatio || 1,
      visual_viewport_scale: window.visualViewport?.scale ?? null,
    };
  }, [mounted, pathname, open]);

  if (!enabled || !mounted) return null;

  async function submit() {
    const note = description.trim();
    if (!note || saving) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/nexus/ux-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          severity: blocking ? "high" : "normal",
          description: note,
          route: pathname ?? window.location.pathname,
          viewport_class: viewportClass(),
          screen_width: window.screen?.width ?? null,
          screen_height: window.screen?.height ?? null,
          device_pixel_ratio: window.devicePixelRatio || 1,
          user_agent: window.navigator.userAgent,
          session_id: nexusSessionId(),
          error_message: lastClientError(),
          client_context: {
            inner_width: window.innerWidth,
            inner_height: window.innerHeight,
            outer_width: window.outerWidth,
            outer_height: window.outerHeight,
            visual_viewport_width: window.visualViewport?.width ?? null,
            visual_viewport_height: window.visualViewport?.height ?? null,
            visual_viewport_scale: window.visualViewport?.scale ?? null,
            language: window.navigator.language,
            online: window.navigator.onLine,
          },
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível salvar o relato.");
      }

      setSaved(true);
      setDescription("");
      setBlocking(false);
      setMessage("Registrado. Você pode continuar trabalhando normalmente.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível salvar o relato.",
      );
    } finally {
      setSaving(false);
    }
  }

  function close() {
    setOpen(false);
    setSaved(false);
    setMessage(null);
  }

  return createPortal(
    <>
      <button
        type="button"
        title="Registrar quebra na UX ou função"
        aria-label="Registrar quebra na UX ou função"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          zIndex: 89,
          right: 108,
          bottom: 84,
          width: 86,
          height: 46,
          border: "1px solid rgba(229,91,91,.32)",
          borderRadius: 15,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          color: "#ef8b8b",
          background: "rgba(9,13,20,.96)",
          boxShadow: "0 14px 34px rgba(0,0,0,.32)",
          cursor: "pointer",
          font: "inherit",
        }}
      >
        <Bug size={18} />
        <b style={{ fontSize: 8, fontWeight: 900 }}>Quebra</b>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Registrar problema de UX"
          style={{
            position: "fixed",
            zIndex: 120,
            inset: 0,
            background: "rgba(2,5,10,.62)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close();
          }}
        >
          <article
            className="panel"
            style={{
              width: "min(500px, calc(100vw - 28px))",
              maxHeight: "min(720px, calc(100dvh - 32px))",
              overflow: "auto",
              borderColor: "rgba(229,91,91,.24)",
              boxShadow: "0 24px 80px rgba(0,0,0,.5)",
            }}
          >
            <div className="panel-head">
              <div>
                <span className="eyebrow">Nexus · Qualidade</span>
                <h2 style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Bug size={18} /> Quebra na UX / Função
                </h2>
                <p>
                  Anote em poucos segundos. Rota, tamanho da tela, zoom aproximado e
                  últimas navegações são anexados automaticamente.
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={close}
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="panel-body" style={{ display: "grid", gap: 12 }}>
              {saved ? (
                <div
                  style={{
                    minHeight: 170,
                    display: "grid",
                    placeItems: "center",
                    textAlign: "center",
                    gap: 9,
                  }}
                >
                  <CheckCircle2 size={34} color="#61d996" />
                  <div>
                    <strong style={{ display: "block", fontSize: 13 }}>
                      Ocorrência registrada
                    </strong>
                    <small
                      style={{
                        display: "block",
                        marginTop: 5,
                        color: "var(--muted)",
                      }}
                    >
                      Não precisa parar o trabalho para explicar mais agora.
                    </small>
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
                    <button className="button ghost compact-button" type="button" onClick={() => setSaved(false)}>
                      Registrar outra
                    </button>
                    <Link className="button gold compact-button" href="/suplementos/nexus/ux" onClick={close}>
                      Ver relatos <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <label className="field">
                    <span>Tipo do problema</span>
                    <select
                      className="select"
                      value={category}
                      onChange={(event) =>
                        setCategory(
                          event.target.value as (typeof CATEGORY_OPTIONS)[number][0],
                        )
                      }
                    >
                      {CATEGORY_OPTIONS.map(([value, label]) => (
                        <option value={value} key={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>O que aconteceu?</span>
                    <textarea
                      className="textarea"
                      rows={5}
                      autoFocus
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder='Ex.: "o menu está cortando no PC e só aparece quando diminuo o zoom"'
                    />
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 9,
                      padding: 10,
                      border: "1px solid var(--line)",
                      borderRadius: 11,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={blocking}
                      onChange={(event) => setBlocking(event.target.checked)}
                    />
                    <span>
                      <strong style={{ display: "block", fontSize: 9 }}>
                        Está me impedindo de trabalhar
                      </strong>
                      <small style={{ color: "var(--muted)", fontSize: 8 }}>
                        Marca o relato como prioridade alta.
                      </small>
                    </span>
                  </label>

                  {technicalContext && (
                    <div
                      style={{
                        padding: 9,
                        border: "1px dashed var(--line)",
                        borderRadius: 10,
                        color: "var(--muted)",
                        fontSize: 7.5,
                        lineHeight: 1.5,
                      }}
                    >
                      Contexto automático: {technicalContext.route} ·{" "}
                      {technicalContext.viewport} · {technicalContext.inner_width}×
                      {technicalContext.inner_height} · DPR{" "}
                      {technicalContext.device_pixel_ratio}
                      {technicalContext.visual_viewport_scale
                        ? ` · escala ${technicalContext.visual_viewport_scale}`
                        : ""}
                    </div>
                  )}

                  <button
                    className="button gold"
                    type="button"
                    disabled={saving || !description.trim()}
                    onClick={() => void submit()}
                  >
                    {saving ? (
                      <LoaderCircle className="spin" size={15} />
                    ) : (
                      <Send size={15} />
                    )}
                    {saving ? "Registrando..." : "Registrar e continuar"}
                  </button>
                </>
              )}

              {message && <p className="form-message">{message}</p>}
            </div>
          </article>
        </div>
      )}
    </>,
    document.body,
  );
}
