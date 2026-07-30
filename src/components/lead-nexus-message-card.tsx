"use client";

import {
  Clipboard,
  LoaderCircle,
  MessageSquareText,
  RefreshCcw,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";

type LeadNexusResponse = {
  message?: string;
  context_summary?: string | null;
  suggested_action?: string | null;
  warnings?: string[];
  tone?: string | null;
  error?: string;
};

export function LeadNexusMessageCard({
  leadId,
  customerName,
  phone,
  leadNotes,
}: {
  leadId: string;
  customerName: string;
  phone: string | null;
  leadNotes: string | null;
}) {
  const [additionalContext, setAdditionalContext] = useState("");
  const [message, setMessage] = useState("");
  const [meta, setMeta] = useState<LeadNexusResponse>({});
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const whatsappUrl = useMemo(() => {
    const digits = (phone ?? "").replace(/\D/g, "");

    if (!digits || !message.trim()) return null;

    const full = digits.startsWith("55") ? digits : `55${digits}`;

    return `https://wa.me/${full}?text=${encodeURIComponent(
      message.trim(),
    )}`;
  }, [phone, message]);

  async function generate() {
    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/leads/${leadId}/mensagem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          additional_context: additionalContext.trim() || null,
        }),
      });

      const payload = (await response.json()) as LeadNexusResponse;

      if (!response.ok) {
        throw new Error(
          payload.error || "Não foi possível gerar a mensagem.",
        );
      }

      setMessage(payload.message ?? "");
      setMeta(payload);
      setFeedback("Mensagem atualizada pelo Nexus.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a mensagem.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!message.trim()) return;

    await navigator.clipboard.writeText(message.trim());
    setFeedback("Mensagem copiada.");
  }

  const warnings = Array.isArray(meta.warnings) ? meta.warnings : [];

  return (
    <article className="panel lead-nexus-card">
      <div className="panel-head">
        <div>
          <h2>
            <MessageSquareText size={18} /> Nexus IA · mensagem para o lead
          </h2>
          <p>
            Gere uma abordagem usando o interesse atual, observações do lead e
            histórico real do cliente.
          </p>
        </div>
      </div>

      <div className="panel-body lead-nexus-body">
        {leadNotes && (
          <div className="lead-nexus-current-note">
            <span>Observação atual do lead</span>
            <strong>{leadNotes}</strong>
          </div>
        )}

        <label className="field">
          <span>
            Observações adicionais <small>(opcional)</small>
          </span>
          <textarea
            className="textarea"
            rows={3}
            value={additionalContext}
            onChange={(event) => setAdditionalContext(event.target.value)}
            placeholder="Ex.: Ele disse que recebe sexta; hoje chegou o sabor que ele queria; pediu para eu chamar depois do treino..."
          />
          <small className="form-help">
            Serve só para esta geração. Pode deixar vazio que o Nexus usa os
            dados do lead e o histórico do cliente.
          </small>
        </label>

        <div className="panel-actions">
          <button
            type="button"
            className="button gold"
            disabled={loading}
            onClick={generate}
          >
            {loading ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <RefreshCcw size={16} />
            )}
            {loading
              ? "Gerando..."
              : message
                ? "Regenerar mensagem"
                : "Gerar mensagem"}
          </button>
        </div>

        {message ? (
          <>
            <label className="field">
              <span>Mensagem para {customerName}</span>
              <textarea
                className="textarea"
                rows={7}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>

            <div className="panel-actions">
              <button
                type="button"
                className="button ghost"
                onClick={copy}
              >
                <Clipboard size={16} />
                Copiar
              </button>

              {whatsappUrl && (
                <a
                  className="button gold"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Send size={16} />
                  Abrir no WhatsApp
                </a>
              )}
            </div>

            {(meta.context_summary ||
              meta.suggested_action ||
              warnings.length > 0) && (
              <div className="lead-nexus-reading">
                {meta.context_summary && (
                  <p>
                    <strong>Leitura do Nexus:</strong>{" "}
                    {meta.context_summary}
                  </p>
                )}

                {meta.suggested_action && (
                  <p>
                    <strong>Próxima ação:</strong>{" "}
                    {meta.suggested_action}
                  </p>
                )}

                {warnings.length > 0 && (
                  <p>
                    <strong>Atenção:</strong> {warnings.join(" · ")}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="empty compact lead-nexus-empty">
            <MessageSquareText size={25} />
            <strong>Mensagem ainda não gerada</strong>
            Se houver algo que aconteceu agora, escreva nas observações
            adicionais. Caso contrário, gere direto.
          </div>
        )}

        {feedback && <p className="form-help">{feedback}</p>}
      </div>

      <style jsx>{`
        .lead-nexus-body {
          display: grid;
          gap: 14px;
        }

        .lead-nexus-current-note {
          padding: 10px 12px;
          border: 1px solid var(--line);
          border-radius: 11px;
          background: rgba(255,255,255,.012);
        }

        .lead-nexus-current-note span,
        .lead-nexus-current-note strong {
          display: block;
        }

        .lead-nexus-current-note span {
          color: var(--muted);
          font-size: 8px;
          font-weight: 800;
        }

        .lead-nexus-current-note strong {
          margin-top: 4px;
          font-size: 9px;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .lead-nexus-reading {
          padding: 10px 12px;
          border: 1px solid rgba(217,164,65,.18);
          border-radius: 11px;
          display: grid;
          gap: 6px;
          background: rgba(217,164,65,.035);
        }

        .lead-nexus-reading p {
          margin: 0;
          color: var(--muted);
          font-size: 8px;
          line-height: 1.5;
        }

        .lead-nexus-reading strong {
          color: var(--text);
        }

        .lead-nexus-empty {
          min-height: 110px;
        }
      `}</style>
    </article>
  );
}
