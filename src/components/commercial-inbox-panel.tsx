/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Inbox,
  LoaderCircle,
  MessageCircleMore,
  Phone,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import type {
  CommercialInboxItem,
  CommercialInboxStatus,
} from "@/lib/commercial-inbox-data";
import styles from "./commercial-inbox-panel.module.css";

type Filter = "active" | CommercialInboxStatus;

const STATUS_META: Record<
  Exclude<CommercialInboxStatus, "converted" | "closed">,
  { label: string; help: string }
> = {
  new: {
    label: "Novo",
    help: "Ainda não houve primeira ação.",
  },
  in_service: {
    label: "Em atendimento",
    help: "O contato já foi aberto.",
  },
  waiting_customer: {
    label: "Aguardando cliente",
    help: "Você já chamou e agora espera retorno.",
  },
  ready_to_close: {
    label: "Pronto para fechar",
    help: "Cliente sinalizou decisão de compra.",
  },
};

function phoneUrl(phone: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}`;
}

function ageLabel(value: string) {
  const then = new Date(value).getTime();
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;

  const days = Math.floor(hours / 24);
  return `há ${days} dia${days === 1 ? "" : "s"}`;
}

function sourceLabel(item: CommercialInboxItem) {
  if (item.inboxKind === "human_handoff") return "Atendimento da vitrine";
  if (item.inboxKind === "purchase_intent") return "Pedido da vitrine";
  return "Interesse da vitrine";
}

function primaryAction(item: CommercialInboxItem) {
  if (item.inboxStatus === "new") {
    return {
      label: "Assumir atendimento",
      status: "in_service" as const,
    };
  }

  if (item.inboxStatus === "in_service") {
    return {
      label: "Já chamei",
      status: "waiting_customer" as const,
    };
  }

  if (item.inboxStatus === "waiting_customer") {
    return {
      label: "Pronto para fechar",
      status: "ready_to_close" as const,
    };
  }

  return null;
}

export function CommercialInboxPanel({
  initialItems,
}: {
  initialItems: CommercialInboxItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>("active");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const counts = useMemo(() => {
    const result = {
      active: items.length,
      new: 0,
      in_service: 0,
      waiting_customer: 0,
      ready_to_close: 0,
    };

    for (const item of items) {
      if (item.inboxStatus in result) {
        result[item.inboxStatus as keyof typeof result] += 1;
      }
    }

    return result;
  }, [items]);

  const visible = useMemo(
    () =>
      items.filter((item) =>
        filter === "active" ? true : item.inboxStatus === filter,
      ),
    [items, filter],
  );

  async function setStatus(
    item: CommercialInboxItem,
    status: CommercialInboxStatus,
  ) {
    if (loadingId) return;

    setLoadingId(item.catalogLeadId);
    setFeedback(null);

    try {
      const { error } = await createClient().rpc(
        "set_commercial_inbox_status_v1",
        {
          p_catalog_lead_id: item.catalogLeadId,
          p_status: status,
        },
      );

      if (error) throw error;

      if (status === "closed" || status === "converted") {
        setItems((current) =>
          current.filter(
            (entry) => entry.catalogLeadId !== item.catalogLeadId,
          ),
        );
      } else {
        setItems((current) =>
          current.map((entry) =>
            entry.catalogLeadId === item.catalogLeadId
              ? { ...entry, inboxStatus: status }
              : entry,
          ),
        );
      }

      setFeedback("Inbox atualizada.");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a Inbox.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function openWhatsapp(item: CommercialInboxItem) {
    const url = phoneUrl(item.phone);
    if (!url) return;

    window.open(url, "_blank", "noopener,noreferrer");

    if (item.inboxStatus === "new") {
      await setStatus(item, "in_service");
    }
  }

  return (
    <article className={`panel ${styles.panel}`}>
      <div className={`panel-head ${styles.head}`}>
        <div>
          <span className={styles.eyebrow}>
            <Inbox size={15} /> Inbox Comercial
          </span>
          <h2>Pedidos e atendimentos que chegaram pela vitrine</h2>
          <p>
            A vitrine já transforma o contato em cliente + lead. Aqui você só
            precisa atender, acompanhar e fechar.
          </p>
        </div>

        <div className={styles.total}>
          <strong>{counts.active}</strong>
          <span>ativos</span>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Etapas da Inbox">
        <button
          type="button"
          data-active={filter === "active"}
          onClick={() => setFilter("active")}
        >
          Todos <b>{counts.active}</b>
        </button>
        <button
          type="button"
          data-active={filter === "new"}
          onClick={() => setFilter("new")}
        >
          Novos <b>{counts.new}</b>
        </button>
        <button
          type="button"
          data-active={filter === "in_service"}
          onClick={() => setFilter("in_service")}
        >
          Atendendo <b>{counts.in_service}</b>
        </button>
        <button
          type="button"
          data-active={filter === "waiting_customer"}
          onClick={() => setFilter("waiting_customer")}
        >
          Aguardando <b>{counts.waiting_customer}</b>
        </button>
        <button
          type="button"
          data-active={filter === "ready_to_close"}
          onClick={() => setFilter("ready_to_close")}
        >
          Fechar <b>{counts.ready_to_close}</b>
        </button>
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <CheckCircle2 size={25} />
          <strong>Nada pendente nesta etapa</strong>
          <span>A Inbox está limpa aqui.</span>
        </div>
      ) : (
        <div className={styles.list}>
          {visible.map((item) => {
            const meta = STATUS_META[
              item.inboxStatus as keyof typeof STATUS_META
            ];
            const action = primaryAction(item);
            const whatsapp = phoneUrl(item.phone);
            const isLoading = loadingId === item.catalogLeadId;

            return (
              <section className={styles.card} key={item.catalogLeadId}>
                <div className={styles.identity}>
                  <div className={styles.thumb}>
                    {item.productImageUrl ? (
                      <img src={item.productImageUrl} alt="" />
                    ) : (
                      <ShoppingBag size={21} />
                    )}
                  </div>

                  <div className={styles.identityCopy}>
                    <div className={styles.cardTopline}>
                      <span data-status={item.inboxStatus}>
                        {meta?.label ?? "Inbox"}
                      </span>
                      <small>
                        <Clock3 size={12} /> {ageLabel(item.createdAt)}
                      </small>
                    </div>

                    <strong>{item.customerName}</strong>
                    <span>
                      {[item.city, sourceLabel(item)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </div>

                <div className={styles.product}>
                  <span>Interesse</span>
                  <strong>{item.productName ?? "Atendimento geral"}</strong>
                  {item.salePrice != null && item.salePrice > 0 && (
                    <small>{formatCurrency(item.salePrice)}</small>
                  )}
                </div>

                {item.contextSummary && (
                  <p className={styles.context}>{item.contextSummary}</p>
                )}

                <div className={styles.actions}>
                  {whatsapp && (
                    <button
                      type="button"
                      className="button ghost compact-button"
                      onClick={() => void openWhatsapp(item)}
                    >
                      <Phone size={14} /> WhatsApp
                    </button>
                  )}

                  {item.salesLeadId && (
                    <Link
                      className="button ghost compact-button"
                      href={`/leads/${item.salesLeadId}`}
                    >
                      <Sparkles size={14} /> Nexus / mensagem
                    </Link>
                  )}

                  {action && (
                    <button
                      type="button"
                      className="button gold compact-button"
                      disabled={isLoading}
                      onClick={() => void setStatus(item, action.status)}
                    >
                      {isLoading ? (
                        <LoaderCircle className="spin" size={14} />
                      ) : (
                        <MessageCircleMore size={14} />
                      )}
                      {action.label}
                    </button>
                  )}

                  {item.inboxStatus === "ready_to_close" && item.salesLeadId && (
                    <Link
                      className="button gold compact-button"
                      href={`/leads/${item.salesLeadId}`}
                    >
                      <ShoppingBag size={14} /> Abrir fechamento
                      <ArrowRight size={13} />
                    </Link>
                  )}

                  <button
                    type="button"
                    className={`${styles.close} compact-button`}
                    disabled={isLoading}
                    onClick={() => void setStatus(item, "closed")}
                    title="Encerrar sem converter"
                  >
                    <X size={14} /> Encerrar
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className={styles.foot}>
        <span>
          <Sparkles size={13} /> O histórico completo continua logo abaixo em
          Leads. A Inbox mostra só o que ainda pede ação.
        </span>
        {feedback && <strong>{feedback}</strong>}
      </div>
    </article>
  );
}
