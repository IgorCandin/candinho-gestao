"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  LoaderCircle,
  MessageCircleMore,
  Send,
  UserRoundCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { formatCurrency } from "@/lib/format";
import styles from "./public-catalog-experience.module.css";

type Message = {
  role: "user" | "assistant";
  text: string;
};

type Recommendation = {
  product_id: string;
  slug: string;
  name: string;
  image_url: string | null;
  category: string | null;
  brand: string | null;
  price: number;
  regular_price: number;
  promotion_name: string | null;
  available: boolean;
  reason: string;
};

type NexusResponse = {
  message?: string;
  needs_human?: boolean;
  human_reason?: string | null;
  next_question?: string | null;
  recommendations?: Recommendation[];
  error?: string;
};

function sessionId() {
  if (typeof window === "undefined") return "";

  const key = "candinho:public-catalog-session";
  const current = window.sessionStorage.getItem(key);
  if (current) return current;

  const next =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.sessionStorage.setItem(key, next);
  return next;
}

async function track(
  eventType: string,
  productId?: string | null,
  placement = "catalog",
) {
  try {
    await fetch("/api/catalogo/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: eventType,
        product_id: productId ?? null,
        session_id: sessionId(),
        metadata: { placement },
      }),
      keepalive: true,
    });
  } catch {
    // A telemetria pública não pode interromper a experiência.
  }
}

export function PublicNexusAdvisor({
  productSlug = null,
  productId = null,
  productName = null,
  compact = false,
  initialPrompt = null,
}: {
  productSlug?: string | null;
  productId?: string | null;
  productName?: string | null;
  compact?: boolean;
  initialPrompt?: string | null;
}) {
  const placement = productSlug ? "product_page" : "catalog";

  const greeting = useMemo(
    () =>
      productName
        ? `Posso te ajudar a entender se ${productName} combina com o que você procura ou comparar com outras opções do catálogo.`
        : "Me conta seu objetivo e eu te ajudo a filtrar as opções do catálogo sem jogar um monte de produto aleatório.",
    [productName],
  );

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: greeting },
  ]);
  const [query, setQuery] = useState(initialPrompt ?? "");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [needsHuman, setNeedsHuman] = useState(false);
  const [humanReason, setHumanReason] = useState<string | null>(null);
  const [nextQuestion, setNextQuestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(!compact);
  const [leadOpen, setLeadOpen] = useState(false);

  async function ask(forced?: string) {
    const value = (forced ?? query).trim();
    if (value.length < 2 || loading) return;

    if (!opened) {
      setOpened(true);
      void track("nexus_open", productId, placement);
    }

    const nextUser: Message = { role: "user", text: value };
    const history = [...messages, nextUser].slice(-6);

    setMessages((current) => [...current, nextUser]);
    setQuery("");
    setLoading(true);
    setRecommendations([]);
    setNextQuestion(null);
    setNeedsHuman(false);
    setHumanReason(null);

    try {
      const response = await fetch("/api/catalogo/nexus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: value,
          session_id: sessionId(),
          product_slug: productSlug,
          history,
        }),
      });

      const payload = (await response.json()) as NexusResponse;

      if (!response.ok) {
        throw new Error(payload.error || "O Nexus não conseguiu responder agora.");
      }

      const answer =
        payload.message?.trim() ||
        "Não consegui organizar uma resposta boa com esse contexto.";

      setMessages((current) => [
        ...current,
        { role: "assistant", text: answer },
      ]);
      setRecommendations(
        Array.isArray(payload.recommendations)
          ? payload.recommendations
          : [],
      );
      setNeedsHuman(payload.needs_human === true);
      setHumanReason(payload.human_reason ?? null);
      setNextQuestion(payload.next_question ?? null);

      if (payload.needs_human) {
        setLeadOpen(true);
        void track("human_handoff", productId, placement);
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "O Nexus não conseguiu responder agora.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (compact && !opened) {
    return (
      <button
        className={styles.primaryButton}
        type="button"
        onClick={() => {
          setOpened(true);
          void track("nexus_open", productId, placement);
        }}
      >
        <Bot size={16} />
        Perguntar ao Nexus
      </button>
    );
  }

  return (
    <div className={styles.advisor}>
      <div className={styles.advisorHeader}>
        <Bot size={22} />
        <div>
          <h2>Nexus Guia</h2>
          <p>
            Ajuda a comparar opções reais do catálogo. Casos de saúde,
            medicamentos, gestação ou situações mais complexas vão para
            atendimento humano.
          </p>
        </div>
      </div>

      <div className={styles.advisorBody}>
        <div className={styles.messages}>
          {messages.map((message, index) => (
            <div
              className={`${styles.message} ${
                message.role === "assistant"
                  ? styles.assistant
                  : styles.user
              }`}
              key={`${message.role}-${index}-${message.text.slice(0, 12)}`}
            >
              {message.text}
            </div>
          ))}

          {loading && (
            <div className={`${styles.message} ${styles.assistant}`}>
              <LoaderCircle size={15} />
              Pensando nas opções do catálogo...
            </div>
          )}
        </div>

        {recommendations.length > 0 && (
          <div className={styles.recommendationGrid}>
            {recommendations.map((item) => (
              <Link
                className={styles.recommendation}
                href={`/catalogo/${item.slug}`}
                key={item.product_id}
              >
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={styles.recommendationImage}
                    src={item.image_url}
                    alt={item.name}
                  />
                ) : (
                  <div className={styles.recommendationImage} />
                )}

                <div className={styles.recommendationCopy}>
                  <strong>{item.name}</strong>
                  <span>{formatCurrency(item.price)}</span>
                  <small>{item.reason}</small>
                </div>

                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        )}

        {nextQuestion && !needsHuman && (
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => void ask(nextQuestion)}
          >
            <MessageCircleMore size={15} />
            {nextQuestion}
          </button>
        )}

        <div className={styles.composer}>
          <textarea
            rows={2}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void ask();
              }
            }}
            placeholder={
              productName
                ? `Ex.: comecei academia agora. ${productName} faz sentido pra mim?`
                : "Ex.: quero ganhar massa, comecei academia agora e como pouco..."
            }
          />

          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => void ask()}
            disabled={loading || query.trim().length < 2}
          >
            {loading ? <LoaderCircle size={16} /> : <Send size={16} />}
            Enviar
          </button>
        </div>

        {(needsHuman || leadOpen) && (
          <div className={styles.handoff}>
            <div className={styles.advisorHeader}>
              <UserRoundCheck size={20} />
              <div>
                <h2>Continuar com alguém da Candinho</h2>
                <p>
                  {humanReason ||
                    "Se quiser, você deixa seu contato e a conversa chega para a operação com esse contexto."}
                </p>
              </div>
            </div>

            <PublicCatalogLeadForm
              productId={productId}
              contextSummary={messages
                .slice(-5)
                .map((message) => `${message.role}: ${message.text}`)
                .join("\n")}
              source={productSlug ? "catalog_product_nexus" : "catalog_nexus"}
            />
          </div>
        )}

        {!leadOpen && !needsHuman && (
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => {
              setLeadOpen(true);
              void track("human_handoff", productId, placement);
            }}
          >
            <UserRoundCheck size={15} />
            Prefiro falar com alguém
          </button>
        )}
      </div>
    </div>
  );
}

export function PublicCatalogLeadForm({
  productId = null,
  contextSummary = null,
  source = "catalog",
  onSuccess,
}: {
  productId?: string | null;
  contextSummary?: string | null;
  source?: string;
  onSuccess?: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/catalogo/interesse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          product_id: productId,
          context_summary: contextSummary,
          source,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Não foi possível enviar seu contato.");
      }

      setDone(true);
      onSuccess?.();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível enviar seu contato.",
      );
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className={styles.success}>
        Pronto. Seu interesse chegou para a Candinho com o contexto dessa
        conversa.
      </div>
    );
  }

  return (
    <form className={styles.leadForm} onSubmit={submit}>
      <div className={styles.leadFormFields}>
        <input
          required
          minLength={2}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Seu nome"
        />
        <input
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="WhatsApp / telefone"
          inputMode="tel"
        />
      </div>

      <button className={styles.primaryButton} type="submit" disabled={sending}>
        {sending ? <LoaderCircle size={16} /> : <Send size={16} />}
        {sending ? "Enviando..." : "Quero atendimento"}
      </button>

      {error && <span className={styles.error}>{error}</span>}
    </form>
  );
}
