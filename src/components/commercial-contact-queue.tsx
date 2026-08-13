"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MessageCircle,
  PackageCheck,
  Phone,
  RefreshCcw,
  RotateCcw,
  SkipForward,
  Target,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  CommercialContactQueueItem,
  CommercialContactQueueSnapshot,
} from "@/lib/commercial-contact-types";
import { formatDateOnly } from "@/lib/format";

function whatsappUrl(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

function originLabel(item: CommercialContactQueueItem) {
  return item.source_type === "repurchase" ? "Recompra" : item.lead_status || "Lead";
}

function reasonText(item: CommercialContactQueueItem) {
  if (item.stage === "response_check") {
    return "Você já chamou este contato. Agora vale confirmar se respondeu ou se precisa de uma nova tentativa.";
  }
  if (item.source_type === "repurchase") {
    return item.last_purchase_on
      ? `A última compra foi em ${formatDateOnly(item.last_purchase_on)} e o produto já entrou na janela de reposição.`
      : "O histórico indica janela de recompra e existe estoque disponível agora.";
  }
  if (item.source_notes) return item.source_notes;
  return `Lead classificado como “${item.lead_status ?? "em acompanhamento"}”.`;
}

export function CommercialContactQueue({
  snapshot,
}: {
  snapshot: CommercialContactQueueSnapshot;
}) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const current = snapshot.items[0] ?? null;
  const next = snapshot.items.slice(1, 4);
  const progress = Math.min(
    100,
    Math.round((snapshot.contacted_today / Math.max(snapshot.goal, 1)) * 100),
  );

  async function act(
    item: CommercialContactQueueItem,
    action: "contacted" | "skipped" | "no_response" | "responded",
  ) {
    const key = `${item.queue_key}:${action}`;
    setLoadingAction(key);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("commercial_contact_action_v1", {
        p_source_type: item.source_type,
        p_source_id: item.source_id,
        p_action: action,
        p_notes: null,
      });
      if (error) throw error;

      setMessage(
        action === "contacted"
          ? "Contato marcado como chamado. O próximo já entrou na frente."
          : action === "skipped"
            ? "Pulou. Esse contato saiu da fila de hoje e volta no próximo dia elegível."
            : action === "no_response"
              ? "Sem resposta registrada. Ele volta depois, sem poluir sua Agenda."
              : "Resposta registrada. O Nexus segura este contato antes de trazer de novo.",
      );
      window.location.reload();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : error && typeof error === "object" && "message" in error
            ? String((error as { message?: unknown }).message ?? "")
            : "";

      setMessage(
        errorMessage || "Não foi possível atualizar a fila comercial.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <section className="v4530-commercial-queue">
      <div className="v4530-commercial-summary">
        <article className={snapshot.completed ? "success" : "primary"}>
          <span><Target size={16} /> Meta de hoje</span>
          <strong>{snapshot.contacted_today}/{snapshot.goal}</strong>
          <div className="v4530-commercial-progress"><i style={{ width: `${progress}%` }} /></div>
          <small>
            {snapshot.completed
              ? "Meta concluída — continuar é opcional."
              : `${snapshot.remaining} contato(s) para bater a meta.`}
          </small>
        </article>
        <article>
          <span><UserRound size={16} /> Leads elegíveis</span>
          <strong>{snapshot.lead_eligible}</strong>
          <small>Mais próximos da compra entram antes.</small>
        </article>
        <article>
          <span><RotateCcw size={16} /> Recompras elegíveis</span>
          <strong>{snapshot.repurchase_eligible}</strong>
          <small>Só entram produtos com estoque disponível.</small>
        </article>
        <article>
          <span><PackageCheck size={16} /> Fila disponível</span>
          <strong>{snapshot.total_eligible}</strong>
          <small>Você pode continuar mesmo depois de 12.</small>
        </article>
      </div>

      {current ? (
        <article className="v4530-contact-card">
          <header>
            <div>
              <span className={`v4530-contact-kind ${current.source_type}`}>
                {originLabel(current)}
              </span>
              {current.stage === "response_check" && (
                <span className="v4530-contact-kind response"><Clock3 size={12} /> Checar resposta</span>
              )}
            </div>
            <span className="v4530-contact-stock">Estoque: {current.stock_quantity}</span>
          </header>

          <div className="v4530-contact-main">
            <div>
              <small>Próxima ação</small>
              <h2>{current.customer_name}</h2>
              <p>{current.product_name}</p>
            </div>
            <div className="v4530-contact-location">
              {current.city && <span>{current.city}</span>}
              {current.reference && <small>{current.reference}</small>}
            </div>
          </div>

          <div className="v4530-contact-reason">
            <strong>Por que o Nexus colocou agora?</strong>
            <p>{reasonText(current)}</p>
            {current.source_type === "repurchase" && current.estimated_due_on && (
              <small>Reposição estimada originalmente: {formatDateOnly(current.estimated_due_on)}</small>
            )}
          </div>

          <div className="v4530-contact-actions">
            {whatsappUrl(current.phone) ? (
              <a className="button gold" href={whatsappUrl(current.phone)!} target="_blank" rel="noreferrer">
                <MessageCircle size={16} /> WhatsApp
              </a>
            ) : (
              <span className="button ghost disabled"><Phone size={16} /> Sem telefone</span>
            )}

            {current.stage === "response_check" ? (
              <>
                <button
                  className="button ghost"
                  type="button"
                  disabled={Boolean(loadingAction)}
                  onClick={() => void act(current, "responded")}
                >
                  {loadingAction === `${current.queue_key}:responded` ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}
                  Respondeu
                </button>
                <button
                  className="button ghost"
                  type="button"
                  disabled={Boolean(loadingAction)}
                  onClick={() => void act(current, "no_response")}
                >
                  {loadingAction === `${current.queue_key}:no_response` ? <LoaderCircle className="spin" size={16} /> : <Clock3 size={16} />}
                  Não respondeu
                </button>
                <button
                  className="button ghost"
                  type="button"
                  disabled={Boolean(loadingAction)}
                  onClick={() => void act(current, "contacted")}
                >
                  {loadingAction === `${current.queue_key}:contacted` ? <LoaderCircle className="spin" size={16} /> : <RefreshCcw size={16} />}
                  Chamei de novo
                </button>
              </>
            ) : (
              <>
                <button
                  className="button ghost"
                  type="button"
                  disabled={Boolean(loadingAction)}
                  onClick={() => void act(current, "contacted")}
                >
                  {loadingAction === `${current.queue_key}:contacted` ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}
                  Chamei
                </button>
                <button
                  className="button ghost"
                  type="button"
                  disabled={Boolean(loadingAction)}
                  onClick={() => void act(current, "skipped")}
                >
                  {loadingAction === `${current.queue_key}:skipped` ? <LoaderCircle className="spin" size={16} /> : <SkipForward size={16} />}
                  Pular
                </button>
              </>
            )}

            <Link className="button ghost" href={current.href}>
              <ExternalLink size={15} /> Abrir histórico
            </Link>
          </div>
        </article>
      ) : (
        <article className="panel v4530-commercial-empty">
          <CheckCircle2 size={28} />
          <div>
            <h2>Nenhum contato elegível agora.</h2>
            <p>Leads dependentes de estoque continuam como obrigação na Agenda; recompras sem estoque ficam fora desta fila até existir produto para vender.</p>
          </div>
        </article>
      )}

      {next.length > 0 && (
        <article className="panel v4530-commercial-next">
          <header>
            <div>
              <span className="eyebrow">Depois deste</span>
              <h2>Próximos da fila</h2>
            </div>
            <small>Prévia curta — nada de 12 cards espalhados.</small>
          </header>
          <div>
            {next.map((item, index) => (
              <div key={item.queue_key}>
                <span>{index + 2}</span>
                <p><strong>{item.customer_name}</strong><small>{item.product_name}</small></p>
                <em>{originLabel(item)}</em>
                <ArrowRight size={14} />
              </div>
            ))}
          </div>
        </article>
      )}

      {message && <p className="form-message standalone-message">{message}</p>}
    </section>
  );
}
