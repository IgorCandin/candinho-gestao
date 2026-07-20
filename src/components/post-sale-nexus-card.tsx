"use client";

import {
  Check,
  Clipboard,
  LoaderCircle,
  MessageSquareText,
  RefreshCcw,
  Send,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const today = () =>
  new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());

async function edgeErrorMessage(
  error: unknown,
) {
  const fallback =
    error instanceof Error
      ? error.message
      : "Não foi possível gerar a mensagem.";

  const context =
    error &&
    typeof error === "object" &&
    "context" in error
      ? (
          error as {
            context?: unknown;
          }
        ).context
      : null;

  if (context instanceof Response) {
    try {
      const payload =
        await context
          .clone()
          .json();

      if (
        payload &&
        typeof payload.error ===
          "string"
      ) {
        return payload.error;
      }
    } catch {
      // Mantém a mensagem padrão.
    }
  }

  return fallback;
}

export function PostSaleNexusCard({
  batchId,
  phone,
  initialMessage,
  initialMeta,
  status,
  dueOn,
}: {
  batchId: string;
  phone: string | null;
  initialMessage: string | null;
  initialMeta: Record<
    string,
    unknown
  > | null;
  status: string;
  dueOn: string;
}) {
  const router = useRouter();

  const [message, setMessage] =
    useState(
      initialMessage ?? "",
    );

  const [meta, setMeta] =
    useState<
      Record<string, unknown>
    >(initialMeta ?? {});

  const [loading, setLoading] =
    useState(false);

  const [feedback, setFeedback] =
    useState<string | null>(
      null,
    );

  const [newDue, setNewDue] =
    useState(dueOn);

  const [outcome, setOutcome] =
    useState(
      "Cliente respondeu bem ao pós-venda",
    );

  const [notes, setNotes] =
    useState("");

  const wa = useMemo(() => {
    const digits = (
      phone ?? ""
    ).replace(/\D/g, "");

    if (!digits || !message) {
      return null;
    }

    const full =
      digits.startsWith("55")
        ? digits
        : `55${digits}`;

    return `https://wa.me/${full}?text=${encodeURIComponent(
      message,
    )}`;
  }, [phone, message]);

  async function generate() {
    setLoading(true);
    setFeedback(null);

    try {
      const {
        data,
        error,
      } =
        await createClient().functions.invoke(
          "post-sale-nexus-suggest",
          {
            body: {
              batch_id: batchId,
            },
          },
        );

      if (error) {
        throw new Error(
          await edgeErrorMessage(
            error,
          ),
        );
      }

      if (data?.error) {
        throw new Error(
          String(data.error),
        );
      }

      setMessage(
        data?.message ?? "",
      );
      setMeta(data ?? {});
      setFeedback(
        "Mensagem atualizada pelo Nexus.",
      );
    } catch (error) {
      setFeedback(
        await edgeErrorMessage(
          error,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(
      message,
    );

    setFeedback(
      "Mensagem copiada.",
    );
  }

  async function reschedule() {
    setLoading(true);
    setFeedback(null);

    try {
      const due = `${newDue}T12:00:00-03:00`;

      const { error } =
        await createClient().rpc(
          "reschedule_operational_event",
          {
            p_source_type:
              "sale_post_sale",
            p_source_id:
              batchId,
            p_due_at: due,
          },
        );

      if (error) throw error;

      setFeedback(
        "Pós-venda reagendado.",
      );

      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível reagendar.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function complete() {
    setLoading(true);
    setFeedback(null);

    try {
      const { error } =
        await createClient().rpc(
          "complete_operational_event",
          {
            p_source_type:
              "sale_post_sale",
            p_source_id:
              batchId,
            p_completed_on:
              today(),
            p_outcome:
              outcome.trim() ||
              null,
            p_notes:
              notes.trim() ||
              null,
            p_payment_method:
              null,
          },
        );

      if (error) throw error;

      router.push(
        "/pos-venda?concluido=1",
      );
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir.",
      );
    } finally {
      setLoading(false);
    }
  }

  const contextSummary =
    typeof meta.context_summary ===
    "string"
      ? meta.context_summary
      : null;

  const suggestedAction =
    typeof meta.suggested_action ===
    "string"
      ? meta.suggested_action
      : null;

  const warnings = Array.isArray(
    meta.warnings,
  )
    ? meta.warnings.filter(
        (
          value,
        ): value is string =>
          typeof value ===
          "string",
      )
    : [];

  return (
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
              <MessageSquareText
                size={18}
              />{" "}
              Nexus IA · mensagem
              pronta
            </h2>

            <p>
              A IA usa as compras
              agrupadas, histórico,
              leads e interações
              reais do cliente.
            </p>
          </div>

          <button
            type="button"
            className="button gold"
            disabled={loading}
            onClick={generate}
          >
            {loading ? (
              <LoaderCircle
                className="spin"
                size={16}
              />
            ) : (
              <RefreshCcw
                size={16}
              />
            )}

            {message
              ? "Regenerar"
              : "Gerar mensagem"}
          </button>
        </div>

        <div className="panel-body">
          {message ? (
            <>
              <label className="field">
                <span>
                  Mensagem para enviar
                </span>

                <textarea
                  className="textarea"
                  rows={8}
                  value={message}
                  onChange={(
                    event,
                  ) =>
                    setMessage(
                      event.target
                        .value,
                    )
                  }
                />
              </label>

              <div className="panel-actions">
                <button
                  type="button"
                  className="button ghost"
                  onClick={copy}
                >
                  <Clipboard
                    size={16}
                  />
                  Copiar
                </button>

                {wa && (
                  <a
                    className="button gold"
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Send
                      size={16}
                    />
                    Abrir no
                    WhatsApp
                  </a>
                )}
              </div>

              {(contextSummary ||
                suggestedAction ||
                warnings.length >
                  0) && (
                <div
                  style={{
                    display:
                      "grid",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  {contextSummary && (
                    <p>
                      <strong>
                        Leitura do
                        Nexus:
                      </strong>{" "}
                      {
                        contextSummary
                      }
                    </p>
                  )}

                  {suggestedAction && (
                    <p>
                      <strong>
                        Próxima ação
                        sugerida:
                      </strong>{" "}
                      {
                        suggestedAction
                      }
                    </p>
                  )}

                  {warnings.length >
                    0 && (
                    <p>
                      <strong>
                        Atenção:
                      </strong>{" "}
                      {warnings.join(
                        " · ",
                      )}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="empty">
              <MessageSquareText
                size={28}
              />
              <strong>
                Gere o contexto em um
                clique
              </strong>
              O Nexus monta a mensagem
              sem você precisar tirar
              print e mandar para outro
              chat.
            </div>
          )}

          {feedback && (
            <p className="form-help">
              {feedback}
            </p>
          )}
        </div>
      </article>

      {status === "planned" && (
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>
                Gerenciar
                acompanhamento
              </h2>

              <p>
                Reagende ou conclua o
                contato depois de falar
                com o cliente.
              </p>
            </div>
          </div>

          <div className="panel-body form-grid-two">
            <label className="field">
              <span>
                Nova data
              </span>

              <input
                className="input"
                type="date"
                value={newDue}
                onChange={(
                  event,
                ) =>
                  setNewDue(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <div
              style={{
                alignSelf: "end",
              }}
            >
              <button
                type="button"
                className="button ghost"
                disabled={loading}
                onClick={reschedule}
              >
                <RefreshCcw
                  size={16}
                />
                Reagendar
              </button>
            </div>

            <label className="field field-span-two">
              <span>
                Resultado do contato
              </span>

              <input
                className="input"
                value={outcome}
                onChange={(
                  event,
                ) =>
                  setOutcome(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label className="field field-span-two">
              <span>
                Observações
              </span>

              <textarea
                className="textarea"
                rows={3}
                value={notes}
                onChange={(
                  event,
                ) =>
                  setNotes(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <div className="field-span-two">
              <button
                type="button"
                className="button gold"
                disabled={loading}
                onClick={complete}
              >
                <Check size={16} />
                Concluir pós-venda
              </button>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
