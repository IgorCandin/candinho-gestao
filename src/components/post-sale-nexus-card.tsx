"use client";

import {
  Check,
  Clipboard,
  LoaderCircle,
  MessageSquareText,
  RefreshCcw,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Business = "supplements" | "fitness";

async function edgeErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : "Não foi possível gerar a mensagem.";
  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: unknown }).context
      : null;

  if (context instanceof Response) {
    try {
      const payload = await context.clone().json();
      if (payload && typeof payload.error === "string") return payload.error;
    } catch {
      // Mantém fallback.
    }
  }

  return fallback;
}

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function PostSaleNexusCard({
  batchId,
  customerId,
  business = "supplements",
  phone,
  initialMessage,
  initialMeta,
  status,
  dueOn,
}: {
  batchId?: string;
  customerId?: string;
  business?: Business;
  phone: string | null;
  initialMessage: string | null;
  initialMeta: Record<string, unknown> | null;
  status: string;
  dueOn: string;
}) {
  const router = useRouter();
  const initialContext =
    initialMeta && typeof initialMeta.user_context === "string"
      ? initialMeta.user_context
      : "";

  const [message, setMessage] = useState(initialMessage ?? "");
  const [meta, setMeta] = useState<Record<string, unknown>>(initialMeta ?? {});
  const [postSaleContext, setPostSaleContext] = useState(initialContext);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [newDue, setNewDue] = useState(dueOn);
  const [outcome, setOutcome] = useState(
    business === "fitness"
      ? "Cliente respondeu ao pós-venda"
      : "Cliente respondeu bem ao pós-venda",
  );
  const [notes, setNotes] = useState("");

  const wa = useMemo(() => {
    const digits = (phone ?? "").replace(/\D/g, "");
    if (!digits || !message) return null;
    const full = digits.startsWith("55") ? digits : `55${digits}`;
    return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
  }, [phone, message]);

  async function generate() {
    setLoading(true);
    setFeedback(null);

    try {
      const body = {
        business,
        batch_id: business === "supplements" ? batchId : undefined,
        customer_id: business === "fitness" ? customerId : undefined,
        user_context: postSaleContext.trim() || null,
      };

      const { data, error } = await createClient().functions.invoke(
        "post-sale-nexus-suggest",
        { body },
      );

      if (error) throw new Error(await edgeErrorMessage(error));
      if (data?.error) throw new Error(String(data.error));

      setMessage(data?.message ?? "");
      setMeta(data ?? {});
      setFeedback("Mensagem atualizada pelo Nexus.");
    } catch (error) {
      setFeedback(await edgeErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setFeedback("Mensagem copiada.");
  }

  async function reschedule() {
    setLoading(true);
    setFeedback(null);

    try {
      const supabase = createClient();

      if (business === "fitness") {
        if (!customerId) throw new Error("Cliente do pós-venda não identificado.");
        const { error } = await supabase.rpc("reschedule_fitness_post_sale", {
          p_customer_id: customerId,
          p_due_on: newDue,
        });
        if (error) throw error;
      } else {
        if (!batchId) throw new Error("Pós-venda não identificado.");
        const { error } = await supabase.rpc("reschedule_operational_event", {
          p_source_type: "sale_post_sale",
          p_source_id: batchId,
          p_due_at: `${newDue}T12:00:00-03:00`,
        });
        if (error) throw error;
      }

      setFeedback("Pós-venda reagendado.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível reagendar.");
    } finally {
      setLoading(false);
    }
  }

  async function complete() {
    setLoading(true);
    setFeedback(null);

    try {
      const supabase = createClient();

      if (business === "fitness") {
        if (!customerId) throw new Error("Cliente do pós-venda não identificado.");
        const { error } = await supabase.rpc("complete_fitness_post_sale", {
          p_customer_id: customerId,
          p_outcome: outcome.trim() || null,
          p_notes: notes.trim() || null,
        });
        if (error) throw error;
        router.push("/fitness/pos-venda?concluido=1");
      } else {
        if (!batchId) throw new Error("Pós-venda não identificado.");
        const { error } = await supabase.rpc("complete_operational_event", {
          p_source_type: "sale_post_sale",
          p_source_id: batchId,
          p_completed_on: today(),
          p_outcome: outcome.trim() || null,
          p_notes: notes.trim() || null,
          p_payment_method: null,
        });
        if (error) throw error;
        router.push("/pos-venda?concluido=1");
      }

      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível concluir.");
    } finally {
      setLoading(false);
    }
  }

  const contextSummary =
    typeof meta.context_summary === "string" ? meta.context_summary : null;
  const suggestedAction =
    typeof meta.suggested_action === "string" ? meta.suggested_action : null;
  const warnings = Array.isArray(meta.warnings)
    ? meta.warnings.filter((value): value is string => typeof value === "string")
    : [];

  const canManage = business === "fitness" || status === "planned";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>
              <MessageSquareText size={18} /> Nexus IA · mensagem personalizada
            </h2>
            <p>
              O Nexus usa as compras reais e o histórico do cliente. O contexto abaixo é opcional
              e serve para incluir uma promoção, novidade ou assunto específico do dia.
            </p>
          </div>
        </div>

        <div className="panel-body" style={{ display: "grid", gap: 14 }}>
          <label className="field">
            <span>Contexto do Pós-Venda <small>(opcional)</small></span>
            <textarea
              className="textarea"
              rows={3}
              value={postSaleContext}
              onChange={(event) => setPostSaleContext(event.target.value)}
              placeholder={
                business === "fitness"
                  ? "Ex.: Hoje temos promoção de faixa para cabelo. Apresente só se encaixar naturalmente na conversa."
                  : "Ex.: Chegou um novo sabor de whey hoje. Comente apenas se fizer sentido para este cliente."
              }
            />
            <small className="form-help">
              Pode deixar vazio. O Nexus gera o pós-venda normalmente com base nas compras e no histórico.
            </small>
          </label>

          <div className="panel-actions">
            <button
              type="button"
              className="button gold"
              disabled={loading}
              onClick={generate}
            >
              {loading ? <LoaderCircle className="spin" size={16}/> : <RefreshCcw size={16}/>}
              {message ? "Regenerar mensagem" : "Gerar mensagem"}
            </button>
          </div>

          {message ? (
            <>
              <label className="field">
                <span>Mensagem para enviar</span>
                <textarea
                  className="textarea"
                  rows={8}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>

              <div className="panel-actions">
                <button type="button" className="button ghost" onClick={copy}>
                  <Clipboard size={16}/> Copiar
                </button>
                {wa && (
                  <a className="button gold" href={wa} target="_blank" rel="noreferrer">
                    <Send size={16}/> Abrir no WhatsApp
                  </a>
                )}
              </div>

              {(contextSummary || suggestedAction || warnings.length > 0) && (
                <div style={{ display: "grid", gap: 8 }}>
                  {contextSummary && <p><strong>Leitura do Nexus:</strong> {contextSummary}</p>}
                  {suggestedAction && <p><strong>Próxima ação sugerida:</strong> {suggestedAction}</p>}
                  {warnings.length > 0 && <p><strong>Atenção:</strong> {warnings.join(" · ")}</p>}
                </div>
              )}
            </>
          ) : (
            <div className="empty compact">
              <MessageSquareText size={26}/>
              <strong>Mensagem ainda não gerada</strong>
              Adicione um contexto se houver algo especial hoje ou gere diretamente com o histórico real.
            </div>
          )}

          {feedback && <p className="form-help">{feedback}</p>}
        </div>
      </article>

      {canManage && (
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Gerenciar acompanhamento</h2>
              <p>Reagende ou conclua depois de falar com o cliente.</p>
            </div>
          </div>

          <div className="panel-body form-grid-two">
            <label className="field">
              <span>Nova data</span>
              <input
                className="input"
                type="date"
                value={newDue}
                onChange={(event) => setNewDue(event.target.value)}
              />
            </label>

            <div style={{ alignSelf: "end" }}>
              <button
                type="button"
                className="button ghost"
                disabled={loading}
                onClick={reschedule}
              >
                <RefreshCcw size={16}/> Reagendar
              </button>
            </div>

            <label className="field field-span-two">
              <span>Resultado do contato</span>
              <input
                className="input"
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
              />
            </label>

            <label className="field field-span-two">
              <span>Observações</span>
              <textarea
                className="textarea"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Resposta do cliente, interesse futuro, observações relevantes..."
              />
            </label>

            <div className="field-span-two">
              <button
                type="button"
                className="button gold"
                disabled={loading}
                onClick={complete}
              >
                {loading ? <LoaderCircle className="spin" size={16}/> : <Check size={16}/>}
                Concluir pós-venda
              </button>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
